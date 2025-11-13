/* ===========================================================
   NBA LINEUP-BASED MODEL - app.js
   - Pure client-side JS, works on Vercel as static site
   - Uses ONLY column letters; Sheets headers don't matter
   =========================================================== */

/* 1) CSV URLS ------------------------------------------------
   (Paste your real published CSV links below)
*/

const PLAYER_URL   = "PASTE_PLAYER_CSV_HERE";     // Player PER/USG, etc.
const LINEUPS_URL  = "PASTE_LINEUPS_CSV_HERE";    // Team lineups
const LEAGUE_URL   = "PASTE_LEAGUE_AVG_CSV_HERE"; // League averages

// Rebounding (TeamRankings)
const OREB_URL      = "PASTE_OREB_CSV_HERE";
const OPP_OREB_URL  = "PASTE_OPP_OREB_CSV_HERE";
const DREB_URL      = "PASTE_DREB_CSV_HERE";
const OPP_DREB_URL  = "PASTE_OPP_DREB_CSV_HERE";

// NBAstuffer + extras
const NBASTUFF_URL  = "PASTE_NBASTUFFER_L5_HA_CSV_HERE";
const PPG_URL       = "PASTE_PPG_CSV_HERE";       // Season PPG/OPPG/Pace
const ATS_URL       = "PASTE_ATS_CSV_HERE";       // ATS record
const OU_URL        = "PASTE_OU_CSV_HERE";        // Over/Under record
const RANK_URL      = "PASTE_RANKING_CSV_HERE";   // Predictive rating
const NAMES_URL     = "PASTE_NAMES_CSV_HERE";     // TR name ↔ NBAstuffer name

/* 2) COLUMN LETTER MAP (no headers required) ---------------- */

