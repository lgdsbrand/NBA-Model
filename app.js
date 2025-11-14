/* =======================
   NBA Lineup Model - app.js
   ======================= */

/* 1) CSV URLS ------------------------------------------------
   (Paste your real published CSV links below)
*/

const PLAYER_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=2033299676&single=true&output=csv";     // Player PER/USG, etc.
const LINEUPS_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=975459408&single=true&output=csv";    // Team lineups
const LEAGUE_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1422185850&single=true&output=csv"; // League averages

// Rebounding (TeamRankings)
const OREB_URL      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1907720061&single=true&output=csv";
const OPP_OREB_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1902898168&single=true&output=csv";
const DREB_URL      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=957131207&single=true&output=csv";
const OPP_DREB_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=32364573&single=true&output=csv";

// NBAstuffer + extras
const NBASTUFF_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=837216555&single=true&output=csv";
const PPG_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1145033141&single=true&output=csv";       // Season PPG/OPPG/Pace
const ATS_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1315673353&single=true&output=csv";       // ATS record
const OU_URL        = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1968724257&single=true&output=csv";        // Over/Under record
const RANK_URL      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=2093071983&single=true&output=csv";   // Predictive rating
const NAMES_URL     = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=19771105&single=true&output=csv";     // TR name ↔ NBAstuffer name


/* 2) COLUMN LETTER MAP -------------------------------------- */
/* Adjust letters to match your exact sheet layout            */

const COLS = {
  // Players tab
  player: {
    team:   "null", // no team column used
    player: "B",
    g:      "F",
    mp:     "H",
    per:    "I",
    usg:    "T"
  },

  // Lineups tab
  lineups: {
    team: "A",
    g1:   "B",
    g2:   "C",
    f1:   "D",
    f2:   "E",
    c:    "F"
  },

  // Rebounding tabs (kept for future use)
  oreb: {
    team: "B",
    haf:  "F",
    haG:  "G",
    l3:   "D"
  },
  dreb: {
    team: "B",
    haf:  "F",
    haG:  "G",
    l3:   "D"
  },
  orebOpp: {
    team: "B",
    season: "C",
    l3:     "D"
  },
  drebOpp: {
    team: "B",
    season: "C",
    l3:     "D"
  },

  // NBAstuffer L5 + H/A eff + records
  // CHANGE these letters to match your nbastuffer sheet
  nbastuff: {
    team:        "B",
    offEffL5:    "J",
    defEffL5:    "K",
    paceL5:      "I",   // if you have L5 pace
    offEffHome:  "BH",
    defEffHome:  "BI",
    offEffAway:  "AI",
    defEffAway:  "AJ",
    l5W:         "R",
    l5L:         "S",
    homeW:       "BP",
    homeL:       "BQ",
    awayW:       "AQ",
    awayL:       "AR"
  },

  // PPG tab (TeamRankings)
  // MAKE SURE oppg letter matches your OPP PPG column
  ppg: {
    team: "B",
    pace: "I",
    ppg:  "F",
    oppg: "G"   // <-- if OPP PPG is actually in I, change to "I"
  },

  // ATS tab
  ats: {
    team:   "A",
    record: "B",
    cover:  "C"
  },

  // O/U tab
  ou: {
    team:   "A",
    record: "B"
  },

  // Predictive rating tab
  ranking: {
    team:   "A",
    rating: "D"
  },

  // Names map: TR ↔ NBAstuffer team names
  names: {
    tr:   "A",
    nbas: "B"
  },

  // League averages tab
  league: {
    stat:  "A",
    value: "B"
  }
};

/* 3) MODEL WEIGHTS (TUNE THESE) ----------------------------- */

const W_LINEUP_PER   = 0.40; // lineup PER
const W_EFF_L5       = 0.20; // L5 off/def eff
const W_EFF_HA       = 0.15; // H/A eff
const W_PACE         = 0.18; // pace vs league
const W_PRED_RATING  = 0.08; // predictive rating
const W_LAST5_REC    = 0.02; // last-5 win%
const W_HOME_AWAY    = 0.02; // home/away win%
const B2B_PENALTY    = 1.0;  // B2B penalty (points)

