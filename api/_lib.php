<?php
// Shared helpers for the AI-agent endpoints. Secrets live outside the web root:
//   ~/tahoun-private/config.php   (copy api/config.example.php there and fill it in)
// Leads, rate-limit counters and logs are written to ~/tahoun-private/ as well.

declare(strict_types=1);

const PRIVATE_DIR_NAME = 'tahoun-private';

function private_dir(): string {
    $dir = getenv('TAHOUN_PRIVATE_DIR') ?: dirname(__DIR__, 2) . '/' . PRIVATE_DIR_NAME;
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir;
}

function config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $file = private_dir() . '/config.php';
    $cfg = is_file($file) ? (array) require $file : [];
    $cfg += [
        'elevenlabs_api_key' => '',
        'elevenlabs_agent_id' => '',
        'telegram_bot_token' => '',
        'telegram_chat_id' => '',
        'allowed_origins' => ['https://tahoun.wheretospot.com'],
        'sessions_per_ip_per_day' => 6,
        'sessions_per_day' => 60,
        'leads_per_ip_per_day' => 10,
    ];
    return $cfg;
}

function json_out(int $status, array $body): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Only answer requests made by the site itself (browsers always send Origin on fetch POSTs
// and Sec-Fetch-Site on same-origin GETs). Local development hosts are allowed too.
function require_same_site(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    $allowed = config()['allowed_origins'];
    $isLocal = fn(string $u) => (bool) preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?(/|$)#', $u);
    $ok = false;
    foreach ([$origin, $referer] as $u) {
        if ($u === '') continue;
        if ($isLocal($u)) { $ok = true; break; }
        foreach ($allowed as $a) if (str_starts_with($u, rtrim($a, '/'))) { $ok = true; break 2; }
    }
    if (!$ok && $origin === '' && $referer === '' && $site === 'same-origin') $ok = true;
    if (!$ok) json_out(403, ['error' => 'forbidden']);
}

function client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

// Counts events per key per UTC day in a small JSON file. Returns false once the limit is reached.
function rate_ok(string $bucket, string $key, int $limit): bool {
    $file = private_dir() . "/rate-$bucket.json";
    $fh = fopen($file, 'c+');
    if (!$fh) return true;
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $data = $raw ? (json_decode($raw, true) ?: []) : [];
    $day = gmdate('Y-m-d');
    if (($data['day'] ?? '') !== $day) $data = ['day' => $day, 'counts' => []];
    $hash = substr(hash('sha256', $key . $day), 0, 16); // no raw IPs on disk
    $n = $data['counts'][$hash] ?? 0;
    $allowed = $n < $limit;
    if ($allowed) {
        $data['counts'][$hash] = $n + 1;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($data));
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $allowed;
}

function http_get_json(string $url, array $headers): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, is_string($body) ? (json_decode($body, true) ?: []) : []];
}

function telegram_send(string $text): bool {
    $cfg = config();
    if ($cfg['telegram_bot_token'] === '' || $cfg['telegram_chat_id'] === '') return false;
    $ch = curl_init('https://api.telegram.org/bot' . $cfg['telegram_bot_token'] . '/sendMessage');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'chat_id' => $cfg['telegram_chat_id'],
            'text' => mb_substr($text, 0, 4000),
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => 'true',
        ]),
    ]);
    curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code === 200;
}
