# Ahmed Tahoun · portfolio

Live at **https://tahoun.wheretospot.com**

A bilingual (English / Arabic, RTL) portfolio for a full-stack & AI product engineer. Static site, no build step: `index.html`, `styles.css`, `content.js` (all copy and data in both languages) and `app.js`.

What's interactive:
- **Ask my AI**: answers questions about Ahmed from `content.js`, in the visitor's browser, with no API calls.
- **AI sales-bot demo**: replays the production flow of the Where to Spot WhatsApp assistant (redaction, shop facts, Claude, JSON check, reply or human handover, cost cap).
- **Kipo demo**: a Telegram-style chat with an on-device expense parser that fills a mock Google Sheet.
- **Talk to my AI**: a voice / text assistant (ElevenLabs agent) that answers questions, takes notes for Ahmed and books a call. Falls back to an on-device text assistant until it's configured. Setup: [agent/SETUP.md](agent/SETUP.md).
- **⌘K command palette**, light / dark theme, and `?lang=ar` / `?theme=dark` URL options.

## Run locally
```bash
php -S 127.0.0.1:4321
```

## Deploy (cPanel)
cPanel -> Git(TM) Version Control clones this repository; `.cpanel.yml` copies the site into `~/tahoun.wheretospot.com/`.
After every push: **Manage -> Pull or Deploy -> Update from Remote**, then **Deploy HEAD Commit**.

## Credits
Tool icons in the stack section come from [Simple Icons](https://simpleicons.org) (CC0). The names and logos belong to their owners.

## License
All rights reserved. The code is public to read, not to reuse: see [LICENSE](LICENSE).
