document.addEventListener("DOMContentLoaded", () => {
  const K = {
    lang: "linguora_lang",
    seen: "linguora_seen",
    todayDate: "linguora_today_date",
    todaySlug: "linguora_today_slug",
    lastSlug: "linguora_last_slug",
    todayTheme: "linguora_today_theme",
    lastTheme: "linguora_last_theme"
  };

  const UILABEL = {
    en: { title: "Word of the Day", footer: "Learn a new word every day!", empty: "You’ve seen all words. New words are coming soon.", reset: "Reset words" },
    de: { title: "Wort des Tages",  footer: "Lerne jeden Tag ein neues Wort!", empty: "Du hast alle Wörter gesehen. Bald kommen neue Wörter.", reset: "Zurücksetzen" }
  };

  const els = {
    title: document.getElementById("title-wod"),
    word: document.getElementById("word"),
    ipa: document.getElementById("ipa"),
    def: document.getElementById("definition"),
    ex: document.getElementById("example"),
    footer: document.getElementById("footer-text"),
    buttons: document.querySelectorAll(".lang-btn"),
    cardContent: document.querySelector(".card-content"),
    root: document.documentElement
  };

  const state = { lang: localStorage.getItem(K.lang) || "en", data: null };

  const gradients = [
    ["#1B9D89","#5DE5A5"],["#4e54c8","#8f94fb"],["#ff7e5f","#feb47b"],["#00c6ff","#0072ff"],
    ["#F5515F","#A1051D"],["#7F00FF","#E100FF"],["#11998e","#38ef7d"],["#f7971e","#ffd200"],
    ["#06beb6","#48b1bf"],["#00F5A0","#00D9F5"],["#F53844","#42378F"],["#FAD961","#F76B1C"],
    ["#30cfd0","#330867"],["#834d9b","#d04ed6"],["#B24592","#F15F79"],["#3EECAC","#EE74E1"]
  ];
  const patterns = [
    { css:"none", size:"auto" },
    { css:"radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px)", size:"12px 12px" },
    { css:"repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)", size:"auto" },
    { css:"repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 12px)", size:"auto,auto" },
    { css:"repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,.08) 0 2px, transparent 2px 10px)", size:"auto" },
    { css:"linear-gradient(135deg, rgba(255,255,255,.06) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.06) 50%, rgba(255,255,255,.06) 75%, transparent 75%, transparent)", size:"16px 16px" }
  ];
  const shapes = [
    { css:"none", rot:"0deg" },
    { css:"radial-gradient(100% 80% at 10% 0%, rgba(255,255,255,.20), transparent 60%)", rot:"0deg" },
    { css:"radial-gradient(80% 100% at 100% 20%, rgba(255,255,255,.18), transparent 60%)", rot:"0deg" },
    { css:"conic-gradient(from 0deg at 80% 10%, rgba(255,255,255,.20), transparent 120deg)", rot:"0deg" },
    { css:"radial-gradient(60% 60% at 20% 80%, rgba(255,255,255,.16), transparent 60%)", rot:"0deg" }
  ];

  const dayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(new Date());
  const msUntilNextMidnight = () => { const now=new Date(); const next=new Date(now); next.setHours(24,0,0,0); return next-now; };

  const rIdx = max => Math.floor(Math.random()*max);
  const rIdxNot = (max, not) => (max<=1 ? 0 : ((i)=> i===not ? (i+1)%max : i)(rIdx(max)));
  const Jget = (k, fb=null) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
  const Jset = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const Sget = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const Sset = (k,v) => { try { localStorage.setItem(k,v); } catch {} };
  const Sdel = k => { try { localStorage.removeItem(k); } catch {} };

  async function loadWords(){
    const r = await fetch("words.json", { cache: "no-store" }).catch(()=>null);
    if (!r || !r.ok) {
      return {
        fonts: [{ family:"Poppins" }, { family:"Domine" }],
        entries: [{
          slug:"fallback",
          en:{ word:"Serendipity", ipa:"/ˌsɛrənˈdɪpɪti/", def:"The occurrence and development of events by chance in a happy or beneficial way.", ex:"A fortunate stroke of serendipity." },
          de:{ word:"Serendipität", ipa:"/zeʁɛndiˌpiːtiˈtɛːt/", def:"Das zufällige Finden von etwas Wertvollem oder Nützlichem, nach dem man nicht gezielt gesucht hat.", ex:"Ein Moment der Serendipität führte zur entscheidenden Entdeckung." }
        }]
      };
    }
    return r.json();
  }

  function sanitizeSeen(seen, validSlugs){
    const valid = new Set(validSlugs);
    return Array.isArray(seen) ? [...new Set(seen.filter(s => valid.has(s)))] : [];
  }

  function applyTheme(t){
    const [c1,c2]=gradients[t.g]; const pat=patterns[t.p]; const shp=shapes[t.s];
    els.root.style.setProperty("--c1", c1);
    els.root.style.setProperty("--c2", c2);
    els.root.style.setProperty("--pattern", pat.css);
    els.root.style.setProperty("--pattern-size", pat.size);
    els.root.style.setProperty("--shape", shp.css);
    els.root.style.setProperty("--shape-rot", shp.rot);
  }
  function pickThemeNotSameAsLast(){
    const last = Jget(K.lastTheme, { g:-1,p:-1,s:-1 });
    const t = { g:rIdxNot(gradients.length,last.g), p:rIdxNot(patterns.length,last.p), s:rIdxNot(shapes.length,last.s) };
    Jset(K.todayTheme, t); Jset(K.lastTheme, t);
    return t;
  }

  function applyUI(){
    const u = UILABEL[state.lang];
    els.title.textContent = u.title;
    els.footer.textContent = u.footer;
    document.documentElement.lang = state.lang;
    els.buttons.forEach(b => b.classList.toggle("active", b.dataset.lang === state.lang));
  }
  function fadeSwap(fn){
    els.cardContent.classList.add("fade-out");
    setTimeout(()=>{ fn(); els.cardContent.classList.remove("fade-out"); els.cardContent.classList.add("fade-in"); setTimeout(()=>els.cardContent.classList.remove("fade-in"),200); },200);
  }
  function loadFontLink(family,url){
    if(!url) return;
    const exists=[...document.styleSheets].some(s=>(s.href||"").includes(family.replace(/\s+/g,"+")));
    if(!exists){ const l=document.createElement("link"); l.rel="stylesheet"; l.href=url; document.head.appendChild(l); }
  }
  function applyEntry(entry, fonts){
    const f = (fonts&&fonts.length)? fonts[rIdx(fonts.length)] : { family:"Poppins" };
    if (f.url) loadFontLink(f.family, f.url);
    els.word.style.fontFamily = `"${f.family}", "Poppins", system-ui, Arial, sans-serif`;
    const d = entry[state.lang];
    const hasIPA = !!(d.ipa && String(d.ipa).trim());
    fadeSwap(()=> {
      els.word.textContent = d.word;
      els.cardContent.classList.toggle("no-ipa", !hasIPA);
      if (hasIPA) { els.ipa.textContent = d.ipa; els.ipa.classList.remove("is-hidden"); }
      else { els.ipa.textContent = ""; els.ipa.classList.add("is-hidden"); }
      els.def.textContent = d.def;
      els.ex.textContent  = d.ex;
    });
  }
  function renderExhausted(){
    const u = UILABEL[state.lang];
    fadeSwap(()=> {
      els.word.textContent = "";
      els.ipa.textContent = "";
      els.def.textContent = u.empty;
      els.ex.textContent = "";
      const btn = document.createElement("button");
      btn.className = "btn-reset";
      btn.textContent = u.reset;
      btn.addEventListener("click", resetProgress);
      els.ex.appendChild(btn);
    });
  }

  function unseenPool(entries, seen, excludeSlug=null){
    const seenSet = new Set(seen);
    const pool = entries.filter(e => !seenSet.has(e.slug));
    return excludeSlug ? pool.filter(e => e.slug !== excludeSlug) : pool;
  }

  function pickRandomUnseenPersist(entries){
    const allSlugs = entries.map(e=>e.slug);
    const seen = sanitizeSeen(Jget(K.seen, []), allSlugs);
    const current = Sget(K.todaySlug);
    let pool = unseenPool(entries, seen, current);
    if (pool.length === 0) pool = unseenPool(entries, seen, null);
    if (pool.length === 0) return null;
    const pick = pool[rIdx(pool.length)];
    const newSeen = [...new Set([...seen, pick.slug])];
    Jset(K.seen, newSeen);
    Sset(K.todaySlug, pick.slug);
    Sset(K.lastSlug, pick.slug);
    return pick;
  }

  function pickWordForToday(entries){
    const today = dayKey();
    const storedDate = Sget(K.todayDate);
    const storedSlug = Sget(K.todaySlug);
    const allSlugs = entries.map(e=>e.slug);
    const seen = sanitizeSeen(Jget(K.seen, []), allSlugs);

    if (storedDate === today && storedSlug) {
      const found = entries.find(e => e.slug === storedSlug);
      if (found) return found;
    }

    const pick = pickRandomUnseenPersist(entries);
    if (!pick) return null;
    Sset(K.todayDate, today);
    return pick;
  }

  async function applyAll(){
    if (!state.data) return;
    applyUI();

    const tKey = dayKey();
    let theme = Jget(K.todayTheme, null);
    if (Sget(K.todayDate) !== tKey || !theme) {
      theme = pickThemeNotSameAsLast();
      Sset(K.todayDate, tKey);
    }
    applyTheme(theme);

    const entry = pickWordForToday(state.data.entries || []);
    if (!entry) renderExhausted(); else applyEntry(entry, state.data.fonts || []);
  }

  function resetProgress(){
    Sdel(K.todayDate);
    Sdel(K.todaySlug);
    Sdel(K.todayTheme);
    Jset(K.seen, []);
    applyAll();
  }

  els.buttons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.lang = btn.dataset.lang;
      localStorage.setItem(K.lang, state.lang);
      applyUI();
      const entries = state.data?.entries || [];
      const todaySlug = Sget(K.todaySlug);
      const entry = entries.find(e=>e.slug===todaySlug);
      if (entry) applyEntry(entry, state.data.fonts || []);
    });
  });

  // Alt+N → Fortschritt: nächstes random-unseen Wort PERSISTIEREN; Alt+R → Reset
  function advanceProgress(){
    const entries = state.data?.entries || [];
    if (!entries.length) return;

    // Wenn nichts Unseen mehr: exhausted
    const allSlugs = entries.map(e=>e.slug);
    const seen = sanitizeSeen(Jget(K.seen, []), allSlugs);
    const current = Sget(K.todaySlug);
    let pool = unseenPool(entries, seen, current);
    if (pool.length === 0) pool = unseenPool(entries, seen, null);

    if (pool.length === 0) { renderExhausted(); return; }

    const pick = pickRandomUnseenPersist(entries);
    if (!pick) { renderExhausted(); return; }

    const t = pickThemeNotSameAsLast(); // persist & not same as last
    applyTheme(t);
    applyEntry(pick, state.data.fonts || []);
  }

  window.LINGUORA = { next: advanceProgress, reset: resetProgress };

  document.addEventListener("keydown",(e)=>{
    if (e.altKey && (e.key==="n"||e.key==="N")) { e.preventDefault(); advanceProgress(); }
    if (e.altKey && (e.key==="r"||e.key==="R")) { e.preventDefault(); resetProgress(); }
  });

  (async()=>{
    state.data = await loadWords();
    const slugs = (state.data.entries||[]).map(e=>e.slug);
    Jset(K.seen, sanitizeSeen(Jget(K.seen, []), slugs));
    await applyAll();
    setTimeout(()=>{ applyAll(); setInterval(applyAll, 24*60*60*1000); }, msUntilNextMidnight());
  })();
});