const COLS = {
  // Player stats tab
  player: {
    team:   "null",   // no team column used
    player: "B",
    g:      "F",      // games
    mp:     "H",      // total minutes
    per:    "I",      // PER
    usg:    "T"       // usage %
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

  // TeamRankings rebounding tabs
  oreb: {
    team: "B",   // Team
    haf:  "F",   // Home/Away Off Reb% (H/A)
    haG:  "G",   // (optional) extra H/A col
    l3:   "D"    // Last 3 Off Reb%
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

  // NBAstuffer L5 + H/A Off/Def Eff + records (adjust letters to your sheet)
  nbastuff: {
    team:        "B",
    offEffL5:    "J",
    defEffL5:    "K",
    paceL5:      "I",   // if present; else leave as "null"
    offEffHome:  "AA",
    defEffHome:  "AB",
    offEffAway:  "AI",
    defEffAway:  "AJ",
    l5W:         "W",
    l5L:         "S",
    homeW:       "AR",
    homeL:       "AS",
    awayW:       "BP",
    awayL:       "BQ"
  },

  // Season PPG tab (TR)
  ppg: {
    team: "B",
    pace: "F",
    ppg:  "G",
    oppg: "H"
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

  // Names mapping tab: TR name ↔ NBAstuffer name
  names: {
    tr:   "A",
    nbas: "B"
  },

  // League averages tab (simple: name + value)
  league: {
    stat:  "A",
    value: "B"
  }
};

/* 3) MODEL WEIGHTS (tune these) ------------------------------ */

const W_LINEUP_PER   = 0.45; // lineup PER influence
const W_EFF_L5       = 0.20; // last-5 off/def efficiency
const W_EFF_HA       = 0.15; // home/away efficiency
const W_PACE         = 0.10; // pace vs league
const W_PRED_RATING  = 0.08; // predictive rating
const W_LAST5_REC    = 0.02; // last-5 win% bump
const W_HOME_AWAY    = 0.02; // home/away win% bump
const B2B_PENALTY    = 1.0;  // points to subtract for back-to-back

/* 4) DOM ELEMENT IDS (change here if your HTML differs) ------ */

const DOM_IDS = {
  awayTeam:   "away-team",
  homeTeam:   "home-team",
  bookSpread: "book-spread",
  bookTotal:  "book-total",
  predictBtn: "predict-btn",

  awayB2B: "away-b2b",
  homeB2B: "home-b2b",

  // Lineup selects
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

  // Output fields
  awayScore:   "away-score",
  homeScore:   "home-score",
  winner:      "predicted-winner",
  awayWinProb: "away-win-prob",
  homeWinProb: "home-win-prob",
  modelTotal:  "model-total",
  totalPlay:   "total-play",
  modelSpread: "model-spread",
  spreadPlay:  "spread-play",

  // Stat comparison table body
  statTableBody: "stat-table-body",

  loadError: "load-error"
};

/* 5) GLOBAL STATE -------------------------------------------- */

const S = {
  players:   [],     // raw player rows
  lineups:   {},     // team -> default lineup
  playerMap: {},     // player name -> stats
  teamStats: {},     // various team maps
  namesMap: {},      // TR name -> NBAstuffer name
  league:   {},      // league averages
  loaded:   false
};

/* 6) UTILITIES ----------------------------------------------- */

function colLetterToIndex(letter) {
  if (!letter || letter === "null") return null;
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r/g, "").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    // simple split, handles basic CSV; your data is simple
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

function formatNumber(x, decimals = 1) {
  if (isNaN(x)) return "—";
  return x.toFixed(decimals);
}

function getEl(id) {
  return document.getElementById(id);
}

/* 7) BUILDERS ------------------------------------------------ */

function buildPlayerMap(rows) {
  const cfg = COLS.player;
  const idx = {
    player: colLetterToIndex(cfg.player),
    g:      colLetterToIndex(cfg.g),
    mp:     colLetterToIndex(cfg.mp),
    per:    colLetterToIndex(cfg.per),
    usg:    colLetterToIndex(cfg.usg)
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

    map[name.toLowerCase()] = {
      name,
      g,
      mp,
      mpPerGame,
      per,
      usg
    };
  }
  return map;
}

function buildLineupMap(rows, cfg) {
  const idxTeam = colLetterToIndex(cfg.team);
  const idx = {
    g1: colLetterToIndex(cfg.g1),
    g2: colLetterToIndex(cfg.g2),
    f1: colLetterToIndex(cfg.f1),
    f2: colLetterToIndex(cfg.f2),
    c:  colLetterToIndex(cfg.c)
  };

  const map = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const team = (row[idxTeam] || "").trim();
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
  for (const k in cfg) idx[k] = colLetterToIndex(cfg[k]);

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
  const trIdx   = colLetterToIndex(cfg.tr);
  const nbasIdx = colLetterToIndex(cfg.nbas);
  const map = {};

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const tr   = (row[trIdx]   || "").trim();
    const nbas = (row[nbasIdx] || "").trim();
    if (!tr || !nbas) continue;
    map[normalizeTeam(tr)] = normalizeTeam(nbas);
  }
  return map;
}

function buildLeagueAverages(rows) {
  const statIdx  = colLetterToIndex(COLS.league.stat);
  const valIdx   = colLetterToIndex(COLS.league.value);
  const map = {};

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const stat  = (row[statIdx] || "").trim().toLowerCase();
    const value = safeFloat(row[valIdx]);
    if (!stat) continue;
    map[stat] = value;
  }
  // convenient aliases
  map.points = map.points || map["points"] || 118;
  map.pace   = map.pace   || map["pace"]   || 100;
  return map;
}

function mapToNBAStuffKey(teamName) {
  const trKey  = normalizeTeam(teamName);
  const mapped = S.namesMap[trKey];
  return mapped || trKey;
}

/* 8) TEAM CONTEXT & STRENGTH -------------------------------- */

function getTeamContext(teamName, isHome) {
  const keyTR  = normalizeTeam(teamName);
  const keyNBA = mapToNBAStuffKey(teamName);

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

  const offEffL5  = safeFloat(nb.offEffL5);
  const defEffL5  = safeFloat(nb.defEffL5);
  const offEffHA  = safeFloat(isHome ? nb.offEffHome : nb.offEffAway);
  const defEffHA  = safeFloat(isHome ? nb.defEffHome : nb.defEffAway);

  const paceSzn   = safeFloat(pp.pace);
  const ppg       = safeFloat(pp.ppg);
  const oppg      = safeFloat(pp.oppg);

  const predRating = safeFloat(rk.rating);

  return {
    teamName,
    keyTR,
    keyNBA,
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
    ouRecord:  ou.record  || ""
  };
}

function computeTeamStrength(ctx, lineupPERAdj, isHome, isB2B) {
  const leaguePace = S.league.pace   || 100;
  const leaguePts  = S.league.points || 118;

  const effL5Score =
    W_EFF_L5 * ((ctx.offEffL5 || 0) - (ctx.defEffL5 || 0));

  const effHAScore =
    W_EFF_HA * ((ctx.offEffHA || 0) - (ctx.defEffHA || 0));

  const paceScore =
    W_PACE * ((ctx.paceSzn || leaguePace) - leaguePace);

  const predScore =
    W_PRED_RATING * (ctx.predRating || 0);

  const last5Score =
    W_LAST5_REC * (((ctx.l5WinPct || 0.5) - 0.5) * 10);

  const haWinPct = isHome ? ctx.homeWinPct : ctx.awayWinPct;
  const haScore =
    W_HOME_AWAY * (((haWinPct || 0.5) - 0.5) * 10);

  const lineupScore =
    W_LINEUP_PER * (lineupPERAdj || 0);

  const b2bPenalty = isB2B ? B2B_PENALTY : 0;

  return lineupScore + effL5Score + effHAScore + paceScore +
         predScore + last5Score + haScore - b2bPenalty;
}

/* 9) LINEUP SCORING ------------------------------------------ */

function getLineupFromInputs(sideKey) {
  const ids = DOM_IDS[sideKey + "Lineup"];
  const g1 = getEl(ids.g1).value.trim();
  const g2 = getEl(ids.g2).value.trim();
  const f1 = getEl(ids.f1).value.trim();
  const f2 = getEl(ids.f2).value.trim();
  const c  = getEl(ids.c).value.trim();
  return [g1, g2, f1, f2, c].filter(Boolean);
}

function computeLineupPER(lineupNames) {
  let totalWeightedPER = 0;
  let totalWeight = 0;

  for (const name of lineupNames) {
    const p = S.playerMap[name.toLowerCase()];
    if (!p || isNaN(p.per)) continue;
    const mp = p.mpPerGame || 0;
    const usg = isNaN(p.usg) ? 0 : p.usg;

    // weight by minutes with a small boost from usage
    const weight = mp * (0.5 + 0.5 * (usg / 100));
    totalWeightedPER += p.per * weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0) return 0;
  return totalWeightedPER / totalWeight;
}

/* 10) STAT COMPARISON TABLE --------------------------------- */

function buildStatComparisonTable(awayCtx, homeCtx) {
  const tbody = getEl(DOM_IDS.statTableBody);
  if (!tbody) return;
  tbody.innerHTML = "";

  function addRow(label, awayVal, homeVal, higherIsBetter) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    const tdAway  = document.createElement("td");
    const tdHome  = document.createElement("td");

    tdLabel.textContent = label;
    tdAway.textContent  = awayVal;
    tdHome.textContent  = homeVal;

    if (higherIsBetter != null) {
      const aNum = parseFloat(awayVal);
      const hNum = parseFloat(homeVal);
      if (!isNaN(aNum) && !isNaN(hNum) && aNum !== hNum) {
        if ((higherIsBetter && aNum > hNum) ||
            (!higherIsBetter && aNum < hNum)) {
          tdAway.classList.add("stat-better");
        } else {
          tdHome.classList.add("stat-better");
        }
      }
    }

    tr.appendChild(tdLabel);
    tr.appendChild(tdAway);
    tr.appendChild(tdHome);
    tbody.appendChild(tr);
  }

  // PPG / OPPG
  addRow("PPG",
    formatNumber(awayCtx.ppg),
    formatNumber(homeCtx.ppg),
    true
  );
  addRow("OPPG",
    formatNumber(awayCtx.oppg),
    formatNumber(homeCtx.oppg),
    false
  );

  // L5 & Home/Away win%
  const l5Away = isNaN(awayCtx.l5WinPct) ? "—" :
                 (awayCtx.l5WinPct * 100).toFixed(1) + "%";
  const l5Home = isNaN(homeCtx.l5WinPct) ? "—" :
                 (homeCtx.l5WinPct * 100).toFixed(1) + "%";
  addRow("Last 5 Win%",
    l5Away,
    l5Home,
    true
  );

  const haAway = isNaN(awayCtx.awayWinPct) ? "—" :
                 (awayCtx.awayWinPct * 100).toFixed(1) + "%";
  const haHome = isNaN(homeCtx.homeWinPct) ? "—" :
                 (homeCtx.homeWinPct * 100).toFixed(1) + "%";
  addRow("Road/Home Win%",
    haAway,
    haHome,
    true
  );

  // Off/Def Eff
  addRow("Off Eff (L5)",
    formatNumber(awayCtx.offEffL5),
    formatNumber(homeCtx.offEffL5),
    true
  );
  addRow("Def Eff (L5)",
    formatNumber(awayCtx.defEffL5),
    formatNumber(homeCtx.defEffL5),
    false
  );

  // Predictive rating
  addRow("Pred Rating",
    formatNumber(awayCtx.predRating, 2),
    formatNumber(homeCtx.predRating, 2),
    true
  );

  // Records as text
  addRow("ATS Record",
    awayCtx.atsRecord || "—",
    homeCtx.atsRecord || "—",
    null
  );
  addRow("O/U Record",
    awayCtx.ouRecord || "—",
    homeCtx.ouRecord || "—",
    null
  );
}