/* 4) DOM IDS ------------------------------------------------ */

const DOM_IDS = {
  awayTeam:   "away-team",
  homeTeam:   "home-team",
  bookSpread: "book-spread",
  bookTotal:  "book-total",
  predictBtn: "predict-btn",

  awayB2B: "away-b2b",
  homeB2B: "home-b2b",

  awayLineup: {
    g1: "away-g1",
    g2: "away-g2",
    f1: "away-f1",
    f2: "away-f2",
    c:  "away-c"
  },
  homeLineup: {
    g1: "home-g1",
    g2: "home-g2",
    f1: "home-f1",
    f2: "home-f2",
    c:  "home-c"
  },

  awayLineupPer: "away-lineup-per",
  homeLineupPer: "home-lineup-per",

  awayLineupLabel: "away-lineup-team-label",
  homeLineupLabel: "home-lineup-team-label",

  awayScore:   "away-score",
  homeScore:   "home-score",
  winner:      "predicted-winner",
  awayWinProb: "away-win-prob",
  homeWinProb: "home-win-prob",
  modelTotal:  "model-total",
  totalPlay:   "total-play",
  modelSpread: "model-spread",
  spreadPlay:  "spread-play",

  statComparisonContainer: "stat-comparison",
  statTableBody:           "stat-compare-body",
  statAwayLabel:           "stat-away-label",
  statHomeLabel:           "stat-home-label",

  savedGamesBody: "saved-games-body",

  loadError: "global-error",
  playerDatalist: "players-list"
};

/* 5) STATE -------------------------------------------------- */

const S = {
  players:   [],
  playerMap: {},
  lineups:   {},
  teamStats: {},
  namesMap:  {},
  league:    {},
  loaded:    false
};

/* 6) UTILS -------------------------------------------------- */

function colIndex(letter) {
  if (!letter || letter === "null") return null;
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r/g, "").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(line.split(","));
  }
  return rows;
}

async function loadCSV(url) {
  if (!url) return [];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  const txt = await res.text();
  return parseCSV(txt);
}

function normalizeTeam(name) {
  return (name || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function safeFloat(v) {
  if (v == null) return NaN;
  const x = parseFloat(String(v).replace(/[^0-9.+-]/g, ""));
  return isNaN(x) ? NaN : x;
}
function fmtNum(x, d = 1) {
  return isNaN(x) ? "—" : x.toFixed(d);
}
function getEl(id) {
  return document.getElementById(id);
}

/* 7) BUILDERS ----------------------------------------------- */

function buildPlayerMap(rows) {
  const cfg = COLS.player;
  const idx = {
    player: colIndex(cfg.player),
    g:      colIndex(cfg.g),
    mp:     colIndex(cfg.mp),
    per:    colIndex(cfg.per),
    usg:    colIndex(cfg.usg)
  };
  const map = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = (row[idx.player] || "").trim();
    if (!name) continue;
    const g   = safeFloat(row[idx.g]);
    const mp  = safeFloat(row[idx.mp]);
    const per = safeFloat(row[idx.per]);
    const usg = safeFloat(row[idx.usg]);
    const mpPerGame = g > 0 ? mp / g : 0;
    map[name.toLowerCase()] = { name, g, mp, mpPerGame, per, usg };
  }
  return map;
}

function buildLineupMap(rows, cfg) {
  const ti = colIndex(cfg.team);
  const idx = {
    g1: colIndex(cfg.g1),
    g2: colIndex(cfg.g2),
    f1: colIndex(cfg.f1),
    f2: colIndex(cfg.f2),
    c:  colIndex(cfg.c)
  };
  const map = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const team = (row[ti] || "").trim();
    if (!team) continue;
    const key = normalizeTeam(team);
    map[key] = {
      team,
      g1: row[idx.g1] || "",
      g2: row[idx.g2] || "",
      f1: row[idx.f1] || "",
      f2: row[idx.f2] || "",
      c:  row[idx.c]  || ""
    };
  }
  return map;
}

