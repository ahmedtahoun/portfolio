(() => {
  const S = window.SITE;
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const isArabic = s => /[؀-ۿ]/.test(s);
  const sleep = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));

  let lang = new URLSearchParams(location.search).get("lang") || store.get("lang") || "en";
  if (!S.ui[lang]) lang = "en";
  const t = k => S.ui[lang][k] ?? S.ui.en[k] ?? k;

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const savedTheme = new URLSearchParams(location.search).get("theme") || store.get("theme");
  if (savedTheme) root.dataset.theme = savedTheme;
  else if (matchMedia("(prefers-color-scheme: light)").matches) root.dataset.theme = "light";
  $("#themeBtn").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    store.set("theme", root.dataset.theme);
  });

  /* ---------- language ---------- */
  function applyLang() {
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $("#langBtn").textContent = lang === "ar" ? "EN" : "عربي";
    document.title = lang === "ar" ? "أحمد طاحون · مهندس Full-Stack وذكاء اصطناعي" : "Ahmed Tahoun · Full-Stack & AI Product Engineer";
    renderChips(); renderScenarios(); renderSteps(); renderWork(); renderTimeline(); renderBrands(); renderKipo();
    rotIndex = 0; $("#rot").textContent = S.rotate[lang][0];
  }
  $("#langBtn").addEventListener("click", () => {
    lang = lang === "ar" ? "en" : "ar";
    store.set("lang", lang);
    applyLang();
  });

  /* ---------- headline rotator ---------- */
  let rotIndex = 0;
  if (!reduced) setInterval(() => {
    const el = $("#rot");
    el.classList.add("out");
    setTimeout(() => {
      rotIndex = (rotIndex + 1) % S.rotate[lang].length;
      el.textContent = S.rotate[lang][rotIndex];
      el.classList.remove("out");
    }, 350);
  }, 2600);

  /* ---------- Ask my AI (on-device) ---------- */
  function renderChips() {
    $("#askChips").innerHTML = S.chips[lang].map(c => `<button type="button">${esc(c)}</button>`).join("");
    $$("#askChips button").forEach(b => b.addEventListener("click", () => ask(b.textContent)));
  }
  function match(q) {
    const s = " " + q.toLowerCase().replace(/[؟?!.,]/g, " ") + " ";
    let best = null, score = 0;
    for (const item of S.kb) {
      let n = 0;
      for (const k of item.k) if (s.includes(k)) n += k.length > 4 ? 2 : 1;
      if (n > score) { score = n; best = item; }
    }
    return best;
  }
  let askRun = 0;
  async function ask(q) {
    q = q.trim();
    if (!q) return;
    const run = ++askRun;
    const t0 = performance.now();
    const hit = match(q);
    const ms = (performance.now() - t0).toFixed(1);
    const ansLang = isArabic(q) ? "ar" : "en";
    const text = hit ? hit[ansLang] : S.fallback[ansLang];
    const box = $("#answer"), a = $("#answerA");
    box.hidden = false;
    box.dir = ansLang === "ar" ? "rtl" : "ltr";
    $("#answerQ").textContent = "› " + q;
    $("#answerFoot").innerHTML = "";
    a.innerHTML = '<span class="caret"></span>';
    $("#askInput").value = "";
    let out = "";
    const chunk = reduced ? text.length : 3;
    for (let i = 0; i < text.length; i += chunk) {
      if (run !== askRun) return;
      out += text.slice(i, i + chunk);
      a.innerHTML = esc(out) + '<span class="caret"></span>';
      await sleep(12);
    }
    a.innerHTML = esc(out);
    const ui = S.ui[ansLang];
    $("#answerFoot").innerHTML = hit
      ? `<span>✓ ${esc(ui["ask.foot"])} · ${ms} ms</span><span>intent: ${hit.id}</span><span>0 API calls</span>`
      : `<span>↳ handover</span><a href="mailto:ahmed.tahoun.at@gmail.com">${esc(ui["ask.handover"])}</a>`;
  }
  $("#askForm").addEventListener("submit", e => { e.preventDefault(); ask($("#askInput").value); });

  /* ---------- sales-bot demo ---------- */
  const chat = $("#chat");
  let spend = 0, busy = false;
  const CAP = 20;
  const now = () => new Date().toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  function bubble(kind, html, dir) {
    const d = document.createElement("div");
    d.className = "msg " + kind;
    if (dir) d.dir = dir;
    d.innerHTML = html + (kind === "sys" ? "" : `<time>${now()}</time>`);
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
  }
  function renderSteps() {
    $("#steps").innerHTML = S.steps[lang].map((s, i) =>
      `<li><span class="n">${i + 1}</span><span>${esc(s[0])}<small>${esc(s[1])}</small></span><span class="t"></span></li>`).join("");
  }
  function renderScenarios() {
    $("#scenarios").innerHTML = S.scenarios.map(s =>
      `<button type="button" class="scn" data-id="${s.id}"><b>${esc(s.t[lang][0])}</b><span>${esc(s.t[lang][1])}</span></button>`).join("");
    $$("#scenarios .scn").forEach(b => b.addEventListener("click", () => {
      $$("#scenarios .scn").forEach(x => x.classList.toggle("on", x === b));
      run(S.scenarios.find(s => s.id === b.dataset.id));
    }));
    if (!chat.children.length) bubble("sys", esc(lang === "ar" ? "اختار سيناريو أو اكتب رسالة عميل 👇" : "Pick a scenario or type a customer message 👇"));
  }
  const PHONE = /(\+?\d[\d\s-]{7,}\d)/g, EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  const HAND = /(custom|bulk|wholesale|complain|complaint|refund|broken|human|agent|person|design|logo|شكوى|مرتجع|كمية|جملة|تصميم|موظف|حد يكلمني|استرجاع)/i;
  function fromText(msg) {
    const ar = isArabic(msg);
    const redacted = PHONE.test(msg) || EMAIL.test(msg) ? msg.replace(PHONE, "[phone]").replace(EMAIL, "[email]") : null;
    PHONE.lastIndex = 0; EMAIL.lastIndex = 0;
    const handover = HAND.test(msg);
    const reply = handover
      ? (ar ? "طلبك محتاج حد من الفريق 🙌 حوّلت المحادثة ليهم وهيردوا عليك هنا حالًا." : "That one needs our team 🙌 I've passed your chat to them and they'll reply here shortly.")
      : (ar ? "أقدر أساعدك في المنتجات والأسعار والتوصيل ☕ عندنا بن، منتجات عناية، وبوكسات هدايا. تحب تشوف إيه؟" : "I can help with products, prices and delivery ☕ We have coffee, skincare and gift boxes. What would you like to see?");
    return { msg, redacted, handover, product: null, reply };
  }
  async function run(sc) {
    if (busy) return;
    busy = true;
    $$("#scenarios .scn").forEach(b => (b.disabled = true));
    const li = $$("#steps li");
    li.forEach(l => { l.className = ""; $(".t", l).textContent = ""; });
    $("#json").textContent = "{ }";
    $("#phStatus").textContent = t("demo.online");

    const custDir = isArabic(sc.msg) ? "rtl" : "ltr";
    const custMsg = bubble("in", esc(sc.msg), custDir);
    const times = [4, 2, 0, 1, 1];
    const step = async (i, cls, ms, label) => {
      li[i].className = "run";
      await sleep(ms);
      li[i].className = cls || "done";
      $(".t", li[i]).textContent = label || `${times[i] || Math.round(ms / 3)} ms`;
    };

    // 1 redact
    if (sc.redacted) {
      li[0].className = "run";
      $("#json").textContent = JSON.stringify({ sent_to_model: sc.redacted }, null, 2);
      await sleep(700);
      const hint = lang === "ar" ? "مخفي عن الذكاء الاصطناعي" : "hidden from the AI";
      custMsg.innerHTML = esc(sc.msg).replace(PHONE, m => `<span class="red" title="${hint}">${m}</span>`).replace(EMAIL, m => `<span class="red" title="${hint}">${m}</span>`) + `<time>${now()}</time>`;
      PHONE.lastIndex = 0; EMAIL.lastIndex = 0;
      li[0].className = "flag";
      $(".t", li[0]).textContent = "1 redacted";
    } else await step(0, "done", 350, "clean");
    // 2 facts
    await step(1, "done", 400, "cache hit");
    // 3 model
    const typing = document.createElement("div");
    typing.className = "typing"; typing.innerHTML = "<i></i><i></i><i></i>";
    chat.appendChild(typing); chat.scrollTop = chat.scrollHeight;
    const lat = 600 + Math.round(Math.random() * 500);
    await step(2, "done", 1100, `${lat} ms`);
    // 4 json
    const out = { reply: sc.reply, handover: sc.handover, product_id: sc.product };
    li[3].className = "run";
    $("#json").textContent = JSON.stringify(out, null, 2);
    await sleep(500);
    li[3].className = "done"; $(".t", li[3]).textContent = "valid";
    // 5 deliver
    typing.remove();
    li[4].className = "run";
    await sleep(250);
    const replyDir = isArabic(sc.reply) ? "rtl" : "ltr";
    if (sc.handover) {
      bubble("out", esc(sc.reply), replyDir);
      bubble("sys", "🔔 " + esc(t("demo.handed")));
      $("#phStatus").textContent = lang === "ar" ? "متصل · مع الفريق" : "online · with the team";
      li[4].className = "flag"; $(".t", li[4]).textContent = "→ human";
    } else {
      bubble("out", esc(sc.reply), replyDir);
      li[4].className = "done"; $(".t", li[4]).textContent = "sent";
    }
    spend += 0.0002 + Math.random() * 0.0003;
    $("#spend").textContent = `$${spend.toFixed(4)} / $${CAP.toFixed(2)}`;
    $("#spendBar").style.width = Math.max(2, (spend / CAP) * 100 * 400) + "%";
    $$("#scenarios .scn").forEach(b => (b.disabled = false));
    busy = false;
  }
  $("#chatForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("#chatText").value.trim();
    if (!v || busy) return;
    $("#chatText").value = "";
    $$("#scenarios .scn").forEach(x => x.classList.remove("on"));
    run(fromText(v));
  });

  /* ---------- Kipo demo (on-device parser) ---------- */
  const RATES = { EGP: 1, USD: 49, AED: 13.3, SAR: 13, EUR: 53 };
  const CATS = [
    [/coffee|قهوة|قهوه|starbucks|cafe|café|latte|شاي|tea|चाय/i, "☕", "Coffee & Snacks", "قهوة وسناكس"],
    [/uber|taxi|careem|تاكسي|اوبر|أوبر|fuel|بنزين|metro|مترو|такси/i, "🚕", "Transport", "مواصلات"],
    [/canva|figma|chatgpt|claude|notion|adobe|software|github|vercel|اشتراك/i, "💻", "Software", "برامج"],
    [/rent|ايجار|إيجار|office|مكتب/i, "🏢", "Office", "مكتب"],
    [/carrefour|grocer|spinneys|lulu|سوبر|خضار|بقالة/i, "🛒", "Groceries", "بقالة"],
    [/talabat|food|lunch|dinner|breakfast|غدا|عشا|فطار|أكل|اكل|burger|pizza|kfc|mcdonald/i, "🍔", "Food & Dining", "أكل ومطاعم"],
    [/nfc|chips|stock|inventory|بضاعة/i, "📦", "Inventory", "بضاعة"],
    [/gym|جيم|pharmacy|صيدلية|doctor|دكتور/i, "🩺", "Health", "صحة"]
  ];
  const OTHER = ["🧾", "Other", "أخرى"], INCOME = ["💰", "Income", "دخل"];
  const kState = { entries: [], seq: 0 };
  const digits = s => s.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const fmt = n => Math.round(n).toLocaleString("en-US");
  function parseOne(raw) {
    const t0 = digits(raw).trim();
    const m = t0.replace(/(\d),(\d{3})/g, "$1$2").match(/(\d+(?:\.\d+)?)\s*(k\b|ألف|الف)?/i);
    if (!m) return null;
    const amount = parseFloat(m[1]) * (m[2] ? 1000 : 1);
    const cur = /\$|usd|دولار/i.test(t0) ? "USD" : /aed|درهم/i.test(t0) ? "AED" : /sar|ريال/i.test(t0) ? "SAR" : /€|eur|يورو/i.test(t0) ? "EUR" : "EGP";
    const income = /^\+/.test(t0);
    const work = /^w\s/i.test(t0) || /for grevo|شغل/i.test(t0);
    const yday = /yesterday|امبارح|إمبارح|أمس|امس/i.test(t0);
    let desc = t0.replace(m[0], " ").replace(/^\+|^w\s/i, " ").replace(/\$|usd|aed|sar|eur|€|دولار|درهم|ريال|يورو|yesterday|امبارح|إمبارح|أمس|دفعت/gi, " ").replace(/\s+/g, " ").trim();
    const cat = income ? INCOME : (CATS.find(c => c[0].test(t0)) || [null, ...OTHER]).slice(-3);
    if (!desc) desc = cat[lang === "ar" ? 2 : 1];
    return { id: ++kState.seq, desc, amount, cur, egp: amount * RATES[cur], cat, work, yday, income, ar: /[؀-ۿ]/.test(raw), undone: false };
  }
  const kChat = $("#kChat");
  function kBubble(cls, html, rtl) {
    const d = document.createElement("div");
    d.className = "tmsg " + cls; d.innerHTML = html;
    d.dir = rtl ? "rtl" : "ltr";
    kChat.appendChild(d); kChat.scrollTop = kChat.scrollHeight;
    return d;
  }
  function entryHTML(e) {
    const L = e.ar ? S.ui.ar : S.ui.en, ci = e.ar ? 2 : 1;
    const amt = e.cur === "EGP" ? `${fmt(e.amount)} EGP` : `${e.amount} ${e.cur} → ${fmt(e.egp)} EGP`;
    return `✅ <b>${esc(e.income ? L["k.income"] : L["k.saved"])}</b> · ${esc(e.desc)}
      <div class="kv"><span>${esc(L["k.amount"])}</span><span dir="ltr">${esc(amt)}</span>
      <span>${esc(L["k.cat"])}</span><span>${e.cat[0]} ${esc(e.cat[ci])}</span>
      <span>${esc(L["k.scope"])}</span><span>${esc(e.work ? L["k.work"] : L["k.personal"])}</span>
      <span>${esc(L["k.date"])}</span><span>${esc(e.yday ? L["k.yday"] : L["k.today2"])}</span></div>
      <div class="tbtns"><button type="button" data-a="cat">${esc(L["k.catbtn"])}</button><button type="button" data-a="edit">${esc(L["k.edit"])}</button><button type="button" data-a="swap">${esc(L["k.swap"])}</button><button type="button" data-a="undo">${esc(L["k.undo"])}</button></div>`;
  }
  function kipoSend(text) {
    text = text.trim();
    if (!text) return;
    const isAr = /[؀-ۿ]/.test(text);
    kBubble("me", esc(text), isAr);
    const parts = text.split(/[,،]/).map(parseOne).filter(Boolean);
    const L = isAr ? S.ui.ar : S.ui.en;
    if (!parts.length) { setTimeout(() => kBubble("bot", L["k.noamt"], isAr), reduced ? 0 : 450); return; }
    parts.forEach((e, i) => setTimeout(() => {
      kState.entries.push(e);
      const b = kBubble("bot", entryHTML(e), e.ar);
      b.addEventListener("click", ev => {
        const a = ev.target.closest("button")?.dataset.a;
        if (!a || e.undone) return;
        if (a === "undo") { e.undone = true; b.classList.add("undone"); kBubble("bot", "↩️ " + esc((e.ar ? S.ui.ar : S.ui.en)["k.undone"]), e.ar); }
        if (a === "swap") { e.work = !e.work; b.innerHTML = entryHTML(e); }
        if (a === "cat" && !e.income) { const all = [...CATS.map(c => c.slice(1)), OTHER]; const k = all.findIndex(c => c[1] === e.cat[1]); e.cat = all[(k + 1) % all.length]; b.innerHTML = entryHTML(e); }
        if (a === "edit") { $("#kText").value = text; $("#kText").focus(); }
        renderSheet();
      });
      renderSheet();
    }, (reduced ? 0 : 450) * (i + 1)));
  }
  function renderSheet() {
    const live = kState.entries.filter(e => !e.undone);
    const exp = live.filter(e => !e.income);
    const today = exp.filter(e => !e.yday).reduce((a, e) => a + e.egp, 0);
    const inc = live.filter(e => e.income).reduce((a, e) => a + e.egp, 0);
    $("#kTotal").textContent = `${fmt(today)} EGP`;
    $("#kIncome").textContent = inc ? `+${fmt(inc)} EGP ${t("k.inc")}` : "";
    const by = {};
    exp.forEach(e => { const k = e.cat[1]; by[k] = by[k] || { c: e.cat, v: 0 }; by[k].v += e.egp; });
    const rows = Object.values(by).sort((a, b) => b.v - a.v);
    const max = Math.max(1, ...rows.map(r => r.v)), ci = lang === "ar" ? 2 : 1;
    $("#kCats").innerHTML = rows.length
      ? rows.map(r => `<div class="cat"><span>${r.c[0]} ${esc(r.c[ci])}</span><span class="b"><i style="width:${(r.v / max) * 100}%"></i></span><span class="v">${fmt(r.v)}</span></div>`).join("")
      : `<p class="sheet-empty">${esc(t("k.empty"))}</p>`;
    $("#kRows").innerHTML = live.slice(-5).reverse().map(e =>
      `<tr><td>${esc(e.yday ? t("k.yday") : t("k.today2"))}</td><td>${esc(e.desc)}</td><td>${e.cat[0]}</td><td>${e.income ? "+" : ""}${fmt(e.egp)}</td></tr>`).join("");
  }
  const K_EX = { en: ["coffee 18", "w canva 13$", "taxi 35, groceries 142", "+15000 client paid", "دفعت 2 ألف ايجار المكتب امبارح"], ar: ["قهوة 85", "دفعت 2 ألف ايجار المكتب امبارح", "اوبر 150، كارفور 1450", "+15000 client paid", "w canva 13$"] };
  function renderKipo() {
    $("#kChips").innerHTML = K_EX[lang].map(x => `<button type="button">${esc(x)}</button>`).join("");
    $$("#kChips button").forEach(b => b.addEventListener("click", () => kipoSend(b.textContent)));
    if (kChat.children.length <= 1) { kChat.innerHTML = ""; kBubble("bot", t("k.hello"), lang === "ar"); }
    renderSheet();
  }
  $("#kForm").addEventListener("submit", e => { e.preventDefault(); const v = $("#kText").value; $("#kText").value = ""; kipoSend(v); });

  /* ---------- ⌘K command palette ---------- */
  const pal = document.createElement("div");
  pal.className = "cmdk"; pal.hidden = true;
  pal.innerHTML = `<div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Command palette"><div class="cmdk-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="cmdIn" type="text" autocomplete="off" aria-label="Command"></div><ul class="cmdk-list" id="cmdList"></ul><div class="cmdk-foot"><span>↑↓</span><span>↵</span><span>esc</span></div></div>`;
  document.body.appendChild(pal);
  let cmdSel = 0, cmdItems = [];
  const go = id => () => document.getElementById(id).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  function commands() {
    return [
      ["🤖", t("ai.h2"), t("cmd.go"), go("ai")], ["🧾", "Kipo", t("cmd.go"), go("kipo")], ["🗂️", t("work.h2"), t("cmd.go"), go("work")],
      ["🧭", t("j.h2"), t("cmd.go"), go("journey")], ["✉️", t("c.h2"), t("cmd.go"), go("contact")],
      ["🌓", t("cmd.theme"), t("cmd.act"), () => $("#themeBtn").click()], ["🌐", t("cmd.lang"), t("cmd.act"), () => $("#langBtn").click()],
      ["📄", t("cmd.cv"), t("cmd.act"), () => { const a = document.createElement("a"); a.href = "assets/Ahmed_Tahoun_CV.pdf"; a.download = ""; a.click(); }],
      ["📧", t("cmd.mail"), t("cmd.act"), () => { location.href = "mailto:ahmed.tahoun.at@gmail.com"; }],
      ["🐙", t("cmd.gh"), t("cmd.act"), () => open("https://github.com/ahmedtahoun", "_blank", "noopener")],
      ["💼", t("cmd.li"), t("cmd.act"), () => open("https://linkedin.com/in/ah-ta", "_blank", "noopener")],
      ["🧾", t("cmd.kipo"), t("cmd.act"), () => open("https://heykipo.com", "_blank", "noopener")]
    ];
  }
  function cmdRender() {
    const q = $("#cmdIn").value.trim().toLowerCase();
    cmdItems = commands().filter(c => !q || c[1].toLowerCase().includes(q) || c[2].toLowerCase().includes(q));
    if (q) cmdItems.unshift(["✨", `${t("cmd.ask")}: “${$("#cmdIn").value.trim()}”`, "AI", () => { go("top")(); ask($("#cmdIn").value.trim() || q); }]);
    cmdSel = Math.min(cmdSel, Math.max(0, cmdItems.length - 1));
    $("#cmdList").innerHTML = cmdItems.map((c, i) => `<li class="${i === cmdSel ? "on" : ""}" data-i="${i}"><span class="ic">${c[0]}</span><span>${esc(c[1])}</span><small>${esc(c[2])}</small></li>`).join("");
    $$("#cmdList li").forEach(li => li.addEventListener("click", () => cmdRun(+li.dataset.i)));
  }
  function cmdRun(i) { const c = cmdItems[i]; if (!c) return; const q = $("#cmdIn").value.trim(); cmdClose(); if (c[2] === "AI") ask(q); else c[3](); }
  function cmdOpen() { pal.hidden = false; $("#cmdIn").placeholder = t("cmd.ph"); $("#cmdIn").value = ""; cmdSel = 0; cmdRender(); $("#cmdIn").focus(); }
  function cmdClose() { pal.hidden = true; }
  $("#cmdBtn").addEventListener("click", cmdOpen);
  $("#footCmd").addEventListener("click", cmdOpen);
  pal.addEventListener("click", e => { if (e.target === pal) cmdClose(); });
  $("#cmdIn").addEventListener("input", () => { cmdSel = 0; cmdRender(); });
  addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? cmdOpen() : cmdClose(); return; }
    if (pal.hidden) return;
    if (e.key === "Escape") cmdClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); cmdSel = (cmdSel + 1) % cmdItems.length; cmdRender(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); cmdSel = (cmdSel - 1 + cmdItems.length) % cmdItems.length; cmdRender(); }
    else if (e.key === "Enter") { e.preventDefault(); cmdRun(cmdSel); }
  });

  /* ---------- work ---------- */
  let filter = "all";
  function media(w) {
    const m = w.media;
    if (!m) return "";
    const badge = m.demo ? `<a class="m-badge" href="${m.demo}">${esc(t("m.demo"))}</a>` : "";
    const live = m.live ? `<span class="m-live">${esc(t("m.live"))}</span>` : "";
    let inner = "";
    if (m.type === "kipo") inner = `<img class="m-kipo" src="assets/kipo.png" alt="" loading="lazy"><span class="m-receipt"><b>☕ coffee 18</b><i>✓ ${lang === "ar" ? "اتسجّل" : "saved"} · Coffee &amp; Snacks</i></span><span class="m-receipt r2"><b>💼 w canva 13$</b><i>→ 637 EGP · Software</i></span>`;
    if (m.type === "chat") inner = `<div class="m-bubbles" dir="rtl"><span class="in">بكام البن الإثيوبي؟</span><span class="out">٩٥٠ جنيه ☕ أبعتلك لينك الطلب؟</span></div><div class="m-bubbles"><span class="in">Call me on <em>[phone]</em></span><span class="sys">🔔 handed to the team</span></div>`;
    if (m.type === "shot") {
      const src = typeof m.img === "string" ? m.img : m.img[lang] || m.img.en;
      inner = `<img class="m-phone" src="${src}" alt="" loading="lazy">` + (m.img2 ? `<img class="m-phone p2" src="${m.img2}" alt="" loading="lazy">` : "");
    }
    if (m.type === "kanban") inner = `<div class="m-kanban">${[3, 2, 4, 2].map(n => `<div>${"<i></i>".repeat(n)}</div>`).join("")}</div><span class="m-lock">🔒 ${esc(t("m.private"))}</span>`;
    if (m.type === "nfc") inner = `<div class="m-nfc"><img src="assets/grevo.png" alt="" loading="lazy"><span class="waves"><i></i><i></i><i></i></span><b>Tap to share</b></div>`;
    if (m.type === "stamps") inner = `<div class="m-stamps"><b>Beans &amp; Co</b><div>${Array.from({ length: 8 }, (_, i) => `<i class="${i < 5 ? "on" : ""}">${i < 5 ? "☕" : ""}</i>`).join("")}</div><small>5 / 8 · 🎁</small></div>`;
    return `<div class="media mt-${m.type}">${inner}${badge}${live}</div>`;
  }
  function renderWork() {
    const fs = ["all", "ai", "mobile", "web"];
    $("#filters").innerHTML = fs.map(f => `<button type="button" role="tab" aria-selected="${f === filter}" data-f="${f}">${esc(t("f." + f))}</button>`).join("");
    $$("#filters button").forEach(b => b.addEventListener("click", () => { filter = b.dataset.f; renderWork(); }));
    $("#workGrid").innerHTML = S.work.map(w => {
      const c = w[lang];
      const top = w.logo ? `<img src="${w.logo}" alt="" loading="lazy"${w.sticker ? ' class="sticker-sm"' : ""}>` : `<span class="ini" style="background:${w.color}">${esc(w.ini)}</span>`;
      const link = w.link ? `<a href="${w.link}" target="_blank" rel="noopener">${esc(t(w.linkKind || "code"))}</a>`
        : w.proto ? `<span class="priv">🧪 ${esc(t("proto"))}</span>` : `<span class="priv">🔒 ${esc(t("private"))}</span>`;
      const hide = filter !== "all" && !w.cat.includes(filter) ? " hide" : "";
      return `<article class="card${hide}">
        ${media(w)}
        <div class="card-top">${top}<div><h3>${esc(w.name)}</h3><span class="when">${esc(w.proto ? t("proto") : w.when)}</span></div></div>
        <p class="tldr">${esc(c.tldr)}</p>
        <ul>${c.pts.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
        <div class="tags">${w.tags.map(x => `<span class="${w.ai.includes(x) ? "ai" : ""}">${esc(x)}</span>`).join("")}</div>
        <div class="card-links">${link}</div>
      </article>`;
    }).join("") + (filter === "all" ? `<a class="card next" href="#contact"><span class="next-ico">＋</span><h3>${esc(t("next.h"))}</h3><p class="tldr">${esc(t("next.p"))}</p><span class="next-cta">${esc(t("next.cta"))}</span></a>` : "");
    $$(".card").forEach(card => card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    }));
  }

  /* ---------- timeline, brands, stack ---------- */
  function renderTimeline() {
    $("#timeline").innerHTML = S.timeline.map(x => {
      const [role, co, line] = x[lang];
      return `<li class="tl reveal in${x.now ? " now" : ""}"><div class="tl-head"><div><h3>${esc(role)}</h3><span class="co">${esc(co)}</span></div><span class="when">${esc(x.when)}</span></div><p>${esc(line)}</p></li>`;
    }).join("");
  }
  function renderBrands() {
    const row = S.brands.map(b => `<span>${esc(b)}</span>`).join("");
    $("#brands").innerHTML = row + row;
    $("#stack").innerHTML = S.stack.map(s => `<span class="${S.aiStack.includes(s) ? "ai" : ""}">${esc(s)}</span>`).join("");
  }

  /* ---------- reveal + counters ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    $$("[data-count]", e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.15 });
  $$(".reveal").forEach(el => io.observe(el));
  // Jumps (nav links, ⌘K) can skip past sections without ever intersecting them: reveal anything at or above the fold.
  let revealQueued = false;
  const revealPassed = () => {
    revealQueued = false;
    $$(".reveal:not(.in)").forEach(el => { if (el.getBoundingClientRect().top < innerHeight) { el.classList.add("in"); io.unobserve(el); } });
  };
  addEventListener("scroll", () => { if (!revealQueued) { revealQueued = true; requestAnimationFrame(revealPassed); } }, { passive: true });
  revealPassed();
  function countUp(el) {
    const end = +el.dataset.count, suf = el.dataset.suffix || "";
    const fmt = n => n.toLocaleString("en-US") + suf;
    if (reduced) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), dur = 1400;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(end * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- demos play one example the first time they come into view ---------- */
  const autoplay = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    autoplay.unobserve(e.target);
    if (e.target.classList.contains("kipo") && !kState.entries.length) {
      kipoSend(lang === "ar" ? "قهوة 85" : "coffee 18");
      setTimeout(() => { if (kState.entries.length === 1) kipoSend(lang === "ar" ? "اوبر 150، كارفور 1450" : "taxi 35, groceries 142"); }, reduced ? 0 : 2200);
    }
    if (e.target.classList.contains("demo") && !busy && chat.querySelectorAll(".msg.in").length === 0) {
      $$("#scenarios .scn")[0]?.classList.add("on");
      run(S.scenarios[0]);
    }
  }), { threshold: 0.4 });
  autoplay.observe($("#kipo .kipo"));
  autoplay.observe($("#ai .demo"));

  /* ---------- scroll progress + dock ---------- */
  const bar = $("#progress"), dockLinks = $$(".dock a");
  const secIds = ["top", "ai", "kipo", "work", "contact"];
  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
    let cur = "top";
    for (const id of secIds) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < innerHeight * 0.4) cur = id; }
    if (scrollY < 200) cur = "top";
    dockLinks.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + cur));
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- cursor glow ---------- */
  const glow = $(".glow");
  addEventListener("pointermove", e => { glow.style.left = e.clientX + "px"; glow.style.top = e.clientY + "px"; }, { passive: true });

  /* ---------- network background ---------- */
  const cv = $("#net"), cx = cv.getContext("2d");
  let pts = [], W = 0, H = 0, raf = 0;
  function size() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = document.documentElement.clientWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(70, Math.round(W * H / 22000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 }));
  }
  function draw() {
    cx.clearRect(0, 0, W, H);
    const light = root.dataset.theme === "light";
    for (const p of pts) {
      if (!reduced) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 140) { cx.strokeStyle = light ? `rgba(217,102,26,${.16 * (1 - d / 140)})` : `rgba(240,145,58,${.2 * (1 - d / 140)})`; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); }
    }
    cx.fillStyle = light ? "rgba(217,102,26,.45)" : "rgba(245,168,75,.6)";
    for (const p of pts) { cx.beginPath(); cx.arc(p.x, p.y, 1.6, 0, 7); cx.fill(); }
    if (!reduced) raf = requestAnimationFrame(draw);
  }
  addEventListener("resize", () => { size(); if (reduced) draw(); });
  document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden && !reduced) raf = requestAnimationFrame(draw); });
  size(); draw();

  applyLang();
})();