/* 11) PREDICTION PIPELINE ----------------------------------- */

function predictGame() {
  if (!S.loaded) return;

  const awayTeamSel = getEl(DOM_IDS.awayTeam);
  const homeTeamSel = getEl(DOM_IDS.homeTeam);
  const awayTeam = awayTeamSel.value;
  const homeTeam = homeTeamSel.value;
  if (!awayTeam || !homeTeam || awayTeam === homeTeam) return;

  // Lineups
  const awayLineupNames = getLineupFromInputs("away");
  const homeLineupNames = getLineupFromInputs("home");
  const awayLineupPER   = computeLineupPER(awayLineupNames);
  const homeLineupPER   = computeLineupPER(homeLineupNames);

  const awayPerEl = getEl(DOM_IDS.awayLineupPer);
  const homePerEl = getEl(DOM_IDS.homeLineupPer);
  if (awayPerEl) awayPerEl.textContent = formatNumber(awayLineupPER, 2);
  if (homePerEl) homePerEl.textContent = formatNumber(homeLineupPER, 2);

  // Contexts
  const awayCtx = getTeamContext(awayTeam, false);
  const homeCtx = getTeamContext(homeTeam, true);

  const awayB2B = getEl(DOM_IDS.awayB2B)?.checked || false;
  const homeB2B = getEl(DOM_IDS.homeB2B)?.checked || false;

  const awayStrength = computeTeamStrength(
    awayCtx, awayLineupPER, false, awayB2B
  );
  const homeStrength = computeTeamStrength(
    homeCtx, homeLineupPER, true, homeB2B
  );

  const marginAwayMinusHome = awayStrength - homeStrength;

  // Base total -> use PPG & league as fallback
  const baseTotal = (
    (awayCtx.ppg || S.league.points / 2) +
    (homeCtx.ppg || S.league.points / 2)
  ) / 2;

  const awayScore = baseTotal + marginAwayMinusHome / 2;
  const homeScore = baseTotal - marginAwayMinusHome / 2;

  // Clamp scores to a sane range
  const awayScoreClamped = Math.max(70, Math.min(150, awayScore));
  const homeScoreClamped = Math.max(70, Math.min(150, homeScore));

  // Win probability (logistic on margin)
  const k = 6; // scaling
  const probAway = 1 / (1 + Math.exp(-marginAwayMinusHome / k));
  const probHome = 1 - probAway;

  // Book numbers
  const bookSpread = parseFloat(getEl(DOM_IDS.bookSpread).value || "0"); // home = -
  const bookTotal  = parseFloat(getEl(DOM_IDS.bookTotal).value || "0");

  const modelSpread = homeScoreClamped - awayScoreClamped; // home - away
  const modelTotal  = awayScoreClamped + homeScoreClamped;

  // Decide plays
  let spreadPlay = "NO BET";
  if (!isNaN(bookSpread)) {
    const diff = modelSpread - bookSpread;
    if (diff > 1.5) spreadPlay = `Bet Home ${modelSpread.toFixed(1)}`;
    else if (diff < -1.5) spreadPlay = `Bet Away ${(-modelSpread).toFixed(1)}`;
  }

  let totalPlay = "NO BET";
  if (!isNaN(bookTotal)) {
    const diffT = modelTotal - bookTotal;
    if (diffT > 8) totalPlay = "BET OVER";
    else if (diffT < -8) totalPlay = "BET UNDER";
  }

  // Write outputs
  const awayScoreEl = getEl(DOM_IDS.awayScore);
  const homeScoreEl = getEl(DOM_IDS.homeScore);
  const winnerEl    = getEl(DOM_IDS.winner);
  const awayProbEl  = getEl(DOM_IDS.awayWinProb);
  const homeProbEl  = getEl(DOM_IDS.homeWinProb);
  const modelTotEl  = getEl(DOM_IDS.modelTotal);
  const totalPlayEl = getEl(DOM_IDS.totalPlay);
  const modelSprEl  = getEl(DOM_IDS.modelSpread);
  const spreadPlayEl= getEl(DOM_IDS.spreadPlay);

  if (awayScoreEl) awayScoreEl.textContent = formatNumber(awayScoreClamped, 1);
  if (homeScoreEl) homeScoreEl.textContent = formatNumber(homeScoreClamped, 1);

  const winnerName = awayScoreClamped > homeScoreClamped ? awayTeam : homeTeam;
  if (winnerEl) winnerEl.textContent = winnerName;

  if (awayProbEl) awayProbEl.textContent = (probAway * 100).toFixed(1) + "%";
  if (homeProbEl) homeProbEl.textContent = (probHome * 100).toFixed(1) + "%";

  if (modelTotEl)  modelTotEl.textContent  = formatNumber(modelTotal, 1);
  if (totalPlayEl) totalPlayEl.textContent = totalPlay;

  if (modelSprEl)  modelSprEl.textContent  = formatNumber(modelSpread, 1);
  if (spreadPlayEl)spreadPlayEl.textContent= spreadPlay;

  // Stat comparison table
  buildStatComparisonTable(awayCtx, homeCtx);
}

