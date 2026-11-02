# Ahmed Tahoun · portfolio

Live at **https://tahoun.wheretospot.com**

A bilingual (English / Arabic, RTL) portfolio for a full-stack & AI product engineer. Static site, no build step: `index.html`, `styles.css`, `content.js` (all copy and data in both languages) and `app.js`.

What's interactive:
- **Ask my AI**: answers questions about Ahmed from `content.js`, in the visitor's browser, with no API calls.
- **AI sales-bot demo**: replays the production flow of the Where to Spot WhatsApp assistant (redaction, shop facts, Claude, JSON check, reply or human handover, cost cap).
- **Kipo demo**: a Telegram-style chat with an on-device expense parser that fills a mock Google Sheet.
- **⌘K command palette**, light / dark theme, and `?lang=ar` / `?theme=dark` URL options.

## Run locally
```bash
python3 -m http.server 4321
```

## Deploy (cPanel)
cPanel -> Git(TM) Version Control clones this repository; `.cpanel.yml` copies the site into `~/tahoun.wheretospot.com/`.
After every push: **Manage -> Pull or Deploy -> Update from Remote**, then **Deploy HEAD Commit**.
