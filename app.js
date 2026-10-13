(() => {
  "use strict";

  // ================== AYARLAR ==================
  const API = "https://site.api.espn.com/apis/site/v2/sports/soccer/";
  const API2 = "https://site.api.espn.com/apis/v2/sports/soccer/";
  const LEAGUES = [
    { id: "tur.1", name: "Süper Lig", flag: "🇹🇷", table: true },
    { id: "tur.2", name: "1. Lig", flag: "🇹🇷", table: true },
    { id: "uefa.champions", name: "Şampiyonlar Ligi", flag: "🇪🇺", table: true },
    { id: "uefa.europa", name: "Avrupa Ligi", flag: "🇪🇺", table: true },
    { id: "uefa.europa.conf", name: "Konferans Ligi", flag: "🇪🇺", table: true },
    { id: "uefa.nations", name: "Uluslar Ligi", flag: "🌍" },
    { id: "fifa.worldq.uefa", name: "Dünya Kupası Elemeleri", flag: "🌍" },
    { id: "eng.1", name: "Premier Lig", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", table: true },
    { id: "esp.1", name: "La Liga", flag: "🇪🇸", table: true },
    { id: "ita.1", name: "Serie A", flag: "🇮🇹", table: true },
    { id: "ger.1", name: "Bundesliga", flag: "🇩🇪", table: true },
    { id: "fra.1", name: "Ligue 1", flag: "🇫🇷", table: true },
    { id: "ned.1", name: "Eredivisie", flag: "🇳🇱", table: true },
    { id: "por.1", name: "Liga Portugal", flag: "🇵🇹", table: true }
  ];
  const leagueById = Object.fromEntries(LEAGUES.map(l => [l.id, l]));

  // ESPN'deki İngilizce yazımları Türkçeleştir
  const TR_NAMES = {
    "Besiktas": "Beşiktaş", "Fenerbahce": "Fenerbahçe", "Istanbul Basaksehir": "Başakşehir", "Basaksehir": "Başakşehir",
    "Goztepe": "Göztepe", "Kasimpasa": "Kasımpaşa", "Eyupspor": "Eyüpspor", "Genclerbirligi": "Gençlerbirliği",
    "Caykur Rizespor": "Çaykur Rizespor", "Rizespor": "Çaykur Rizespor", "Corum FK": "Çorum FK", "Fatih Karagumruk": "Fatih Karagümrük",
    "Karagumruk": "Fatih Karagümrük", "Bodrumspor": "Bodrum FK", "Sivasspor": "Sivasspor", "Ankaragucu": "Ankaragücü",
    "Adana Demirspor": "Adana Demirspor", "Istanbulspor": "İstanbulspor", "Erzurumspor": "Erzurumspor", "Bandirmaspor": "Bandırmaspor",
    "Umraniyespor": "Ümraniyespor", "Manisa FK": "Manisa FK", "Sakaryaspor": "Sakaryaspor", "Keciorengucu": "Keçiörengücü",
    "Igdir FK": "Iğdır FK", "Sariyer": "Sarıyer", "Turkey": "Türkiye", "Turkiye": "Türkiye", "Türkiye": "Türkiye",
    "Germany": "Almanya", "England": "İngiltere", "Spain": "İspanya", "Italy": "İtalya", "France": "Fransa", "Netherlands": "Hollanda",
    "Portugal": "Portekiz", "Belgium": "Belçika", "Croatia": "Hırvatistan", "Greece": "Yunanistan", "Georgia": "Gürcistan",
    "Bulgaria": "Bulgaristan", "Romania": "Romanya", "Hungary": "Macaristan", "Switzerland": "İsviçre", "Austria": "Avusturya",
    "Poland": "Polonya", "Wales": "Galler", "Scotland": "İskoçya", "Ireland": "İrlanda", "Republic of Ireland": "İrlanda",
    "Northern Ireland": "Kuzey İrlanda", "Iceland": "İzlanda", "Norway": "Norveç", "Sweden": "İsveç", "Denmark": "Danimarka",
    "Finland": "Finlandiya", "Serbia": "Sırbistan", "Czechia": "Çekya", "Czech Republic": "Çekya", "Slovakia": "Slovakya",
    "Slovenia": "Slovenya", "Ukraine": "Ukrayna", "Albania": "Arnavutluk", "Bosnia-Herzegovina": "Bosna-Hersek",
    "Montenegro": "Karadağ", "North Macedonia": "Kuzey Makedonya", "Kosovo": "Kosova", "Azerbaijan": "Azerbaycan",
    "Kazakhstan": "Kazakistan", "Armenia": "Ermenistan", "Cyprus": "Kıbrıs", "Israel": "İsrail", "Lithuania": "Litvanya",
    "Latvia": "Letonya", "Estonia": "Estonya", "Moldova": "Moldova", "Belarus": "Belarus", "Luxembourg": "Lüksemburg",
    "Malta": "Malta", "Andorra": "Andorra", "San Marino": "San Marino", "Liechtenstein": "Lihtenştayn", "Faroe Islands": "Faroe Adaları",
    "Gibraltar": "Cebelitarık", "Bayern Munich": "Bayern Münih", "Inter Milan": "Inter", "AC Milan": "Milan"
  };
  const trName = n => TR_NAMES[n] || n;

  const STAT_NAMES = [
    ["possessionPct", "Topla oynama", "%"],
    ["totalShots", "Şut"],
    ["shotsOnTarget", "İsabetli şut"],
    ["wonCorners", "Korner"],
    ["foulsCommitted", "Faul"],
    ["offsides", "Ofsayt"],
    ["yellowCards", "Sarı kart"],
    ["redCards", "Kırmızı kart"],
    ["saves", "Kurtarış"],
    ["totalPasses", "Pas"],
    ["accuratePasses", "İsabetli pas"]
  ];

  // ================== YARDIMCILAR ==================
  const $ = s => document.querySelector(s);
  const app = $("#app");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sameDay = (a, b) => ymd(a) === ymd(b);
  const GUNLER = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yer yok */ } }
  };
  let favs = store.get("skor.favs", {}); // takım id → {id, name, logo, league}
  const saveFavs = () => store.set("skor.favs", favs);
  const isFav = id => !!favs[id];

  function toast(msg, ms = 2600) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
  }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, .15, .3].forEach((at, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = [660, 880, 1100][i]; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(.2, ctx.currentTime + at); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + at + .2);
        o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + .2);
      });
    } catch { /* ses yok */ }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  function logo(url, name, cls = "logo-img") {
    if (url) return `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;logo-ph&quot;>${esc((name || "?").slice(0, 2).toUpperCase())}</span>'">`;
    return `<span class="logo-ph">${esc((name || "?").slice(0, 2).toUpperCase())}</span>`;
  }
  const teamLogo = t => (t && (t.logo || (t.logos && t.logos[0] && t.logos[0].href))) || "";

  // ================== MAÇ VERİSİ ==================
  function parseEvent(ev, leagueId) {
    const comp = ev.competitions && ev.competitions[0] || {};
    const cs = comp.competitors || [];
    const home = cs.find(c => c.homeAway === "home") || cs[0] || {};
    const away = cs.find(c => c.homeAway === "away") || cs[1] || {};
    const st = (ev.status || comp.status || {});
    const type = st.type || {};
    const details = comp.details || [];
    const reds = side => details.filter(d => d.redCard && d.team && d.team.id === side.team?.id).length;
    const mk = c => ({
      id: c.team?.id, name: trName(c.team?.displayName || c.team?.name || "?"), short: trName(c.team?.shortDisplayName || c.team?.displayName || "?"),
      logo: teamLogo(c.team), score: c.score != null && c.score !== "" ? +c.score : null, winner: !!c.winner, reds: 0
    });
    const h = mk(home), a = mk(away);
    h.reds = reds(home); a.reds = reds(away);
    return {
      id: ev.id, league: leagueId, date: new Date(ev.date),
      state: type.state || "pre", name: type.name || "", detail: type.shortDetail || type.detail || "", completed: !!type.completed,
      clock: st.displayClock || "", period: st.period || 0,
      home: h, away: a, venue: comp.venue?.fullName || "", details
    };
  }

  function statusText(m) {
    if (m.name === "STATUS_POSTPONED") return { t: "ERT", cls: "" };
    if (m.name === "STATUS_CANCELED" || m.name === "STATUS_ABANDONED") return { t: "İPT", cls: "" };
    if (m.state === "pre") return { t: `${pad(m.date.getHours())}:${pad(m.date.getMinutes())}`, cls: "" };
    if (m.state === "in") {
      if (m.name === "STATUS_HALFTIME" || /^HT$/i.test(m.detail)) return { t: "İY", cls: "live nomark" };
      const min = (m.clock || "").replace(/'/g, "");
      return { t: min || "Canlı", cls: min ? "live" : "live nomark" };
    }
    if (/AET/i.test(m.detail)) return { t: "UZ", cls: "" };
    if (/pen/i.test(m.detail)) return { t: "PEN", cls: "" };
    return { t: "MS", cls: "" };
  }

  // Seçili güne ait maçlar: sunucu ABD saatine göre çalıştığı için bir gün öncesini de alıp yerel tarihe göre süzeriz
  const cache = new Map(); // anahtar → {at, data}
  async function loadDay(day) {
    const key = ymd(day);
    const hit = cache.get(key);
    const isToday = sameDay(day, new Date());
    if (hit && (Date.now() - hit.at < (isToday ? 25000 : 300000))) return hit.data;
    // ESPN günleri ABD saatine göre tutar; Türkiye'de gece yarısından sonraki maçlar bir önceki güne düşebilir.
    // Bu yüzden seçili günü ve (gece maçları için) bir önceki günü de isteriz.
    const days = [ymd(day), ymd(addDays(day, -1))];
    const results = await Promise.allSettled(LEAGUES.map(l =>
      Promise.allSettled(days.map(d => getJSON(`${API}${l.id}/scoreboard?dates=${d}`))).then(rs => {
        const ok = rs.filter(r => r.status === "fulfilled").map(r => r.value);
        if (!ok.length) throw new Error("yok");
        return { l, j: { leagues: ok[0].leagues, events: ok.flatMap(x => x.events || []) } };
      })));
    let ok = 0;
    const groups = [];
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      ok++;
      const { l, j } = r.value;
      const lg = j.leagues && j.leagues[0];
      const seen = new Set();
      const matches = (j.events || []).filter(e => !seen.has(e.id) && seen.add(e.id)).map(e => parseEvent(e, l.id)).filter(m => sameDay(m.date, day));
      if (matches.length) {
        matches.sort((a, b) => a.date - b.date);
        groups.push({ league: l, logo: lg && lg.logos && lg.logos[0] && lg.logos[0].href, matches });
      }
    }
    if (!ok) throw new Error("bağlantı yok");
    cache.set(key, { at: Date.now(), data: groups });
    return groups;
  }

  // ================== DURUM ==================
  let selDay = new Date();
  let filter = "tumu"; // tumu | canli | favori
  let lastScores = {}; // maç id → "h-a"
  let refreshTimer = null;
  let view = "maclar";
  let detailTab = "olaylar";

  // ================== ÜST BAR ==================
  function setHeader(title, back) {
    $("#title").innerHTML = title;
    $("#backBtn").hidden = !back;
  }
  $("#backBtn").onclick = () => (history.length > 1 ? history.back() : (location.hash = "#/"));
  $("#refreshBtn").onclick = () => { cache.clear(); route(); };
  function setTab(name) {
    document.querySelectorAll(".tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  }
  document.querySelectorAll(".tabbar button").forEach(b => {
    b.onclick = () => { location.hash = { maclar: "#/", puan: "#/puan", takimlarim: "#/takimlarim" }[b.dataset.tab]; };
  });
  function spinning(on) { $("#refreshBtn").classList.toggle("spin", on); }
  function setLiveBadge(n) {
    const b = $("#liveBadge");
    b.hidden = !n; b.textContent = n ? `${n} canlı` : "";
  }

  // ================== MAÇLAR ==================
  function dateStrip() {
    const today = new Date();
    let html = "";
    for (let i = -3; i <= 7; i++) {
      const d = addDays(today, i);
      const label = i === 0 ? "Bugün" : i === -1 ? "Dün" : i === 1 ? "Yarın" : GUNLER[d.getDay()];
      html += `<button class="date ${sameDay(d, selDay) ? "active" : ""}" data-d="${i}"><b>${label}</b><small>${d.getDate()} ${AYLAR[d.getMonth()]}</small></button>`;
    }
    return `<div class="dates" id="dates">${html}</div>`;
  }

  function matchRow(m) {
    const s = statusText(m);
    const pre = m.state === "pre" || m.home.score == null;
    const score = pre ? `<div class="score pre">-</div>` : `<div class="score ${m.state === "in" ? "live" : ""}">${m.home.score} - ${m.away.score}</div>`;
    const side = (t, cls) => `<div class="team ${cls} ${t.winner ? "win" : ""} ${isFav(t.id) ? "fav" : ""}">
        ${cls === "home" ? `${"<i class='rc'></i>".repeat(t.reds)}<span class="tname">${esc(t.short)}</span>${logo(t.logo, t.name)}` : `${logo(t.logo, t.name)}<span class="tname">${esc(t.short)}</span>${"<i class='rc'></i>".repeat(t.reds)}`}
      </div>`;
    return `<button class="match" data-id="${m.id}" data-l="${m.league}">
      <div class="time ${s.cls}">${esc(s.t)}</div>
      ${side(m.home, "home")}
      ${score}
      ${side(m.away, "away")}
      <div class="ht">${isFav(m.home.id) || isFav(m.away.id) ? "⭐" : ""}</div>
    </button>`;
  }

  async function renderMatches(silent) {
    view = "maclar"; setTab("maclar");
    setHeader(`<span class="logo">⚽</span> Winterball`, false);
    if (!silent) {
      app.innerHTML = `${dateStrip()}<div class="filters" id="filters"></div><div id="list"><div class="skeleton">${'<div class="sk"></div>'.repeat(8)}</div></div>`;
      bindDates();
      const act = $("#dates .active"); if (act) act.scrollIntoView({ inline: "center", block: "nearest" });
    }
    spinning(true);
    let groups;
    try { groups = await loadDay(selDay); }
    catch {
      spinning(false);
      if (view !== "maclar") return;
      $("#list").innerHTML = `<div class="error"><span class="big">📡</span>Maçlar yüklenemedi. İnternet bağlantını kontrol et.<br><button id="retry">Tekrar dene</button></div>`;
      $("#retry").onclick = () => renderMatches();
      return;
    }
    spinning(false);
    if (view !== "maclar" || !$("#list")) return;

    const all = groups.flatMap(g => g.matches);
    const liveN = all.filter(m => m.state === "in").length;
    setLiveBadge(liveN);
    const favN = all.filter(m => isFav(m.home.id) || isFav(m.away.id)).length;
    $("#filters").innerHTML = `
      <button class="chip ${filter === "tumu" ? "active" : ""}" data-f="tumu">Tümü (${all.length})</button>
      <button class="chip live ${filter === "canli" ? "active" : ""}" data-f="canli">● Canlı (${liveN})</button>
      <button class="chip ${filter === "favori" ? "active" : ""}" data-f="favori">⭐ Favoriler (${favN})</button>`;
    $("#filters").querySelectorAll(".chip").forEach(c => { c.onclick = () => { filter = c.dataset.f; renderMatches(true); }; });

    checkGoals(all);

    const pass = m => filter === "tumu" || (filter === "canli" && m.state === "in") || (filter === "favori" && (isFav(m.home.id) || isFav(m.away.id)));
    // Favori takımların ligleri ve Süper Lig en üstte
    const order = g => (g.matches.some(m => isFav(m.home.id) || isFav(m.away.id)) ? -100 : 0) + LEAGUES.indexOf(g.league);
    const html = groups.slice().sort((a, b) => order(a) - order(b)).map(g => {
      const ms = g.matches.filter(pass);
      if (!ms.length) return "";
      return `<section class="league">
        <button class="league-head" data-table="${g.league.table ? g.league.id : ""}">
          <span class="flag">${g.league.flag}</span>
          ${g.logo ? `<img src="${esc(g.logo)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
          <span class="name">${esc(g.league.name)}</span>
          ${g.league.table ? `<span class="more">Puan durumu <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></span>` : ""}
        </button>
        ${ms.map(matchRow).join("")}
      </section>`;
    }).join("");

    const emptyMsg = filter === "canli" ? "Şu an oynanan maç yok." : filter === "favori" ? (Object.keys(favs).length ? "Bugün favori takımlarının maçı yok." : "Henüz favori takımın yok. Bir maça girip takımın yanındaki ☆'a dokun.") : "Bu gün için maç bulunamadı.";
    $("#list").innerHTML = (html || `<div class="empty"><span class="big">🗓️</span>${emptyMsg}</div>`) +
      `<div class="source">Veriler ESPN'den alınır · ${sameDay(selDay, new Date()) ? "30 sn'de bir yenilenir" : ""}</div>`;

    $("#list").querySelectorAll(".match").forEach(b => {
      b.onclick = () => (location.hash = `#/mac/${b.dataset.l}/${b.dataset.id}`);
    });
    $("#list").querySelectorAll(".league-head").forEach(b => {
      b.onclick = () => { if (b.dataset.table) location.hash = `#/puan/${b.dataset.table}`; };
    });

    scheduleRefresh(sameDay(selDay, new Date()) && all.some(m => m.state !== "post"));
  }

  function bindDates() {
    $("#dates").querySelectorAll(".date").forEach(b => {
      b.onclick = () => {
        selDay = addDays(new Date(), +b.dataset.d);
        $("#dates").querySelectorAll(".date").forEach(x => x.classList.toggle("active", x === b));
        b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        $("#list").innerHTML = `<div class="skeleton">${'<div class="sk"></div>'.repeat(8)}</div>`;
        renderMatches(true);
      };
    });
  }

  // Favori takım gol attığında uyar
  function checkGoals(all) {
    for (const m of all) {
      if (m.home.score == null) continue;
      const key = `${m.home.score}-${m.away.score}`;
      const prev = lastScores[m.id];
      lastScores[m.id] = key;
      if (!prev || prev === key) continue;
      const [ph, pa] = prev.split("-").map(Number);
      const scorer = m.home.score > ph ? m.home : m.away.score > pa ? m.away : null;
      if (!scorer) continue;
      if (isFav(m.home.id) || isFav(m.away.id) || filter === "canli") {
        toast(`⚽ GOL! ${scorer.short} · ${m.home.short} ${m.home.score}-${m.away.score} ${m.away.short}`, 5000);
        beep();
      }
      setTimeout(() => { const row = document.querySelector(`.match[data-id="${m.id}"]`); if (row) row.classList.add("flash"); }, 50);
    }
  }

  function scheduleRefresh(on) {
    clearTimeout(refreshTimer);
    if (!on) return;
    refreshTimer = setTimeout(() => {
      if (document.hidden) { scheduleRefresh(true); return; }
      if (view === "maclar") renderMatches(true);
      else if (view === "detay") route(true);
    }, 30000);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && (view === "maclar" || view === "detay")) { cache.clear(); route(true); }
  });

  // ================== MAÇ DETAYI ==================
  function toggleFav(t, leagueId) {
    if (!t.id) return;
    if (favs[t.id]) { delete favs[t.id]; toast(`${t.name} favorilerden çıkarıldı`); }
    else { favs[t.id] = { id: t.id, name: t.name, logo: t.logo, league: leagueId }; toast(`⭐ ${t.name} favorilere eklendi`); }
    saveFavs();
  }

  async function renderDetail(leagueId, id, silent) {
    view = "detay"; setTab(null);
    const lg = leagueById[leagueId] || { name: "Maç", flag: "⚽" };
    setHeader(esc(lg.name), true);
    if (!silent) app.innerHTML = `<div class="skeleton">${'<div class="sk" style="height:120px"></div>'}${'<div class="sk"></div>'.repeat(5)}</div>`;
    spinning(true);
    let j;
    try { j = await getJSON(`${API}${leagueId}/summary?event=${id}`); }
    catch {
      spinning(false);
      if (!silent) app.innerHTML = `<div class="error"><span class="big">📡</span>Maç bilgisi yüklenemedi.<br><button id="retry">Tekrar dene</button></div>`;
      const r = $("#retry"); if (r) r.onclick = () => renderDetail(leagueId, id);
      return;
    }
    spinning(false);
    if (view !== "detay" || location.hash !== `#/mac/${leagueId}/${id}`) return;

    const hc = j.header && j.header.competitions && j.header.competitions[0] || {};
    const m = parseEvent({ id, date: hc.date, status: hc.status, competitions: [hc] }, leagueId);
    if (j.gameInfo && j.gameInfo.venue) m.venue = j.gameInfo.venue.fullName || m.venue;
    const s = statusText(m);
    const pre = m.state === "pre" || m.home.score == null;
    const dateStr = `${m.date.getDate()} ${AYLAR[m.date.getMonth()]} ${GUNLER[m.date.getDay()]} · ${pad(m.date.getHours())}:${pad(m.date.getMinutes())}`;
    const side = (t, rid) => `<div class="side">
        ${logo(t.logo, t.name)}
        <b>${esc(t.name)}</b>
        <button class="star-btn ${isFav(t.id) ? "on" : ""}" id="${rid}">${isFav(t.id) ? "★ Favori" : "☆ Favorile"}</button>
      </div>`;

    const tabs = [["olaylar", "Olaylar"], ["istatistik", "İstatistik"], ["kadrolar", "Kadrolar"]];
    if (leagueById[leagueId] && leagueById[leagueId].table) tabs.push(["puan", "Puan"]);

    app.innerHTML = `
      <div class="detail-head">
        <div class="league-line">${lg.flag} ${esc(lg.name)} · ${dateStr}</div>
        <div class="sb">
          ${side(m.home, "favH")}
          <div class="mid">
            <div class="big-score ${m.state === "in" ? "live" : ""}">${pre ? "– : –" : `${m.home.score} - ${m.away.score}`}</div>
            <div class="status ${s.cls.includes("live") ? "live" : ""}">${m.state === "in" ? (s.t === "İY" ? "Devre arası" : `${esc(s.t)}' canlı`) : m.state === "pre" ? `Başlama ${esc(s.t)}` : s.t === "MS" ? "Maç sonu" : esc(s.t)}</div>
          </div>
          ${side(m.away, "favA")}
        </div>
        ${m.venue ? `<div class="venue">🏟️ ${esc(m.venue)}</div>` : ""}
      </div>
      <div class="seg" id="seg">${tabs.map(([k, n]) => `<button data-k="${k}" class="${detailTab === k ? "active" : ""}">${n}</button>`).join("")}</div>
      <div id="dbody"></div>`;

    $("#favH").onclick = () => { toggleFav(m.home, leagueId); renderDetail(leagueId, id, true); };
    $("#favA").onclick = () => { toggleFav(m.away, leagueId); renderDetail(leagueId, id, true); };
    const draw = () => {
      if (detailTab === "olaylar") $("#dbody").innerHTML = eventsHTML(j, m);
      else if (detailTab === "istatistik") $("#dbody").innerHTML = statsHTML(j, m);
      else if (detailTab === "kadrolar") $("#dbody").innerHTML = lineupsHTML(j, m);
      else if (detailTab === "puan") { $("#dbody").innerHTML = `<div class="skeleton">${'<div class="sk"></div>'.repeat(6)}</div>`; standingsCard(leagueId, [m.home.id, m.away.id]).then(h => { if ($("#dbody") && detailTab === "puan") $("#dbody").innerHTML = h; }); }
    };
    if (!tabs.some(t => t[0] === detailTab)) detailTab = "olaylar";
    $("#seg").querySelectorAll("button").forEach(b => {
      b.onclick = () => { detailTab = b.dataset.k; $("#seg").querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b)); draw(); };
    });
    draw();
    scheduleRefresh(m.state === "in" || (m.state === "pre" && m.date - Date.now() < 3600000));
  }

  function eventsHTML(j, m) {
    const ke = (j.keyEvents || []).filter(e => e.type && /goal|card|substitution|penalty|own/i.test((e.type.type || "") + " " + (e.type.text || "")));
    const homeId = m.home.id;
    if (!ke.length) {
      return `<div class="card"><div class="empty" style="padding:30px"><span class="big">⏱️</span>${m.state === "pre" ? "Maç henüz başlamadı." : "Olay bilgisi yok."}</div></div>`;
    }
    const icon = e => {
      const t = ((e.type.type || "") + " " + (e.type.text || "")).toLowerCase();
      if (t.includes("own")) return "⚽ <small>(KK)</small>";
      if (t.includes("penalty") && t.includes("miss")) return "❌ <small>(pen)</small>";
      if (t.includes("penalty")) return "⚽ <small>(pen)</small>";
      if (t.includes("goal")) return "⚽";
      if (t.includes("red") || t.includes("second yellow")) return "🟥";
      if (t.includes("yellow")) return "🟨";
      if (t.includes("substitution")) return "🔁";
      return "•";
    };
    const people = e => (e.participants || []).map(p => p.athlete && p.athlete.displayName).filter(Boolean);
    let lastHalf = 0, rows = "";
    for (const e of ke) {
      const per = e.period && e.period.number || 0;
      if (per !== lastHalf && per === 2) rows += `<li class="ev-divider">İKİNCİ YARI</li>`;
      lastHalf = per;
      const ppl = people(e);
      const isSub = /substitution/i.test(e.type.text || e.type.type || "");
      const main = isSub ? (ppl[0] ? `↑ ${esc(ppl[0])}` : "") : esc(ppl[0] || e.shortText || "");
      const sub = isSub ? (ppl[1] ? `↓ ${esc(ppl[1])}` : "") : (ppl[1] ? `asist: ${esc(ppl[1])}` : "");
      const cell = `${icon(e)} <span class="who">${main}</span>${sub ? `<span class="sub">${sub}</span>` : ""}`;
      const isHome = e.team && e.team.id === homeId;
      const min = e.clock && e.clock.displayValue || "";
      rows += `<li class="ev"><div class="l">${isHome ? cell : ""}</div><div class="min">${esc(min)}</div><div class="r">${isHome ? "" : cell}</div></li>`;
    }
    return `<div class="card"><h3>Maç olayları</h3><ul class="events">${rows}</ul></div>`;
  }

  function statsHTML(j, m) {
    const teams = j.boxscore && j.boxscore.teams || [];
    const find = id => teams.find(t => t.team && t.team.id === id) || {};
    const hs = find(m.home.id).statistics || [], as = find(m.away.id).statistics || [];
    const val = (arr, name) => { const s = arr.find(x => x.name === name); return s ? parseFloat(s.displayValue) : null; };
    const rows = STAT_NAMES.map(([k, label, unit]) => {
      const h = val(hs, k), a = val(as, k);
      if (h == null || a == null || (isNaN(h) && isNaN(a))) return "";
      const tot = (h || 0) + (a || 0) || 1;
      return `<div class="stat"><div class="row"><b>${h}${unit || ""}</b><span>${label}</span><b>${a}${unit || ""}</b></div>
        <div class="bars"><div><i class="h" style="width:${(h || 0) / tot * 100}%"></i></div><div><i class="a" style="width:${(a || 0) / tot * 100}%"></i></div></div></div>`;
    }).join("");
    return `<div class="card"><h3>İstatistikler</h3>${rows || `<div class="empty" style="padding:30px"><span class="big">📊</span>${m.state === "pre" ? "Maç başlayınca istatistikler burada." : "İstatistik bilgisi yok."}</div>`}</div>`;
  }

  function lineupsHTML(j, m) {
    const rs = j.rosters || [];
    if (!rs.length || !rs.some(r => (r.roster || []).length)) {
      return `<div class="card"><div class="empty" style="padding:30px"><span class="big">👕</span>Kadrolar genelde maçtan yaklaşık 1 saat önce açıklanır.</div></div>`;
    }
    const col = r => {
      const list = r.roster || [];
      const li = p => `<li><span class="no">${esc(p.jersey || "")}</span><span>${esc(p.athlete && (p.athlete.shortName || p.athlete.displayName) || "")}</span><span class="pos">${esc(p.position && p.position.abbreviation || "")}</span></li>`;
      const starters = list.filter(p => p.starter), bench = list.filter(p => !p.starter);
      return `<div><div class="form">${esc(trName(r.team && r.team.displayName || ""))}${r.formation ? ` · ${esc(r.formation)}` : ""}</div>
        <ol>${starters.map(li).join("")}</ol>
        ${bench.length ? `<div class="bench-title">Yedekler</div><ol>${bench.map(li).join("")}</ol>` : ""}</div>`;
    };
    const home = rs.find(r => r.homeAway === "home") || rs[0], away = rs.find(r => r.homeAway === "away") || rs[1];
    return `<div class="card"><h3>Kadrolar</h3><div class="lineups">${home ? col(home) : "<div></div>"}${away ? col(away) : "<div></div>"}</div></div>`;
  }

  // ================== PUAN DURUMU ==================
  const tableCache = new Map();
  async function loadTable(leagueId) {
    const hit = tableCache.get(leagueId);
    if (hit && Date.now() - hit.at < 120000) return hit.data;
    const j = await getJSON(`${API2}${leagueId}/standings`);
    const groups = [];
    const walk = node => {
      if (node.standings && node.standings.entries && node.standings.entries.length) groups.push({ name: node.name || node.abbreviation || "", entries: node.standings.entries });
      (node.children || []).forEach(walk);
    };
    walk(j);
    tableCache.set(leagueId, { at: Date.now(), data: groups });
    return groups;
  }

  async function standingsCard(leagueId, highlight = []) {
    let groups;
    try { groups = await loadTable(leagueId); }
    catch { return `<div class="error"><span class="big">📡</span>Puan durumu yüklenemedi.</div>`; }
    if (!groups.length) return `<div class="empty"><span class="big">📋</span>Bu lig için puan durumu yok.</div>`;
    const notes = new Map();
    const html = groups.map(g => {
      const sorted = g.entries.slice().sort((a, b) => stat(a, "rank") - stat(b, "rank"));
      const rows = sorted.map(e => {
        const t = e.team || {};
        const color = e.note && e.note.color ? (e.note.color.startsWith("#") ? e.note.color : "#" + e.note.color) : "";
        if (e.note && e.note.description) notes.set(e.note.description, color);
        const hl = highlight.includes(t.id) ? "background:rgba(34,197,94,.1);" : "";
        return `<tr class="${isFav(t.id) ? "fav" : ""}" style="${hl}">
          <td class="rk" style="${color ? `border-left-color:${color}` : ""}">${stat(e, "rank")}</td>
          <td class="tm">${logo(teamLogo(t), t.displayName)}<span>${esc(trName(t.shortDisplayName || t.displayName))}</span></td>
          <td>${stat(e, "gamesPlayed")}</td><td>${stat(e, "wins")}</td><td>${stat(e, "ties")}</td><td>${stat(e, "losses")}</td>
          <td>${sv(e, "pointDifferential")}</td><td class="pts">${stat(e, "points")}</td></tr>`;
      }).join("");
      return `<div class="card">${groups.length > 1 || g.name ? `<h3>${esc(g.name)}</h3>` : ""}
        <table class="table"><thead><tr><th>#</th><th class="tm">Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AV</th><th>P</th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
    }).join("");
    const legend = notes.size ? `<div class="card"><div class="legend" style="border:0">${[...notes].map(([d, c]) => `<span><i style="background:${esc(c)}"></i>${esc(trNote(d))}</span>`).join("")}</div></div>` : "";
    return html + legend;
  }
  function stat(e, name) { const s = (e.stats || []).find(x => x.name === name); return s ? (s.value != null ? s.value : s.displayValue) : ""; }
  function sv(e, name) { const s = (e.stats || []).find(x => x.name === name); return s ? s.displayValue : ""; }
  function trNote(d) {
    return d.replace(/Champions League/i, "Şampiyonlar Ligi").replace(/Europa Conference League|Conference League/i, "Konferans Ligi")
      .replace(/Europa League/i, "Avrupa Ligi").replace(/Relegation/i, "Küme düşme").replace(/Promotion/i, "Üst lig")
      .replace(/Qualifying|qualifiers/i, "eleme").replace(/League Phase/i, "lig aşaması").replace(/Playoff(s)?/i, "play-off")
      .replace(/Round of 16/i, "son 16").replace(/Knockout/i, "eleme turu");
  }

  async function renderStandings(leagueId) {
    view = "puan"; setTab("puan");
    setHeader("Puan Durumu", false);
    const tables = LEAGUES.filter(l => l.table);
    const cur = leagueById[leagueId] && leagueById[leagueId].table ? leagueId : "tur.1";
    app.innerHTML = `<div class="league-pick">${tables.map(l => `<button class="chip ${l.id === cur ? "active" : ""}" data-l="${l.id}">${l.flag} ${esc(l.name)}</button>`).join("")}</div>
      <div id="tbody"><div class="skeleton">${'<div class="sk"></div>'.repeat(10)}</div></div>`;
    app.querySelectorAll(".league-pick .chip").forEach(c => { c.onclick = () => location.replace(`#/puan/${c.dataset.l}`); });
    const act = app.querySelector(".league-pick .active"); if (act) act.scrollIntoView({ inline: "center", block: "nearest" });
    spinning(true);
    const html = await standingsCard(cur);
    spinning(false);
    if (view === "puan" && $("#tbody")) $("#tbody").innerHTML = html + `<div class="source">O: oynanan · G: galibiyet · B: beraberlik · M: mağlubiyet · AV: averaj · P: puan</div>`;
  }

  // ================== TAKIMLARIM ==================
  async function renderFavs() {
    view = "takimlarim"; setTab("takimlarim");
    setHeader("Takımlarım", false);
    const list = Object.values(favs);
    if (!list.length) {
      app.innerHTML = `<div class="empty"><span class="big">⭐</span>Henüz favori takımın yok.<br>Bir maçın detayına girip takımın altındaki <b>☆ Favorile</b> butonuna dokun.<br><br>Favori takımın gol attığında uygulama açıksa seni uyarırım.</div>`;
      return;
    }
    app.innerHTML = `<div class="card" style="margin-top:10px"><h3>Favori takımlar</h3>${list.map(t => `
      <div class="fav-team">${logo(t.logo, t.name)}<b>${esc(t.name)}</b><button class="star-btn on" data-id="${esc(t.id)}">★ Çıkar</button></div>`).join("")}</div>
      <div id="favMatches"><div class="skeleton">${'<div class="sk"></div>'.repeat(4)}</div></div>`;
    app.querySelectorAll(".fav-team .star-btn").forEach(b => { b.onclick = () => { delete favs[b.dataset.id]; saveFavs(); renderFavs(); }; });

    // Her favori takımın son ve sıradaki maçları
    spinning(true);
    const blocks = await Promise.all(list.map(async t => {
      const lid = t.league || "tur.1";
      try {
        const [past, next] = await Promise.all([
          getJSON(`${API}${lid}/teams/${t.id}/schedule`).catch(() => ({})),
          getJSON(`${API}${lid}/teams/${t.id}/schedule?fixture=true`).catch(() => ({}))
        ]);
        const evs = [...(past.events || []), ...(next.events || [])].map(e => parseEvent(e, lid));
        const uniq = [...new Map(evs.map(e => [e.id, e])).values()].sort((a, b) => a.date - b.date);
        const done = uniq.filter(e => e.state === "post").slice(-3);
        const upcoming = uniq.filter(e => e.state !== "post").slice(0, 3);
        const row = e => `<div class="ht" style="text-align:left;padding:6px 10px 0">${e.date.getDate()} ${AYLAR[e.date.getMonth()]} ${GUNLER[e.date.getDay()]}</div>${matchRow(e)}`;
        return `<section class="league"><div class="league-head"><span class="name">${esc(t.name)}</span></div>
          ${done.map(row).join("")}${upcoming.map(row).join("") || `<div class="hint">Yaklaşan maç bulunamadı.</div>`}</section>`;
      } catch { return ""; }
    }));
    spinning(false);
    if (view !== "takimlarim" || !$("#favMatches")) return;
    $("#favMatches").innerHTML = blocks.join("") || `<div class="hint">Maç bilgisi yüklenemedi.</div>`;
    $("#favMatches").querySelectorAll(".match").forEach(b => { b.onclick = () => (location.hash = `#/mac/${b.dataset.l}/${b.dataset.id}`); });
  }

  // ================== YÖNLENDİRME ==================
  function route(silent) {
    clearTimeout(refreshTimer);
    const h = location.hash || "#/";
    const p = h.slice(2).split("/");
    if (p[0] === "mac" && p[1] && p[2]) renderDetail(p[1], p[2], silent === true);
    else if (p[0] === "puan") renderStandings(p[1]);
    else if (p[0] === "takimlarim") renderFavs();
    else renderMatches(silent === true);
    if (silent !== true) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", () => { detailTab = location.hash.startsWith("#/mac/") ? detailTab : "olaylar"; route(); });
  route();

  if ("serviceWorker" in navigator && location.protocol === "https:" && !window.Capacitor) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