function buildTeamMap(rows, cfg) {
  const idx = {};
  for (const k in cfg) idx[k] = colIndex(cfg[k]);
  const map = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawTeam = (idx.team != null ? row[idx.team] : "").trim();
    if (!rawTeam) continue;
    const key = normalizeTeam(rawTeam);
    const obj = {};
    for (const k in idx) {
      if (k === "team") continue;
      const i = idx[k];
      obj[k] = i == null ? null : row[i];
    }
    map[key] = obj;
  }
  return map;
}

function buildNameMap(rows, cfg) {
  const trIdx   = colIndex(cfg.tr);
  const nIdx    = colIndex(cfg.nbas);
  const map = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const tr   = (row[trIdx] || "").trim();
    const nbas = (row[nIdx]  || "").trim();
    if (!tr || !nbas) continue;
    map[normalizeTeam(tr)] = normalizeTeam(nbas);
  }
  return map;
}

function buildLeagueAverages(rows) {
  const statIdx = colIndex(COLS.league.stat);
  const valIdx  = colIndex(COLS.league.value);
  const map = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const stat  = (row[statIdx] || "").trim().toLowerCase();
    const value = safeFloat(row[valIdx]);
    if (!stat) continue;
    map[stat] = value;
  }
  map.points = map.points || map["points"] || 118;
  map.pace   = map.pace   || map["pace"]   || 100;
  return map;
}

function mapToNBAKey(teamName) {
  const trKey = normalizeTeam(teamName);
  const mapped = S.namesMap[trKey];
  return mapped || trKey;
}

/* 8) TEAM CONTEXT + STRENGTH -------------------------------- */

function getTeamContext(teamName, isHome) {
  const keyTR  = normalizeTeam(teamName);
  const keyNBA = mapToNBAKey(teamName);

  const nb = (S.teamStats.nbastuff || {})[keyNBA] || {};
  const pp = (S.teamStats.ppg      || {})[keyTR]  || {};
  const rk = (S.teamStats.ranking  || {})[keyTR]  || {};
  const at = (S.teamStats.ats      || {})[keyTR]  || {};
  const ou = (S.teamStats.ou       || {})[keyTR]  || {};

  const l5W = safeFloat(nb.l5W);
  const l5L = safeFloat(nb.l5L);
  const l5WinPct = (l5W + l5L) > 0 ? l5W / (l5W + l5L) : NaN;

  const homeW = safeFloat(nb.homeW);
  const homeL = safeFloat(nb.homeL);
  const homeWinPct = (homeW + homeL) > 0 ? homeW / (homeW + homeL) : NaN;

  const awayW = safeFloat(nb.awayW);
  const awayL = safeFloat(nb.awayL);
  const awayWinPct = (awayW + awayL) > 0 ? awayW / (awayW + awayL) : NaN;

  const offEffL5 = safeFloat(nb.offEffL5);
  const defEffL5 = safeFloat(nb.defEffL5);
  const offEffHA = safeFloat(isHome ? nb.offEffHome : nb.offEffAway);
  const defEffHA = safeFloat(isHome ? nb.defEffHome : nb.defEffAway);

  const paceSzn = safeFloat(pp.pace);
  const ppg     = safeFloat(pp.ppg);
  const oppg    = safeFloat(pp.oppg);

  const predRating = safeFloat(rk.rating);

  return {
    teamName,
    isHome,
    offEffL5,
    defEffL5,
    offEffHA,
    defEffHA,
    paceSzn,
    ppg,
    oppg,
    l5WinPct,
    homeWinPct,
    awayWinPct,
    predRating,
    atsRecord: at.record || "",
    ouRecord:  ou.record || ""
  };
}