/* 12) UI INIT ------------------------------------------------ */

function initTeamDropdowns() {
  const teams = Object.values(S.lineups).map(l => l.team).sort();
  const awaySel = getEl(DOM_IDS.awayTeam);
  const homeSel = getEl(DOM_IDS.homeTeam);
  if (!awaySel || !homeSel) return;

  awaySel.innerHTML = "";
  homeSel.innerHTML = "";

  const blankOpt1 = document.createElement("option");
  blankOpt1.value = "";
  blankOpt1.textContent = "Select team…";
  const blankOpt2 = blankOpt1.cloneNode(true);
  awaySel.appendChild(blankOpt1);
  homeSel.appendChild(blankOpt2);

  for (const t of teams) {
    const optA = document.createElement("option");
    const optH = document.createElement("option");
    optA.value = optH.value = t;
    optA.textContent = optH.textContent = t;
    awaySel.appendChild(optA);
    homeSel.appendChild(optH);
  }

  awaySel.addEventListener("change", () => {
    applyDefaultLineup("away", awaySel.value);
  });
  homeSel.addEventListener("change", () => {
    applyDefaultLineup("home", homeSel.value);
  });
}

function initLineupDropdowns() {
  // Build list of all player names for dropdowns (optional; you already had this)
  const allNames = Object.values(S.playerMap).map(p => p.name).sort();

  function fillSelect(id) {
    const sel = getEl(id);
    if (!sel) return;
    sel.innerHTML = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "";
    sel.appendChild(blank);
    for (const name of allNames) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    }
  }

  const awayIds = DOM_IDS.awayLineup;
  const homeIds = DOM_IDS.homeLineup;
  for (const key in awayIds) fillSelect(awayIds[key]);
  for (const key in homeIds) fillSelect(homeIds[key]);
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

  predictGame(); // auto-update when lineups change
}

