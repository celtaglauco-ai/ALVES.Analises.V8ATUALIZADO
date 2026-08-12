const $ = x => document.getElementById(x),
  esc = x => String(x ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "'" }[m]));

let ME = null, LG = [], CUR = null;

async function api(u, o = {}) {
  const r = await fetch(u, { credentials: "same-origin", ...o }),
    d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "Erro");
  return d;
}

function shell() {
  document.body.innerHTML = '<div class="top"><div class="brand">⚽ <span>ALVES</span>.AnalisesV8</div><div id="actions"></div></div><main class="wrap" id="main"></main>';
}

function home() {
  shell();
  main.innerHTML = `<section class=hero><div class=art>⚽ 🚩 🟨 🟥</div><h1>ALVES.AnalisesV8</h1><p class=muted>Gols • Escanteios • Cartões • Casa × Fora • Análise Ao Vivo</p></section><div class=grid><div class=card><h2>🔐 Entrar</h2><div class=field>E-mail<input id=le class=input type=email></div><br><div class=field>Senha<input id=lp class=input type=password></div><br><button class=btn onclick=login()>Entrar</button><p id=lm></p></div><div class=card><h2>📝 Criar cadastro</h2><div class=field>Nome<input id=rn class=input></div><br><div class=field>E-mail<input id=re class=input type=email></div><br><div class=field>Senha<input id=rp class=input type=password></div><br><button class=btn onclick=register()>Criar conta</button><p id=rm></p></div></div>`;
}