function computeTeamStrength(ctx, lineupPER, isHome, isB2B) {
  const leaguePace = S.league.pace   || 100;
  const effL5Score = W_EFF_L5 * ((ctx.offEffL5 || 0) - (ctx.defEffL5 || 0));
  const effHAScore = W_EFF_HA * ((ctx.offEffHA || 0) - (ctx.defEffHA || 0));
  const paceScore  = W_PACE   * ((ctx.paceSzn || leaguePace) - leaguePace);
  const predScore  = W_PRED_RATING * (ctx.predRating || 0);

  const last5Score = W_LAST5_REC * (((ctx.l5WinPct || 0.5) - 0.5) * 10);

  const haWinPct = isHome ? ctx.homeWinPct : ctx.awayWinPct;
  const haScore  = W_HOME_AWAY * (((haWinPct || 0.5) - 0.5) * 10);

  const lineupScore = W_LINEUP_PER * (lineupPER || 0);
  const b2bPenalty  = isB2B ? B2B_PENALTY : 0;

  return lineupScore + effL5Score + effHAScore +
         paceScore + predScore + last5Score +
         haScore - b2bPenalty;
}

/* 9) LINEUP LOGIC ------------------------------------------- */

function getLineupNames(sideKey) {
  const ids = DOM_IDS[sideKey + "Lineup"];
  return [
    getEl(ids.g1).value.trim(),
    getEl(ids.g2).value.trim(),
    getEl(ids.f1).value.trim(),
    getEl(ids.f2).value.trim(),
    getEl(ids.c).value.trim()
  ].filter(Boolean);
}

function computeLineupPER(names) {
  let totalWeightedPER = 0;
  let totalWeight = 0;
  for (const name of names) {
    const p = S.playerMap[name.toLowerCase()];
    if (!p || isNaN(p.per)) continue;
    const mp  = p.mpPerGame || 0;
    const usg = isNaN(p.usg) ? 0 : p.usg;
    const weight = mp * (0.5 + 0.5 * (usg / 100));
    totalWeightedPER += p.per * weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0) return 0;
  return totalWeightedPER / totalWeight;
}

function applyDefaultLineup(sideKey, teamName) {
  const key = normalizeTeam(teamName);
  const lineup = S.lineups[key];
  if (!lineup) return;
  const ids = DOM_IDS[sideKey + "Lineup"];
  getEl(ids.g1).value = lineup.g1 || "";
  getEl(ids.g2).value = lineup.g2 || "";
  getEl(ids.f1).value = lineup.f1 || "";
  getEl(ids.f2).value = lineup.f2 || "";
  getEl(ids.c).value  = lineup.c  || "";

  const labelId = sideKey === "away"
    ? DOM_IDS.awayLineupLabel
    : DOM_IDS.homeLineupLabel;
  const labelEl = getEl(labelId);
  if (labelEl) labelEl.textContent = teamName || "—";
}

/* 10) STAT COMPARISON TABLE -------------------------------- */

function buildStatComparisonTable(awayCtx, homeCtx) {
  const tbody = getEl(DOM_IDS.statTableBody);
  if (!tbody) return;
  tbody.innerHTML = "";

  function addRow(label, aNum, hNum, fmt, higherIsBetter) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    const tdA = document.createElement("td");
    const tdH = document.createElement("td");

    tdLabel.textContent = label;
    tdA.textContent = fmt(aNum);
    tdH.textContent = fmt(hNum);

    if (higherIsBetter != null &&
        !isNaN(aNum) && !isNaN(hNum) &&
        aNum !== hNum) {
      const awayBetter = higherIsBetter ? aNum > hNum : aNum < hNum;
      if (awayBetter) {
        tdA.classList.add("stat-better");
      } else {
        tdH.classList.add("stat-better");
      }
    }

    tr.appendChild(tdLabel);
    tr.appendChild(tdA);
    tr.appendChild(tdH);
    tbody.appendChild(tr);
  }

  const fmtPct = v => isNaN(v) ? "—" : (v * 100).toFixed(1) + "%";

  // PPG / OPPG
  addRow("PPG",   awayCtx.ppg,  homeCtx.ppg,  v => fmtNum(v,1),  true);
  addRow("OPPG",  awayCtx.oppg, homeCtx.oppg, v => fmtNum(v,1),  false);

  // Last 5 win%
  addRow("Last 5 Win%", awayCtx.l5WinPct, homeCtx.l5WinPct, fmtPct, true);

  // Road / Home win%
  addRow("Road/Home Win%",
    awayCtx.awayWinPct,
    homeCtx.homeWinPct,
    fmtPct,
    true
  );

  // Off/Def Eff (L5)
  addRow("Off Eff (L5)", awayCtx.offEffL5, homeCtx.offEffL5, v => fmtNum(v,1), true);
  addRow("Def Eff (L5)", awayCtx.defEffL5, homeCtx.defEffL5, v => fmtNum(v,1), false);

  // Predictive Rating
  addRow("Pred Rating", awayCtx.predRating, homeCtx.predRating, v => fmtNum(v,2), true);

  // ATS / O/U text rows
  function addTextRow(label, aTxt, hTxt) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    const tdA = document.createElement("td");
    const tdH = document.createElement("td");
    tdLabel.textContent = label;
    tdA.textContent = aTxt || "—";
    tdH.textContent = hTxt || "—";
    tr.appendChild(tdLabel);
    tr.appendChild(tdA);
    tr.appendChild(tdH);
    tbody.appendChild(tr);
  }

  addTextRow("ATS Record", awayCtx.atsRecord, homeCtx.atsRecord);
  addTextRow("O/U Record", awayCtx.ouRecord,  homeCtx.ouRecord);
}