/* 13) LOAD ALL CSVs ----------------------------------------- */

async function loadAll() {
  try {
    const [
      playerRows,
      lineupRows,
      leagueRows,
      orebRows,
      oppOrebRows,
      drebRows,
      oppDrebRows,
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

    S.teamStats = {
      oreb:     buildTeamMap(orebRows,    COLS.oreb),
      orebOpp:  buildTeamMap(oppOrebRows, COLS.orebOpp),
      dreb:     buildTeamMap(drebRows,    COLS.dreb),
      drebOpp:  buildTeamMap(oppDrebRows, COLS.drebOpp),
      nbastuff: buildTeamMap(nbastRows,  COLS.nbastuff),
      ppg:      buildTeamMap(ppgRows,    COLS.ppg),
      ats:      buildTeamMap(atsRows,    COLS.ats),
      ou:       buildTeamMap(ouRows,     COLS.ou),
      ranking:  buildTeamMap(rankRows,   COLS.ranking)
    };

    S.namesMap = buildNameMap(namesRows, COLS.names);
    S.league   = buildLeagueAverages(leagueRows);
    S.loaded   = true;

    initTeamDropdowns();
    initLineupDropdowns();

    const predictBtn = getEl(DOM_IDS.predictBtn);
    if (predictBtn) {
      predictBtn.addEventListener("click", (e) => {
        e.preventDefault();
        predictGame();
      });
    }

    const loadError = getEl(DOM_IDS.loadError);
    if (loadError) loadError.textContent = "";
  } catch (err) {
    console.error("Load error", err);
    const loadError = getEl(DOM_IDS.loadError);
    if (loadError) {
      loadError.textContent = "Load error — check CSV links/permissions in app.js";
    }
  }
}

/* 14) BOOT --------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  loadAll();
});
