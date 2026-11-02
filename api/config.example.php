<?php
// Copy this file to ~/tahoun-private/config.php on the server (OUTSIDE the website folder) and fill it in.
// cPanel: File Manager -> home folder -> create folder "tahoun-private" -> upload/create config.php there.
// Never commit the real file.

return [
    // ElevenLabs -> Developers -> API keys. Give the key access to "ElevenAgents" only.
    'elevenlabs_api_key' => '',
    // ElevenLabs -> Agents -> your agent -> the ID that starts with "agent_".
    'elevenlabs_agent_id' => '',

    // Telegram: create a bot with @BotFather, send it any message, then open
    // https://api.telegram.org/bot<TOKEN>/getUpdates and copy "chat":{"id": ... }.
    'telegram_bot_token' => '',
    'telegram_chat_id' => '',

    // Safety limits (sessions = conversations started with the agent).
    'sessions_per_ip_per_day' => 6,
    'sessions_per_day' => 60,
    'leads_per_ip_per_day' => 10,

    'allowed_origins' => ['https://tahoun.wheretospot.com'],
];