function showStatComparison() {
  if (!S.loaded) return;
  const awayTeamEl = getEl(DOM_IDS.awayTeam);
  const homeTeamEl = getEl(DOM_IDS.homeTeam);
  if (!awayTeamEl || !homeTeamEl) return;
  const awayTeam = awayTeamEl.value;
  const homeTeam = homeTeamEl.value;
  if (!awayTeam || !homeTeam || awayTeam === homeTeam) return;

  const awayCtx = getTeamContext(awayTeam, false);
  const homeCtx = getTeamContext(homeTeam, true);

  const awayLabelEl = getEl(DOM_IDS.statAwayLabel);
  const homeLabelEl = getEl(DOM_IDS.statHomeLabel);
  if (awayLabelEl) awayLabelEl.textContent = awayTeam || "Away";
  if (homeLabelEl) homeLabelEl.textContent = homeTeam || "Home";

  buildStatComparisonTable(awayCtx, homeCtx);

  const container = getEl(DOM_IDS.statComparisonContainer);
  if (container) container.style.display = "block";
}

/* 11) PREDICTION + SAVE GAME -------------------------------- */

function predictGame() {
  if (!S.loaded) return;
  const awayTeamEl = getEl(DOM_IDS.awayTeam);
  const homeTeamEl = getEl(DOM_IDS.homeTeam);
  const awayTeam = awayTeamEl.value;
  const homeTeam = homeTeamEl.value;
  if (!awayTeam || !homeTeam || awayTeam === homeTeam) return;

  const awayNames = getLineupNames("away");
  const homeNames = getLineupNames("home");
  const awayPER   = computeLineupPER(awayNames);
  const homePER   = computeLineupPER(homeNames);

  const awayPerEl = getEl(DOM_IDS.awayLineupPer);
  const homePerEl = getEl(DOM_IDS.homeLineupPer);
  if (awayPerEl) awayPerEl.textContent = fmtNum(awayPER,2);
  if (homePerEl) homePerEl.textContent = fmtNum(homePER,2);

  const awayCtx = getTeamContext(awayTeam, false);
  const homeCtx = getTeamContext(homeTeam, true);

  const awayB2B = getEl(DOM_IDS.awayB2B)?.checked || false;
  const homeB2B = getEl(DOM_IDS.homeB2B)?.checked || false;

  const awayStr = computeTeamStrength(awayCtx, awayPER, false, awayB2B);
  const homeStr = computeTeamStrength(homeCtx, homePER, true,  homeB2B);

  const marginAway = awayStr - homeStr;
  const baseTotal = (
    (awayCtx.ppg || S.league.points / 2) +
    (homeCtx.ppg || S.league.points / 2)
  ) / 2;

  let awayScore = baseTotal + marginAway / 2;
  let homeScore = baseTotal - marginAway / 2;

  awayScore = Math.max(70, Math.min(150, awayScore));
  homeScore = Math.max(70, Math.min(150, homeScore));

  const k = 6;
  const probAway = 1 / (1 + Math.exp(-marginAway / k));
  const probHome = 1 - probAway;

  const bookSpread = parseFloat(getEl(DOM_IDS.bookSpread).value || "0");
  const bookTotal  = parseFloat(getEl(DOM_IDS.bookTotal).value || "0");

  const modelSpread = homeScore - awayScore; // home - away
  const modelTotal  = homeScore + awayScore;

  let spreadPlay = "NO BET";
  if (!isNaN(bookSpread)) {
    const diff = modelSpread - bookSpread;
    if (diff > 1.5) spreadPlay = `Bet Home`;
    else if (diff < -1.5) spreadPlay = `Bet Away`;
  }

  let totalPlay = "NO BET";
  if (!isNaN(bookTotal)) {
    const diffT = modelTotal - bookTotal;
    if (diffT > 8) totalPlay = "BET OVER";
    else if (diffT < -8) totalPlay = "BET UNDER";
  }

  // fill outputs
  getEl(DOM_IDS.awayScore).textContent = fmtNum(awayScore,1);
  getEl(DOM_IDS.homeScore).textContent = fmtNum(homeScore,1);
  getEl(DOM_IDS.winner).textContent =
    awayScore > homeScore ? awayTeam : homeTeam;

  getEl(DOM_IDS.awayWinProb).textContent = (probAway*100).toFixed(1) + "%";
  getEl(DOM_IDS.homeWinProb).textContent = (probHome*100).toFixed(1) + "%";

  getEl(DOM_IDS.modelTotal).textContent  = fmtNum(modelTotal,1);
  getEl(DOM_IDS.totalPlay).textContent   = totalPlay;
  getEl(DOM_IDS.modelSpread).textContent = fmtNum(modelSpread,1);
  getEl(DOM_IDS.spreadPlay).textContent  = spreadPlay;
}

