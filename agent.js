// "Talk to my AI": a voice / text assistant that answers questions about Ahmed, takes notes and books a call.
// Live mode uses an ElevenLabs agent (token from api/agent-token.php). If that isn't available, or the visitor
// has no microphone, an offline assistant answers from the CV data in content.js and collects the same notes.
(() => {
  const S = window.SITE, CFG = S.agentConfig;
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const isAr = s => /[؀-ۿ]/.test(s);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i;
  const FIELDS = ["name", "email", "phone", "company", "role", "interest", "timeline", "budget", "location", "meeting", "notes"];

  const st = { lang: "en", intent: "exploring", mode: "voice", phase: "closed", conv: null, live: false, lead: {},
    log: [], convId: "", started: 0, timer: 0, raf: 0, muted: false, submitted: false, pending: null, booked: "" };
  const L = () => S.agent[st.lang];

  /* ---------- shell ---------- */
  const root = document.createElement("div");
  root.className = "ag"; root.hidden = true;
  root.innerHTML = `<div class="ag-box" role="dialog" aria-modal="true" aria-labelledby="agTitle">
    <button class="ag-x" type="button" data-a="close" aria-label="Close">✕</button>
    <div class="ag-body"></div></div>`;
  document.body.appendChild(root);
  const body = $(".ag-body", root);
  root.addEventListener("click", e => {
    if (e.target === root) return askClose();
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "close") askClose();
  });
  addEventListener("keydown", e => { if (!root.hidden && e.key === "Escape") askClose(); });

  function siteLang() { return document.documentElement.lang === "ar" ? "ar" : "en"; }
  function open(opts = {}) {
    st.lang = opts.lang || siteLang();
    if (opts.intent) st.intent = opts.intent;
    root.hidden = false; document.body.classList.add("ag-open");
    if (st.phase === "closed" || st.phase === "done") intro();
  }
  function askClose() {
    if (st.phase === "live" && st.log.length > 1 && !confirm(L().leaveQ)) return;
    if (st.phase === "live") finish(); else close();
  }
  function close() { root.hidden = true; document.body.classList.remove("ag-open"); if (st.phase !== "live") st.phase = "closed"; }

  /* ---------- 1. intro ---------- */
  function intro() {
    st.phase = "intro"; st.lead = {}; st.log = []; st.convId = ""; st.submitted = false; st.booked = "";
    const t = L();
    root.dir = st.lang === "ar" ? "rtl" : "ltr";
    body.innerHTML = `<div class="ag-intro">
      <div class="orb idle" aria-hidden="true"><i></i><i></i><i></i><span><img src="assets/kipo.png" alt=""></span></div>
      <div class="ag-lang" role="group" aria-label="${esc(t.lang)}">
        <button type="button" data-l="en" class="${st.lang === "en" ? "on" : ""}">English</button>
        <button type="button" data-l="ar" class="${st.lang === "ar" ? "on" : ""}">العربية</button></div>
      <h2 id="agTitle">${esc(t.title)}</h2>
      <p class="ag-sub">${esc(t.sub)}</p>
      <p class="ag-who">${esc(t.who)}</p>
      <div class="ag-intents">${t.intents.map(([id, ic, h, s]) => `<button type="button" data-i="${id}" class="${st.intent === id ? "on" : ""}"><span>${ic}</span><b>${esc(h)}</b><small>${esc(s)}</small></button>`).join("")}</div>
      <div class="ag-go">
        <button type="button" class="cta ag-talk" data-go="voice"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>${esc(t.talk)}</button>
        <button type="button" class="cta ghost" data-go="text">${esc(t.type)}</button>
      </div>
      <p class="ag-consent">🔒 ${esc(t.consent)} <a href="privacy.html" target="_blank" rel="noopener">${esc(t.privacy)}</a></p>
    </div>`;
    $$("[data-l]", body).forEach(b => b.onclick = () => { st.lang = b.dataset.l; intro(); });
    $$("[data-i]", body).forEach(b => b.onclick = () => { st.intent = b.dataset.i; $$("[data-i]", body).forEach(x => x.classList.toggle("on", x === b)); });
    $$("[data-go]", body).forEach(b => b.onclick = () => start(b.dataset.go));
    setTimeout(() => $(".ag-talk", body)?.focus(), 50);
  }

  /* ---------- 2. live ---------- */
  function liveShell() {
    const t = L();
    body.innerHTML = `<div class="ag-live">
      <div class="ag-main">
        <div class="ag-top">
          <div class="orb sm" aria-hidden="true"><i></i><i></i><i></i><span><img src="assets/kipo.png" alt=""></span></div>
          <div class="ag-state"><b id="agStatus">${esc(t.connecting)}</b><small id="agTimer">0:00</small></div>
          <div class="ag-ctrl">
            <button type="button" class="ag-btn" id="agMute" hidden>${esc(t.mute)}</button>
            <button type="button" class="ag-btn end" id="agEnd">${esc(t.end)}</button>
          </div>
        </div>
        <div class="ag-log" id="agLog" aria-live="polite"></div>
        <form class="ag-input" id="agForm" autocomplete="off">
          <input id="agText" type="text" maxlength="400" placeholder="${esc(t.ph)}" aria-label="${esc(t.ph)}">
          <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button type="submit" aria-label="${esc(t.send)}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg></button>
        </form>
      </div>
      <aside class="ag-side">
        <h3>📝 ${esc(t.notes)}</h3>
        <div id="agNotes"><p class="ag-empty">${esc(t.notesEmpty)}</p></div>
        <div id="agBook"></div>
      </aside>
    </div>`;
    $("#agEnd").onclick = () => finish();
    $("#agMute").onclick = () => {
      st.muted = !st.muted; st.conv?.setMicMuted?.(st.muted);
      $("#agMute").textContent = st.muted ? L().unmute : L().mute; $("#agMute").classList.toggle("on", st.muted);
    };
    $("#agForm").onsubmit = e => { e.preventDefault(); const v = $("#agText").value.trim(); if (!v) return; $("#agText").value = ""; userSays(v); };
    $("#agText").oninput = () => st.conv?.sendUserActivity?.();
  }
  function setStatus(key) {
    const el = $("#agStatus"); if (el) el.textContent = L()[key] || key;
    const orb = $(".ag-live .orb"); if (orb) orb.dataset.s = key;
  }
  function say(role, text, extra = "") {
    const log = $("#agLog"); if (!log || !text) return;
    const last = log.lastElementChild;
    if (role === "user" && last?.classList.contains("user") && last.dataset.tentative) last.remove();
    const d = document.createElement("div");
    d.className = "ag-msg " + role; d.dir = isAr(text) ? "rtl" : "ltr";
    d.innerHTML = esc(text) + extra;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    st.log.push((role === "ai" ? "AI: " : "Visitor: ") + text);
  }
  function card(html) {
    const log = $("#agLog"); if (!log) return;
    const d = document.createElement("div"); d.className = "ag-card"; d.innerHTML = html;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  function tick() {
    const s = Math.floor((Date.now() - st.started) / 1000), max = CFG.maxSeconds;
    const el = $("#agTimer"); if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} / ${max / 60}:00`;
    if (st.live && s === max - 30) st.conv?.sendContextualUpdate?.("Only 30 seconds left in this conversation. Wrap up politely: confirm the visitor's email if you have it and say goodbye.");
    if (s >= max) { setStatus("timeUp"); finish(); }
  }

  /* ---------- notes (update_lead) ---------- */
  function note(fields) {
    let changed = false;
    for (const k of FIELDS.concat(["visitor_type"])) {
      const v = fields?.[k];
      if (v != null && String(v).trim() && st.lead[k] !== String(v).trim()) { st.lead[k] = String(v).trim().slice(0, 400); changed = true; }
    }
    if (changed) renderNotes();
    return changed;
  }
  function renderNotes(flash = true) {
    const box = $("#agNotes"); if (!box) return;
    const t = L(), rows = FIELDS.filter(k => st.lead[k]);
    box.innerHTML = rows.length
      ? `<dl>${rows.map(k => `<div class="${flash ? "new" : ""}"><dt>${esc(t.f[k])}</dt><dd dir="auto">${esc(st.lead[k])}</dd></div>`).join("")}</dl>`
      : `<p class="ag-empty">${esc(t.notesEmpty)}</p>`;
  }

  /* ---------- booking (show_booking) ---------- */
  let calReady = false;
  function loadCal() {
    if (calReady) return;
    (function (C, A, Ln) { const p = (a, ar) => a.q.push(ar); const d = C.document;
      C.Cal = C.Cal || function () { const cal = C.Cal, ar = arguments;
        if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; }
        if (ar[0] === Ln) { const api = function () { p(api, arguments); }; const ns = ar[1]; api.q = api.q || [];
          if (typeof ns === "string") { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ["initNamespace", ns]); } else p(cal, ar); return; }
        p(cal, ar); };
    })(window, "https://app.cal.com/embed/embed.js", "init");
    Cal("init", { origin: "https://cal.com" });
    Cal("on", { action: "bookingSuccessful", callback: e => {
      const when = e?.detail?.data?.date || e?.detail?.data?.startTime || "";
      st.booked = when ? new Date(when).toLocaleString(st.lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) : L().booked;
      note({ meeting: st.booked });
      st.conv?.sendContextualUpdate?.(`The visitor just booked a call with Ahmed for ${st.booked}. Confirm it warmly in one sentence.`);
      if (!st.live) say("ai", `📅 ${L().booked}: ${st.booked}`);
    } });
    calReady = true;
  }
  function showBooking() {
    const box = $("#agBook"); if (!box) return "Booking panel not available.";
    const t = L();
    if (!CFG.calLink) {
      box.innerHTML = `<div class="ag-booknone">📅 ${esc(t.bookNone)}</div>`;
      if (!st.lead.meeting) note({ meeting: st.lang === "ar" ? "طلب مكالمة" : "Requested a call" });
      return "There is no live calendar yet. Tell the visitor Ahmed will email them to agree on a time, and make sure you have their email.";
    }
    box.innerHTML = `<h4>📅 ${esc(t.book)}</h4><div id="agCal" class="ag-cal"></div>`;
    loadCal();
    Cal("inline", { elementOrSelector: "#agCal", calLink: CFG.calLink, layout: "column_view",
      config: { name: st.lead.name || "", email: st.lead.email || "", notes: [st.lead.company, st.lead.interest].filter(Boolean).join(" · "),
        theme: document.documentElement.dataset.theme === "light" ? "light" : "dark" } });
    box.scrollIntoView?.({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    return "The calendar is now open next to the chat. Let the visitor pick a time; you'll be told when they book.";
  }

  /* ---------- project cards (show_project) ---------- */
  const PROJECTS = { kipo: "Kipo", wheretospot: "Where to Spot", onething: "The One Thing", rafiq: "Rafiq Pro", medilink: "Medilink360", grevo: "Grevo", kitchentrace: "KitchenTrace", wafa: "Wafa" };
  function showProject(p) {
    const key = String(p?.project || p || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = PROJECTS[key] || Object.values(PROJECTS).find(n => n.toLowerCase().replace(/[^a-z0-9]/g, "").includes(key));
    const w = name && S.work.find(x => x.name.startsWith(name));
    if (!w) return "Unknown project. Available: " + Object.keys(PROJECTS).join(", ");
    const c = w[st.lang] || w.en;
    const img = w.media?.type === "shot" ? (typeof w.media.img === "string" ? w.media.img : w.media.img[st.lang] || w.media.img.en) : w.logo;
    card(`<div class="ag-proj">${img ? `<img src="${img}" alt="" class="${w.media?.type === "shot" ? "shot" : "logo"}">` : ""}<div><b>${esc(w.name)}</b><small>${esc(w.when)}</small><p>${esc(c.tldr)}</p>${w.link ? `<a href="${w.link}" target="_blank" rel="noopener">${esc(S.ui[st.lang][w.linkKind || "code"])}</a>` : ""}</div></div>`);
    return `Showing the ${w.name} card. Summary: ${S.work.find(x => x === w).en.tldr}`;
  }

  /* ---------- start ---------- */
  async function start(mode) {
    st.mode = mode; st.phase = "live"; st.started = Date.now(); st.muted = false;
    liveShell(); clearInterval(st.timer); st.timer = setInterval(tick, 1000);
    let cred = null, why = "";
    try {
      const r = await fetch(`api/agent-token.php?mode=${mode}`, { headers: { Accept: "application/json" } });
      const j = await r.json().catch(() => ({}));
      if (r.ok && (j.conversationToken || j.signedUrl)) cred = j; else why = j.error || "";
    } catch { why = "network"; }
    if (!cred) return offline(why === "limit_visitor" || why === "limit_daily" ? "limit" : why === "not_configured" ? "offline" : "busy");
    if (mode === "voice") {
      try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); }
      catch { return start("text").then(() => say("ai", L().micDenied)); }
    }
    try {
      const { Conversation } = await import(CFG.sdk);
      const first = L().o.hello[st.intent];
      st.conv = await Conversation.startSession({
        ...(cred.conversationToken ? { conversationToken: cred.conversationToken } : { signedUrl: cred.signedUrl }),
        ...(mode === "text" ? { textOnly: true } : {}),
        overrides: { agent: { language: st.lang, firstMessage: first } },
        dynamicVariables: { visitor_intent: st.intent, page_lang: st.lang, visitor_local_time: new Date().toString().slice(0, 24) },
        clientTools: {
          update_lead: p => { note(p); return "Noted."; },
          show_booking: () => showBooking(),
          show_project: p => showProject(p),
        },
        onConnect: ({ conversationId }) => { st.convId = conversationId; st.live = true; setStatus(mode === "voice" ? "listening" : "offline"); if (mode === "voice") { $("#agMute").hidden = false; orbLoop(); } },
        onMessage: ({ message, source }) => say(source === "ai" ? "ai" : "user", message),
        onModeChange: ({ mode: m }) => setStatus(m === "speaking" ? "speaking" : "listening"),
        onError: () => {},
        onDisconnect: () => { if (st.phase === "live") finish(); },
      });
    } catch (e) {
      st.conv = null; st.live = false;
      offline("busy");
    }
  }
  function orbLoop() {
    const orb = $(".ag-live .orb"); if (!orb || !st.conv) return;
    const step = async () => {
      if (!st.conv || st.phase !== "live") return;
      try {
        const out = await st.conv.getOutputVolume(), inp = await st.conv.getInputVolume();
        const v = Math.min(1, Math.max(out, inp * 0.8));
        orb.style.setProperty("--v", v.toFixed(3));
        orb.classList.toggle("you", inp > out);
      } catch { /* conversation ended */ }
      st.raf = requestAnimationFrame(step);
    };
    if (!reduced) st.raf = requestAnimationFrame(step);
  }

  /* ---------- offline assistant ---------- */
  function offline(reason) {
    st.live = false; st.conv = null;
    setStatus("offline");
    const t = L();
    const note0 = reason === "limit" ? t.limit : reason === "offline" ? t.offlineNote : t.busy;
    card(`<p class="ag-note">ℹ️ ${esc(note0)}</p>`);
    st.pending = st.intent === "exploring" ? "chat" : "interest"; st.turns = 0;
    setTimeout(() => say("ai", t.o.hello[st.intent]), reduced ? 0 : 400);
    $("#agText")?.focus();
  }
  function matchKB(q) {
    const s = " " + q.toLowerCase().replace(/[؟?!.,]/g, " ") + " ";
    let best = null, score = 0;
    for (const item of S.kb) { let n = 0; for (const k of item.k) if (s.includes(k)) n += k.length > 4 ? 2 : 1; if (n > score) { score = n; best = item; } }
    return score >= 2 || (best && score >= 1 && /[?؟]/.test(q)) ? best : null;
  }
  // Questions start with a question word or end with "?"; short yes/no replies answer the call offer.
  const QWORD = /^(what|whats|what's|how|can|could|does|do|is|are|did|has|have|will|would|which|who|where|when|why|tell me|show me|any|hes|he's|he is)\b|^(هل|ممكن|إيه|ايه|ازاي|إزاي|ليه|فين|امتى|إمتى|مين|بيعرف|يقدر|عنده|عندكم|اشتغل|بتعمل)/i;
  const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|sounds good|great|perfect|definitely|let'?s|أيوه|ايوه|اه|آه|تمام|ماشي|أكيد|اكيد|ياريت|يلا|طبعا|طبعًا|موافق)/i;
  const NO = /^(no|nope|nah|not now|not really|maybe later|later|that'?s all|nothing|i'?m good|all good|لا|لأ|مش دلوقتي|خلاص|بعدين|مفيش|كده تمام)/i;
  const BYE = /^(thanks|thank you|thx|bye|goodbye|شكرا|شكرًا|متشكر|مع السلامة|باي)/i;
  // A name is 1–4 words of letters only, with no question words or greetings left over.
  function asName(text) {
    const n = text.trim().replace(/^(hi|hello|hey)[,!\s]+/i, "").replace(/^(i'?m|i am|my name is|this is|it'?s|call me|أنا|انا|اسمي)\s+/i, "")
      .replace(/[.,!]+$/, "").replace(/\s+(here|from .*|at .*|من .*)$/i, "").trim();
    const words = n.split(/\s+/);
    const NOT_NAME = /\b(is|are|was|were|be|am|the|a|an|and|or|but|so|very|really|cool|nice|good|great|awesome|amazing|interesting|thanks|thank|ok|okay|yes|no|he|she|it|they|you|we|i|me|my|his|her|your|our|this|that|not|just|want|need|looking|hiring|project|app|work|job|role)\b|(^| )(هو|هي|انت|إنت|انا عايز|عايز|محتاج|كويس|جميل|حلو|شكرا|شكرًا|تمام|مش|بس|ده|دي)( |$)/iu;
    return words.length <= 4 && /^[\p{L}][\p{L}'’\- ]*$/u.test(n) && !QWORD.test(n) && !NOT_NAME.test(n) ? n : "";
  }
  function offlineReply(text) {
    const o = L().o, lang = isAr(text) ? "ar" : st.lang, t0 = text.trim();
    st.turns = (st.turns || 0) + 1;
    const email = t0.match(EMAIL)?.[0];
    if (email) note({ email });
    const question = /[?؟]/.test(t0) || QWORD.test(t0), kb = matchKB(t0), reply = [];
    const yes = YES.test(t0) && t0.length < 40, no = NO.test(t0) && t0.length < 40, bye = BYE.test(t0) && t0.length < 40;

    if (st.pending === "offer" && (yes || no)) {
      st.pending = "done";
      if (yes) { showBooking(); reply.push(CFG.calLink ? o.bookPick : o.bookEmail.replace("{email}", st.lead.email || "")); }
      else reply.push(o.wrap);
      return respond(reply);
    }
    if ((st.pending === "done" || st.pending === "chat") && (no || bye)) return respond([o.wrap]);
    if (question) {
      if (kb) reply.push(o.cvSays + "\n" + kb[lang]);
      else { note({ notes: [st.lead.notes, t0].filter(Boolean).join(" · ") }); reply.push(o.unknownQ); }
    } else if (kb && (st.pending === "chat" || st.pending === "done")) reply.push(o.cvSays + "\n" + kb[lang]);
    else if (st.pending === "interest") { note({ interest: t0, visitor_type: st.intent === "hiring" ? "recruiter" : "client" }); reply.push(o.noted); }
    else if (st.pending === "name" && !email) { const n = asName(t0); if (!n) return respond([o.notName]); note({ name: n }); }
    else if (st.pending === "email" && !email) return respond([o.badEmail]);
    else if (st.pending === "company") note({ company: t0.slice(0, 120) });

    // what to ask next
    let next = "";
    if (st.intent !== "exploring" && !st.lead.interest) { st.pending = "interest"; next = st.intent === "hiring" ? o.askRole : o.askProject; }
    else if (st.intent === "exploring" && st.turns < 2) st.pending = "chat";
    else if (!st.lead.name) { st.pending = "name"; next = o.askName; }
    else if (!st.lead.email) { st.pending = "email"; next = o.askEmail.replace("{name}", st.lead.name.split(" ")[0]); }
    else if (!st.lead.company && st.intent !== "exploring") { st.pending = "company"; next = o.askCompany; }
    else if (st.pending !== "done" && st.pending !== "offer") { st.pending = "offer"; next = o.ready; }
    else if (st.pending === "offer") next = o.ready;
    if (next) reply.push(next);
    if (!reply.length) reply.push(st.lastAi === o.anything ? o.wrap : o.anything);
    respond(reply);
  }
  function respond(parts) {
    const msg = parts.join("\n\n");
    st.lastAi = parts[parts.length - 1];
    setStatus("thinking");
    setTimeout(() => { say("ai", msg); setStatus("offline"); }, reduced ? 0 : 500 + Math.random() * 400);
  }
  function userSays(text) {
    if (st.conv && st.live) { say("user", text); st.conv.sendUserMessage(text); return; }
    say("user", text); offlineReply(text);
  }

  /* ---------- 3. finish ---------- */
  async function finish() {
    if (st.phase !== "live") return;
    st.phase = "done"; clearInterval(st.timer); cancelAnimationFrame(st.raf);
    const conv = st.conv; st.conv = null; st.live = false;
    try { await conv?.endSession?.(); } catch { /* already closed */ }
    const t = L(), hasLead = FIELDS.some(k => st.lead[k]);
    let status = "";
    if ((hasLead || st.log.length > 2) && !st.submitted) {
      st.submitted = true;
      try {
        const r = await fetch("api/lead.php", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...st.lead, lang: st.lang, mode: st.mode, conversation_id: st.convId, visitor_type: st.lead.visitor_type || (st.intent === "hiring" ? "recruiter" : st.intent === "client" ? "client" : "other"), transcript: st.log.join("\n"), website: $(".hp", root)?.value || "" }) });
        status = r.ok ? t.sent : t.sendFail;
      } catch { status = t.sendFail; }
    }
    const first = (st.lead.name || "").split(" ")[0];
    body.innerHTML = `<div class="ag-done">
      <div class="orb done" aria-hidden="true"><i></i><i></i><i></i><span>✓</span></div>
      <h2 id="agTitle">${esc(hasLead ? t.doneTitle.replace("{name}", first ? (st.lang === "ar" ? " يا " : ", ") + first : "") : t.doneNoLead)}</h2>
      ${hasLead ? `<p class="ag-sub">${esc(t.doneSub)}</p><div class="ag-sum">${FIELDS.filter(k => st.lead[k]).map(k => `<div><dt>${esc(t.f[k])}</dt><dd dir="auto">${esc(st.lead[k])}</dd></div>`).join("")}</div>` : ""}
      ${status ? `<p class="ag-status">${esc(status)}</p>` : ""}
      <div class="ag-go">
        <a class="cta" href="assets/Ahmed_Tahoun_CV.pdf" download>${esc(t.cv)}</a>
        <a class="cta ghost" href="mailto:ahmed.tahoun.at@gmail.com">${esc(t.email)}</a>
        <button type="button" class="cta ghost" data-again>${esc(t.again)}</button>
      </div></div>`;
    $("[data-again]", body).onclick = () => intro();
  }

  /* ---------- launchers ---------- */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-agent]");
    if (!b) return;
    e.preventDefault();
    open({ intent: b.dataset.agent || undefined });
  });
  window.TalkToAI = { open };
})();
