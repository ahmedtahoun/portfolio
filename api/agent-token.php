<?php
// GET /api/agent-token.php?mode=voice|text
// Returns a short-lived credential for the ElevenLabs agent, so the API key never reaches the browser.
// voice -> {"conversationToken": "..."} (WebRTC)    text -> {"signedUrl": "..."} (WebSocket)
// {"error":"not_configured"} tells the site to use its built-in offline assistant instead.

declare(strict_types=1);
require __DIR__ . '/_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(405, ['error' => 'method']);
require_same_site();

$cfg = config();
if ($cfg['elevenlabs_api_key'] === '' || $cfg['elevenlabs_agent_id'] === '') {
    json_out(200, ['error' => 'not_configured']); // a normal state until the keys are added, not a failure
}
if (!rate_ok('session-ip', client_ip(), (int) $cfg['sessions_per_ip_per_day'])) {
    json_out(429, ['error' => 'limit_visitor']);
}
if (!rate_ok('session-all', 'all', (int) $cfg['sessions_per_day'])) {
    json_out(429, ['error' => 'limit_daily']);
}

$mode = ($_GET['mode'] ?? 'voice') === 'text' ? 'text' : 'voice';
$agent = rawurlencode($cfg['elevenlabs_agent_id']);
$headers = ['xi-api-key: ' . $cfg['elevenlabs_api_key']];

if ($mode === 'voice') {
    [$code, $body] = http_get_json("https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=$agent", $headers);
    if ($code === 200 && !empty($body['token'])) json_out(200, ['conversationToken' => $body['token']]);
} else {
    [$code, $body] = http_get_json("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=$agent", $headers);
    if ($code === 200 && !empty($body['signed_url'])) json_out(200, ['signedUrl' => $body['signed_url']]);
}
json_out(502, ['error' => 'upstream', 'status' => $code]);
