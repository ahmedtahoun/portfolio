<?php
// POST /api/lead.php  (JSON body)
// Saves a lead from the AI assistant to ~/tahoun-private/leads.jsonl and pings Ahmed on Telegram.

declare(strict_types=1);
require __DIR__ . '/_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(405, ['error' => 'method']);
require_same_site();

$raw = file_get_contents('php://input', false, null, 0, 40000);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) json_out(400, ['error' => 'bad_json']);
if (!empty($in['website'])) json_out(200, ['ok' => true]); // honeypot field: bots fill it, people never see it

if (!rate_ok('lead-ip', client_ip(), (int) config()['leads_per_ip_per_day'])) json_out(429, ['error' => 'limit']);

$clean = function ($v, int $max = 300, bool $multiline = false): string {
    $v = is_scalar($v) ? (string) $v : '';
    $v = preg_replace($multiline ? '/[\x00-\x09\x0B-\x1F\x7F]+/u' : '/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '';
    return trim(mb_substr($v, 0, $max));
};
$lead = [
    'at' => gmdate('c'),
    'name' => $clean($in['name'] ?? '', 120),
    'email' => $clean($in['email'] ?? '', 160),
    'phone' => $clean($in['phone'] ?? '', 40),
    'company' => $clean($in['company'] ?? '', 160),
    'role' => $clean($in['role'] ?? '', 160),
    'visitor_type' => $clean($in['visitor_type'] ?? '', 40),
    'interest' => $clean($in['interest'] ?? '', 500),
    'timeline' => $clean($in['timeline'] ?? '', 120),
    'budget' => $clean($in['budget'] ?? '', 120),
    'location' => $clean($in['location'] ?? '', 120),
    'notes' => $clean($in['notes'] ?? '', 1500, true),
    'meeting' => $clean($in['meeting'] ?? '', 200),
    'lang' => $clean($in['lang'] ?? '', 5),
    'mode' => $clean($in['mode'] ?? '', 20),
    'conversation_id' => $clean($in['conversation_id'] ?? '', 80),
    'transcript' => $clean($in['transcript'] ?? '', 6000, true),
];
if ($lead['email'] !== '' && !filter_var($lead['email'], FILTER_VALIDATE_EMAIL)) $lead['email'] = '';
if ($lead['name'] === '' && $lead['email'] === '' && $lead['phone'] === '' && $lead['transcript'] === '') {
    json_out(422, ['error' => 'empty']);
}

file_put_contents(private_dir() . '/leads.jsonl', json_encode($lead, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

$h = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$type = ['recruiter' => '🧑‍💼 Recruiter / hiring', 'client' => '🛠️ Client project', 'other' => '👋 Visitor'][$lead['visitor_type']] ?? '👋 Visitor';
$lines = ["<b>🔔 New lead from your AI assistant</b>", $type];
foreach (['name' => 'Name', 'email' => 'Email', 'phone' => 'Phone', 'company' => 'Company', 'role' => 'Role', 'interest' => 'Wants', 'timeline' => 'Timeline', 'budget' => 'Budget', 'location' => 'Location', 'meeting' => '📅 Meeting', 'notes' => 'Notes'] as $k => $label) {
    if ($lead[$k] !== '') $lines[] = "<b>$label:</b> " . $h($lead[$k]);
}
$lines[] = '<i>' . $h(strtoupper($lead['lang'] ?: 'en') . ' · ' . ($lead['mode'] ?: 'chat')) . '</i>';
if ($lead['conversation_id'] !== '') {
    $lines[] = '<a href="https://elevenlabs.io/app/agents/history/' . rawurlencode($lead['conversation_id']) . '">Open the full conversation</a>';
}
if ($lead['transcript'] !== '') $lines[] = "\n<b>Transcript</b>\n" . $h(mb_substr($lead['transcript'], 0, 2200));

$sent = telegram_send(implode("\n", $lines));
json_out(200, ['ok' => true, 'notified' => $sent]);
