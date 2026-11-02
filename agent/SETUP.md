# Switching on the voice assistant

The "Talk to my AI" button already works without this: it runs a text assistant that answers from the CV and sends leads to `~/tahoun-private/leads.jsonl`. These steps switch on **voice + a real AI model**, **Telegram alerts** and **booking**. About 20 minutes.

## 1. Telegram alerts (5 min)
1. In Telegram, message **@BotFather** → `/newbot` → name it e.g. *Ahmed Leads* → copy the **token**.
2. Send your new bot any message ("hi").
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy the number after `"chat":{"id":`. That's your **chat id**.

## 2. The ElevenLabs agent (10 min)
In ElevenLabs → **Agents** → **Create agent** → *Blank*:

| Setting | Value |
|---|---|
| Name | Ahmed's AI assistant |
| First message (English) | `Hi! I'm Ahmed's AI assistant. Ask me anything about his work, or I can set up a call with him. What brings you here?` |
| Language | English, and add **Arabic** under additional languages |
| System prompt | paste all of `agent/system-prompt.md` |
| LLM | Claude Sonnet (best at tools), or Gemini Flash to save cost |
| Voice | a warm voice that supports Arabic; model **Flash v2.5** (multilingual, fast) |
| Knowledge base | add the URL `https://tahoun.wheretospot.com/llms.txt` |

**Tools** tab → add the three **Client** tools from `agent/client-tools.json` (names must match exactly: `update_lead`, `show_booking`, `show_project`; tick **Wait for response** on each). Turn on the **End call** system tool.

**Security** tab:
- Turn on **Enable authentication** (the site gets short-lived tokens from `api/agent-token.php`, so the agent can't be used elsewhere).
- Allowlist: `tahoun.wheretospot.com`
- Overrides: turn on **First message** and **Language**. Turn on **Text-only** too.
- Max conversation duration: **300 seconds**. Concurrency limit: **2**. Daily call limit: what fits your budget.

**Advanced** tab → client events: make sure **agent_response**, **user_transcript** and **client_tool_call** are on.

Copy the agent ID (starts with `agent_`).

**API key:** ElevenLabs → Developers → API keys → Create, restricted to **ElevenAgents** only.

Set a monthly spending limit in ElevenLabs billing so it can never surprise you.

## 3. Booking (optional, 3 min)
Create a free **Cal.com** account, connect Google Calendar, make a 20-minute event (e.g. *Intro call*). Its link looks like `cal.com/ahmed-tahoun/intro`. Tell Claude the part after `cal.com/` (`ahmed-tahoun/intro`) to put in `content.js` → `agentConfig.calLink`. Until then the assistant says you'll email a time.

## 4. Put the keys on the server (2 min)
cPanel → **File Manager** → your home folder → open `tahoun-private` (the deploy creates it) → **+ File** → `config.php` → paste the contents of `api/config.example.php` and fill in the four values. Save.

That folder is outside the website, so nobody can download it.

## 5. Test
Open the site → **Talk to my AI** → *Talk*. You should hear the agent, see your notes fill in, and get a Telegram message when you press **End**.