function saveGameToTable() {
  const body = getEl(DOM_IDS.savedGamesBody);
  if (!body) return;

  const awayTeam = getEl(DOM_IDS.awayTeam)?.value || "";
  const homeTeam = getEl(DOM_IDS.homeTeam)?.value || "";
  if (!awayTeam || !homeTeam || awayTeam === homeTeam) return;

  const awayScore = getEl(DOM_IDS.awayScore)?.textContent || "—";
  const homeScore = getEl(DOM_IDS.homeScore)?.textContent || "—";
  const modelTotal = getEl(DOM_IDS.modelTotal)?.textContent || "—";
  const totalPlay  = getEl(DOM_IDS.totalPlay)?.textContent || "—";
  const modelSpread = getEl(DOM_IDS.modelSpread)?.textContent || "—";
  const spreadPlay  = getEl(DOM_IDS.spreadPlay)?.textContent || "—";
  const bookTotal   = getEl(DOM_IDS.bookTotal)?.value || "";
  const bookSpread  = getEl(DOM_IDS.bookSpread)?.value || "";

  const tr = document.createElement("tr");
  function td(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
  }

  const matchup = `${awayTeam} @ ${homeTeam}`;
  const scoreStr = `${awayScore} - ${homeScore}`;

  tr.appendChild(td(matchup));
  tr.appendChild(td(scoreStr));
  tr.appendChild(td(modelTotal));
  tr.appendChild(td(bookTotal));
  tr.appendChild(td(totalPlay));
  tr.appendChild(td(modelSpread));
  tr.appendChild(td(bookSpread));
  tr.appendChild(td(spreadPlay));

  body.appendChild(tr);
}

/* 12) UI INIT ----------------------------------------------- */