async function login() {
  try {
    const d = await api("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: le.value, password: lp.value }) });
    ME = d.user;
    dashboard();
  } catch (e) {
    lm.className = "error";
    lm.textContent = e.message;
  }
}

async function register() {
  try {
    const d = await api("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: rn.value, email: re.value, password: rp.value }) });
    rm.className = "ok";
    rm.textContent = d.message;
  } catch (e) {
    rm.className = "error";
    rm.textContent = e.message;
  }
}

async function boot() {
  const d = await api("/api/me");
  d.user ? (ME = d.user, dashboard()) : home();
}

async function logout() {
  await api("/api/logout", { method: "POST" });
  ME = null;
  home();
}

async function dashboard() {
  shell();
  actions.innerHTML = `${esc(ME.name)} ${ME.role === "admin" ? "👑 ADMIN" : "👤 USUÁRIO"} ${ME.role === "admin" ? '<button class="btn alt" onclick="openLogin()">⚙️ Painel Admin</button>' : ""}<button class="btn alt" onclick=logout()>Sair</button>`;
  main.innerHTML = `<div class=card><h2>📊 ANÁLISE PRÉ-JOGO</h2><div class=grid><div class=field>Liga<select id=league class=select onchange=loadLeague()></select></div><div class=field>Casa<select id=home class=select onchange=analyze()></select></div><div class=field>Fora<select id=away class=select onchange=analyze()></select></div></div><p id=info class=notice></p></div><div id=analysis></div><div class="card live"><h2>🔴 ANÁLISE AO VIVO</h2><p class=muted>Janela independente: Casa × Fora, inclusive entre países diferentes. Informe os números atuais da partida.</p><div class=grid><div class=field>Casa<input id=lh class=input placeholder="Time"></div><div class=field>Fora<input id=la class=input placeholder="Time"></div><div class=field>Minuto<input id=min class=input type=number min=0 max=130 value=0></div><div class=field>Placar Casa<input id=ls1 class=input type=number min=0 value=0></div><div class=field>Placar Fora<input id=ls2 class=input type=number min=0 value=0></div><div class=field>Cantos Casa<input id=lc1 class=input type=number min=0 value=0></div><div class=field>Cantos Fora<input id=lc2 class=input type=number min=0 value=0></div><div class=field>Ataques Perigosos<input id=ld class=input type=number min=0 value=0></div><div class=field>Finalizações<input id=sh class=input type=number min=0 value=0></div><div class=field>Chutes no Gol<input id=sot class=input type=number min=0 value=0></div><div class=field>Amarelos<input id=cy class=input type=number min=0 value=0></div><div class=field>Vermelhos<input id=cr class=input type=number min=0 value=0></div></div><br><button class=btn onclick=liveAnalyze()>⚡ Analisar ao vivo</button><div id=liveResult></div></div>`;
  await loadLeagues();
}

async function loadLeagues() {
  LG = await api("/api/leagues");
  league.innerHTML = LG.map(x => `<option value=${x.id}>${esc(x.country)} — ${esc(x.name)}</option>`).join("");
  if (LG.length) loadLeague();
}

async function loadLeague() {
  CUR = await api("/api/leagues/" + league.value);
  info.innerHTML = CUR.csv_name ? `✅ ${esc(CUR.country)} — ${esc(CUR.name)} · ${CUR.games_count} jogos` : "⚪ Nenhum CSV salvo nesta liga";
  const rows = parse(CUR.csv_data || "");
  const teams = [...new Set(rows.flatMap(r => [r.home, r.away]))].sort();
  home.innerHTML = teams.map(x => `<option>${esc(x)}</option>`).join("");
  away.innerHTML = teams.map(x => `<option>${esc(x)}</option>`).join("");
  if (teams[1]) away.value = teams[1];
  analyze();
}

function parse(t) {
  if (!t) return [];
  const a = t.replace(/\r/g, "").split("\n").filter(Boolean),
    sep = (a[0].match(/;/g) || []).length > (a[0].match(/,/g) || []).length ? ";" : ",",
    h = a[0].split(sep).map(x => x.replace(/"/g, "").trim().toLowerCase()),
    ix = xs => xs.map(x => h.indexOf(x)).find(i => i >= 0) ?? -1,
    I = { home: ix(["hometeam", "home", "mandante"]), away: ix(["awayteam", "away", "visitante"]), hg: ix(["fthg", "hg"]), ag: ix(["ftag", "ag"]), ht: ix(["hthg"]), ht2: ix(["htag"]), hc: ix(["hc"]), ac: ix(["ac"]), hy: ix(["hy"]), ay: ix(["ay"]), hs: ix(["hs"]), as: ix(["as"]), hst: ix(["hst"]), ast: ix(["ast"]) },
    n = x => parseFloat(String(x || "").replace(",", ".")) || 0;
  return a.slice(1).map(x => x.split(sep)).filter(c => c[I.home] && c[I.away]).map(c => ({ home: c[I.home], away: c[I.away], hg: n(c[I.hg]), ag: n(c[I.ag]), ht: n(c[I.ht]) + n(c[I.ht2]), hc: n(c[I.hc]), ac: n(c[I.ac]), hy: n(c[I.hy]), ay: n(c[I.ay]), hs: n(c[I.hs]), as: n(c[I.as]), hst: n(c[I.hst]), ast: n(c[I.ast]) }));
}

function st(t) {
  const a = parse(CUR?.csv_data || "").filter(r => r.home === t || r.away === t).slice(-10),
    avg = k => a.length ? a.reduce((z, r) => z + (r.home === t ? r[k[0]] : r[k[1]]), 0) / a.length : 0,
    p = f => a.length ? a.filter(f).length / a.length * 100 : 0;
  return { gf: avg(["hg", "ag"]), ga: avg(["ag", "hg"]), c: avg(["hc", "ac"]), ca: avg(["ac", "hc"]), card: avg(["hy", "ay"]), shots: avg(["hs", "as"]), sot: avg(["hst", "ast"]), ht: p(r => r.ht >= 1), o25: p(r => r.hg + r.ag >= 3), btts: p(r => r.hg > 0 && r.ag > 0), c9: p(r => r.hc + r.ac >= 9), c10: p(r => r.hc + r.ac >= 10), c4: p(r => r.hy + r.ay >= 4), c5: p(r => r.hy + r.ay >= 5) };
}

function market(title, cls, a) {
  const m = Math.max(...a.map(x => x.v));
  return `<div class="market ${cls} ${m >= 75 ? "strong" : ""}"><h2>${title}</h2><div class=grid>${a.map(x => `<div><b>${x.l}</b><div class=score>${x.v.toFixed(0)}%</div><div class=small>${x.v >= 75 ? "🔥 MUITO BOM" : x.v >= 65 ? "🟢 FORTE" : "⚪ MODERADO"}</div></div>`).join("")}</div></div>`;
}

function analyze() {
  if (!CUR || !home.value || !away.value || home.value === away.value) return;
  const x = st(home.value), y = st(away.value);
  analysis.innerHTML = `<div class=card><h2>🎯 ${esc(home.value)} × ${esc(away.value)}</h2><div class=grid><div class=kpi>Gols projetados<b>${((x.gf + x.ga + y.gf + y.ga) / 2).toFixed(2)}</b></div><div class=kpi>Cantos projetados<b>${((x.c + x.ca + y.c + y.ca) / 2).toFixed(2)}</b></div><div class=kpi>Cartões projetados<b>${(x.card + y.card).toFixed(2)}</b></div></div></div>${market("⚽ GOLS", "goals", [{ l: "Over 0.5 HT", v: (x.ht + y.ht) / 2 }, { l: "Over 2.5 gols", v: (x.o25 + y.o25) / 2 }, { l: "Ambas marcam", v: (x.btts + y.btts) / 2 }])}${market("🚩 ESCANTEIOS", "corners", [{ l: "9+ cantos", v: (x.c9 + y.c9) / 2 }, { l: "10+ cantos", v: (x.c10 + y.c10) / 2 }])}${market("🟨 CARTÕES", "cards", [{ l: "4+ cartões", v: (x.c4 + y.c4) / 2 }, { l: "5+ cartões", v: (x.c5 + y.c5) / 2 }])}`;
}

function liveAnalyze() {
  const m = +min.value, go = +ls1.value + +ls2.value, c = +lc1.value + +lc2.value, d = +ld.value, shv = +sh.value, sotv = +sot.value, card = +cy.value + +cr.value, pressure = Math.min(100, d * .7 + shv * 2 + sotv * 4 + c * 4 + card * 5 + (m ? 20 : 0));
  liveResult.innerHTML = `<div class=notice style="margin-top:12px"><h3>🔴 ${esc(lh.value || "Casa")} × ${esc(la.value || "Fora")} — ${m}'</h3><div class=grid><div class=kpi>Pressão/ritmo<b>${pressure.toFixed(0)}/100</b></div><div class=kpi>Placar<b>${go}</b></div><div class=kpi>Cantos<b>${c}</b></div><div class=kpi>Finalizações<b>${shv}</b></div><div class=kpi>No gol<b>${sotv}</b></div><div class=kpi>Cartões<b>${card}</b></div></div><p class=muted>Indicador baseado nos números informados; não é feed oficial minuto a minuto.</p></div>`;
}

/* --- LOGICA CORRIGIDA DO MODAL DE ACESSO --- */
function openLogin() {
  const modal = document.getElementById("loginModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
}

function closeLogin() {
  const modal = document.getElementById("loginModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
  if ($("adminPin")) $("adminPin").value = "";
}

function loginAdmin() {
  const pin = $("adminPin")?.value.trim();
  if (pin === "2580") {
    closeLogin(); // Fecha e esconde o painel na hora
    renderAdminLayout(); // Carrega o painel administrativo real
  } else {
    alert("PIN incorreto!");
    if ($("adminPin")) $("adminPin").value = "";
  }
}

// Vincula a tecla Enter do teclado para entrar direto
document.getElementById("adminPin")?.addEventListener("keypress", e => { if (e.key === "Enter") loginAdmin(); });

/* --- EXIBIÇÃO DO PAINEL REAL DEPOIS DE COLOCAR O PIN --- */
async function renderAdminLayout() {
  try {