function initTeamDropdowns() {
  const teams = Object.values(S.lineups).map(l => l.team).sort();
  const awaySel = getEl(DOM_IDS.awayTeam);
  const homeSel = getEl(DOM_IDS.homeTeam);
  if (!awaySel || !homeSel) return;

  awaySel.innerHTML = "";
  homeSel.innerHTML = "";

  const mkBlank = () => {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Select team…";
    return opt;
  };
  awaySel.appendChild(mkBlank());
  homeSel.appendChild(mkBlank());

  for (const t of teams) {
    const oA = document.createElement("option");
    const oH = document.createElement("option");
    oA.value = oH.value = t;
    oA.textContent = oH.textContent = t;
    awaySel.appendChild(oA);
    homeSel.appendChild(oH);
  }

  awaySel.addEventListener("change", () => {
    applyDefaultLineup("away", awaySel.value);
    predictGame();
  });
  homeSel.addEventListener("change", () => {
    applyDefaultLineup("home", homeSel.value);
    predictGame();
  });
}

function initPlayerDatalist() {
  const dl = getEl(DOM_IDS.playerDatalist);
  if (!dl) return;
  dl.innerHTML = "";
  const names = Object.values(S.playerMap).map(p => p.name).sort();
  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    dl.appendChild(opt);
  }

  // When player inputs change, recompute lineup PER & prediction
  const inputs = document.querySelectorAll(".player-input");
  inputs.forEach(inp => {
    inp.addEventListener("change", () => predictGame());
  });
}

/* 13) LOAD ALL CSVs ----------------------------------------- */

async function loadAll() {
  try {
    const [
      playerRows,
      lineupRows,
      leagueRows,
      orebRows,
      orebOppRows,
      drebRows,
      drebOppRows,
      nbastRows,
      ppgRows,
      atsRows,
      ouRows,
      rankRows,
      namesRows
    ] = await Promise.all([
      loadCSV(PLAYER_URL),
      loadCSV(LINEUPS_URL),
      loadCSV(LEAGUE_URL),
      loadCSV(OREB_URL),
      loadCSV(OPP_OREB_URL),
      loadCSV(DREB_URL),
      loadCSV(OPP_DREB_URL),
      loadCSV(NBASTUFF_URL),
      loadCSV(PPG_URL),
      loadCSV(ATS_URL),
      loadCSV(OU_URL),
      loadCSV(RANK_URL),
      loadCSV(NAMES_URL)
    ]);

    S.players   = playerRows;
    S.playerMap = buildPlayerMap(playerRows);
    S.lineups   = buildLineupMap(lineupRows, COLS.lineups);
    S.league    = buildLeagueAverages(leagueRows);
    S.teamStats = {
      oreb:     buildTeamMap(orebRows,     COLS.oreb),
      orebOpp:  buildTeamMap(orebOppRows,  COLS.orebOpp),
      dreb:     buildTeamMap(drebRows,     COLS.dreb),
      drebOpp:  buildTeamMap(drebOppRows,  COLS.drebOpp),
      nbastuff: buildTeamMap(nbastRows,   COLS.nbastuff),
      ppg:      buildTeamMap(ppgRows,     COLS.ppg),
      ats:      buildTeamMap(atsRows,     COLS.ats),
      ou:       buildTeamMap(ouRows,      COLS.ou),
      ranking:  buildTeamMap(rankRows,    COLS.ranking)
    };
    S.namesMap  = buildNameMap(namesRows, COLS.names);
    S.loaded    = true;

    initTeamDropdowns();
    initPlayerDatalist();

    // buttons
    const predictBtn = getEl(DOM_IDS.predictBtn);
    if (predictBtn) {
      predictBtn.addEventListener("click", (e) => {
        e.preventDefault();
        predictGame();
      });
    }
    const compareBtn = getEl("compare-btn");
    if (compareBtn) {
      compareBtn.addEventListener("click", (e) => {
        e.preventDefault();
        showStatComparison();
      });
    }
    const saveGameBtn = getEl("save-game-btn");
    if (saveGameBtn) {
      saveGameBtn.addEventListener("click", (e) => {
        e.preventDefault();
        saveGameToTable();
      });
    }

    const loadError = getEl(DOM_IDS.loadError);
    if (loadError) loadError.textContent = "";
  } catch (err) {
    console.error("Load error", err);
    const loadError = getEl(DOM_IDS.loadError);
    if (loadError) {
      loadError.textContent =
        "Load error — check CSV links and sharing (must be public output=csv).";
    }
  }
}

/* 14) BOOT -------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  loadAll();
});
