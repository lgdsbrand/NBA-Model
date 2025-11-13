/****************************************************
 * NBA Lineup Model - Static JS Version
 ****************************************************/

/* 1) PASTE YOUR CSV LINKS */
const PLAYER_URL      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=2033299676&single=true&output=csv";
const LINEUPS_URL    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=975459408&single=true&output=csv";
const OEFF_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1030421164&single=true&output=csv";
const DEFF_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1401009495&single=true&output=csv";
const PACE_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1579578655&single=true&output=csv";
const OREB_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1907720061&single=true&output=csv";
const OPP_OREB_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1902898168&single=true&output=csv";
const DREB_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=957131207&single=true&output=csv";
const OPP_DREB_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=32364573&single=true&output=csv";
const LEAGUE_URL     = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1422185850&single=true&output=csv";

/* 2) COLUMN LETTER MAP */
const COLS = {
  player: { team: "null", player: "B", g: "F", mp: "H", per: "I", usg: "T" },
  lineups: { team: "A", g1: "B", g2: "C", f1: "D", f2: "E", c: "F" },
  oreb:  { team: "B", haF: "F", haG: "G", l3: "D" },
  dreb:  { team: "B", haF: "F", haG: "G", l3: "D" },
  oeff:  { team: "B", haF: "F", haG: "G", l3: "D" },
  deff:  { team: "B", haF: "F", haG: "G", l3: "D" },
  ooreb: { team: "B", season: "C", l3: "D" },
  odreb: { team: "B", season: "C", l3: "D" },
  pace:  { team: "B", haF: "F", haG: "G" }
};

/* 3) MODEL WEIGHTS */
const BLEND_SZN   = 0.7;
const PER_K       = 0.06;
const REB_K       = 0.25;
const HCA_PTS     = 2.0;
const B2B_PENALTY = 1.0;
const WIN_SIGMA   = 6.5;

/*******************  HELPERS  *********************/
function colLetterToIdx(L) {
  if (!L || L === "null") return -1;
  L = L.trim().toUpperCase();
  let v = 0;
  for (const ch of L) v = v * 26 + (ch.charCodeAt(0) - 65 + 1);
  return v - 1;
}

function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (let line of lines) {
    if (!line.trim()) continue;
    rows.push(line.split(","));
  }
  return rows;
}

async function loadCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed CSV " + url + " " + res.status);
  const text = await res.text();
  return parseCSV(text);
}

function hardTrim(s) {
  if (s == null) return "";
  return String(s)
    .replace(/\uFEFF/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toFloat(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  let s = String(v).trim().replace(/,/g, "");
  if (!s) return NaN;
  if (s.endsWith("%")) {
    const n = parseFloat(s.slice(0, -1));
    return isNaN(n) ? NaN : n / 100;
  }
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

function safe(v, d) {
  const n = toFloat(v);
  return isNaN(n) ? d : n;
}

function blend(a, b) {
  const A = toFloat(a);
  const B = toFloat(b);
  if (isNaN(A) && isNaN(B)) return NaN;
  if (isNaN(A)) return B;
  if (isNaN(B)) return A;
  return BLEND_SZN * A + (1 - BLEND_SZN) * B;
}

function minutesPerGame(mp, games) {
  const g = toFloat(games);
  const m = toFloat(mp);
  return g > 0 ? m / g : NaN;
}

function usageAdjPER(per, usg, base = 20) {
  const p = toFloat(per);
  const u = toFloat(usg);
  if (isNaN(p) || isNaN(u)) return NaN;
  const mult = Math.max(0.6, Math.min(1.4, u / base));
  return p * mult;
}

function logisticProb(diff, sigma = WIN_SIGMA) {
  return 1 / (1 + Math.exp(-diff / sigma));
}

/*******************  BUILDERS  *********************/
function buildHA(rows, map) {
  const out = {};
  const tIdx = colLetterToIdx(map.team);
  const fIdx = colLetterToIdx(map.haF);
  const gIdx = colLetterToIdx(map.haG);
  const lIdx = colLetterToIdx(map.l3);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const t = hardTrim(row[tIdx]);
    if (!t) continue;
    out[t] = {
      Home: toFloat(row[fIdx]),
      Away: toFloat(row[gIdx]),
      L3:   toFloat(row[lIdx])
    };
  }
  return out;
}

function buildSeasonL3(rows, map) {
  const out = {};
  const tIdx = colLetterToIdx(map.team);
  const sIdx = colLetterToIdx(map.season);
  const lIdx = colLetterToIdx(map.l3);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const t = hardTrim(row[tIdx]);
    if (!t) continue;
    out[t] = {
      Season: toFloat(row[sIdx]),
      L3:     toFloat(row[lIdx])
    };
  }
  return out;
}

function buildPace(rows, map) {
  const out = {};
  const tIdx = colLetterToIdx(map.team);
  const fIdx = colLetterToIdx(map.haF);
  const gIdx = colLetterToIdx(map.haG);
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const t = hardTrim(row[tIdx]);
    if (!t) continue;
    out[t] = {
      Home: toFloat(row[fIdx]),
      Away: toFloat(row[gIdx])
    };
  }
  return out;
}

/*******************  STATE  *********************/
const S = {
  playerRows: null,
  lineupsRows: null,
  oeff: null,
  deff: null,
  pace: null,
  oreb: null,
  dreb: null,
  ooreb: null,
  odreb: null,
  league: { pace: 105, ppg: 115, offEff: 1.12, defEff: 1.12 },
  teams: [],
  allPlayers: [],
  teamBasePER: {},
  overrides: {},
  lastPrediction: null,
  savedGames: []
};

/*******************  INIT  *********************/
async function init() {
  try {
    const [
      playerRows,
      lineupsRows,
      oeffRows,
      deffRows,
      paceRows,
      orebRows,
      oorebRows,
      drebRows,
      odrebRows,
      leagueRows
    ] = await Promise.all([
      loadCSV(PLAYER_URL),
      loadCSV(LINEUPS_URL),
      loadCSV(OEFF_URL),
      loadCSV(DEFF_URL),
      loadCSV(PACE_URL),
      loadCSV(OREB_URL),
      loadCSV(OPP_OREB_URL),
      loadCSV(DREB_URL),
      loadCSV(OPP_DREB_URL),
      loadCSV(LEAGUE_URL)
    ]);

    S.playerRows  = playerRows;
    S.lineupsRows = lineupsRows;
    S.oeff  = buildHA(oeffRows, COLS.oeff);
    S.deff  = buildHA(deffRows, COLS.deff);
    S.pace  = buildPace(paceRows, COLS.pace);
    S.oreb  = buildHA(orebRows, COLS.oreb);
    S.dreb  = buildHA(drebRows, COLS.dreb);
    S.ooreb = buildSeasonL3(oorebRows, COLS.ooreb);
    S.odreb = buildSeasonL3(odrebRows, COLS.odreb);

    // league averages: col A label, col B value
    if (leagueRows && leagueRows.length) {
      const labels = leagueRows.map(r => hardTrim(r[0]).toLowerCase());
      const vals   = leagueRows.map(r => toFloat(r[1]));
      const getVal = name => {
        const idx = labels.indexOf(name.toLowerCase());
        return idx >= 0 ? vals[idx] : NaN;
      };
      S.league = {
        pace:   safe(getVal("pace"), 105),
        ppg:    safe(getVal("points"), 115),
        offEff: safe(getVal("off efficiency"), 1.12),
        defEff: safe(getVal("def efficiency"), 1.12)
      };
    }

    // teams from lineups
    const tIdx = colLetterToIdx(COLS.lineups.team);
    const teams = [];
    for (let i = 0; i < S.lineupsRows.length; i++) {
      const t = hardTrim(S.lineupsRows[i][tIdx]);
      if (t && t.toLowerCase() !== "team") teams.push(t);
    }
    S.teams = [...new Set(teams)].sort();

    // players from player tab
    const pIdx = colLetterToIdx(COLS.player.player);
    const players = [];
    for (let i = 1; i < S.playerRows.length; i++) {
      const nm = hardTrim(S.playerRows[i][pIdx]);
      if (nm) players.push(nm);
    }
    S.allPlayers = [...new Set(players)].sort();

    // datalist
    const dl = document.getElementById("playerList");
    dl.innerHTML = "";
    S.allPlayers.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      dl.appendChild(opt);
    });

    // baseline PER per team
    S.teamBasePER = {};
    for (const team of S.teams) {
      const lu = defaultLineupForTeam(team);
      S.teamBasePER[team] = lineupWeightedPER(lu);
    }

    setupUI();
  } catch (err) {
    console.error(err);
    const res = document.getElementById("results");
    if (res) {
      res.style.display = "block";
      res.innerHTML =
        "<strong>Load error</strong> — check CSV links/permissions in app.js.";
    }
  }
}

/*******************  LINEUPS  *********************/
function defaultLineupForTeam(team) {
  const tIdx  = colLetterToIdx(COLS.lineups.team);
  const g1Idx = colLetterToIdx(COLS.lineups.g1);
  const g2Idx = colLetterToIdx(COLS.lineups.g2);
  const f1Idx = colLetterToIdx(COLS.lineups.f1);
  const f2Idx = colLetterToIdx(COLS.lineups.f2);
  const cIdx  = colLetterToIdx(COLS.lineups.c);

  const needle = hardTrim(team).toLowerCase();
  for (let i = 0; i < S.lineupsRows.length; i++) {
    const row = S.lineupsRows[i];
    const t   = hardTrim(row[tIdx]).toLowerCase();
    if (!t) continue;
    if (t === needle) {
      return [
        hardTrim(row[g1Idx]),
        hardTrim(row[g2Idx]),
        hardTrim(row[f1Idx]),
        hardTrim(row[f2Idx]),
        hardTrim(row[cIdx])
      ].filter(Boolean);
    }
  }
  return [];
}

function lineupWeightedPER(playerNames) {
  if (!playerNames || !playerNames.length) return NaN;

  const pIdx = colLetterToIdx(COLS.player.player);
  const gIdx = colLetterToIdx(COLS.player.g);
  const mIdx = colLetterToIdx(COLS.player.mp);
  const rIdx = colLetterToIdx(COLS.player.per);
  const uIdx = colLetterToIdx(COLS.player.usg);

  let sumPM = 0;
  let sumM  = 0;

  for (const name of playerNames) {
    const target = hardTrim(name);
    if (!target) continue;

    for (let i = 1; i < S.playerRows.length; i++) {
      const row = S.playerRows[i];
      const nm  = hardTrim(row[pIdx]);
      if (!nm || nm !== target) continue;

      const mpg = minutesPerGame(row[mIdx], row[gIdx]);
      const adj = usageAdjPER(row[rIdx], row[uIdx]);
      if (!isNaN(mpg) && !isNaN(adj)) {
        sumPM += adj * mpg;
        sumM  += mpg;
      }
    }
  }
  return sumM > 0 ? sumPM / sumM : NaN;
}

function getOverrideOrDefaultLineup(team) {
  if (S.overrides[team] && S.overrides[team].length === 5) {
    return S.overrides[team];
  }
  return defaultLineupForTeam(team);
}

/*******************  UI SETUP  *********************/
function setupUI() {
  const awaySel = document.getElementById("awayTeam");
  const homeSel = document.getElementById("homeTeam");
  const predictBtn = document.getElementById("predictBtn");
  const compareBtn = document.getElementById("compareBtn");
  const saveBtn    = document.getElementById("saveGameBtn");

  S.teams.forEach(t => {
    const o1 = document.createElement("option");
    o1.value = t;
    o1.textContent = t;
    awaySel.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = t;
    o2.textContent = t;
    homeSel.appendChild(o2);
  });
  if (S.teams.length > 1) homeSel.selectedIndex = 1;

  awaySel.addEventListener("change", renderLineupEditors);
  homeSel.addEventListener("change", renderLineupEditors);

  document.getElementById("saveAway").addEventListener("click", () => saveLineupFromUI("away"));
  document.getElementById("saveHome").addEventListener("click", () => saveLineupFromUI("home"));

  predictBtn.addEventListener("click", predictGame);
  compareBtn.addEventListener("click", compareStats);
  saveBtn.addEventListener("click", saveGameToTable);

  renderLineupEditors();
}

function renderLineupEditors() {
  const awayTeam = document.getElementById("awayTeam").value;
  const homeTeam = document.getElementById("homeTeam").value;

  document.getElementById("awayTeamLabel").textContent = awayTeam || "—";
  document.getElementById("homeTeamLabel").textContent = homeTeam || "—";

  if (awayTeam) renderOneEditor("away", awayTeam);
  if (homeTeam) renderOneEditor("home", homeTeam);
}

function renderOneEditor(side, team) {
  const ids = {
    g1: `${side}_g1`,
    g2: `${side}_g2`,
    f1: `${side}_f1`,
    f2: `${side}_f2`,
    c:  `${side}_c`
  };
  const lineup = getOverrideOrDefaultLineup(team);
  ["g1", "g2", "f1", "f2", "c"].forEach((slot, idx) => {
    const el = document.getElementById(ids[slot]);
    if (el) el.value = lineup[idx] || "";
  });

  const per = lineupWeightedPER(lineup);
  const labelId = side === "away" ? "awayPerLabel" : "homePerLabel";
  const perLabel = document.getElementById(labelId);
  if (perLabel) perLabel.textContent = `Lineup PER: ${isNaN(per) ? "—" : per.toFixed(2)}`;
}

function readLineupFromUI(side) {
  const ids = [`${side}_g1`, `${side}_g2`, `${side}_f1`, `${side}_f2`, `${side}_c`];
  return ids
    .map(id => hardTrim(document.getElementById(id)?.value))
    .filter(Boolean);
}

function saveLineupFromUI(side) {
  const team =
    side === "away"
      ? document.getElementById("awayTeam").value
      : document.getElementById("homeTeam").value;

  if (!team) return;
  const lu = readLineupFromUI(side);
  if (lu.length !== 5) {
    alert("Please select 5 players for the lineup.");
    return;
  }
  S.overrides[team] = lu;
  S.teamBasePER[team] = lineupWeightedPER(lu);
  renderOneEditor(side, team); // refresh PER label
  alert(`${team} lineup saved.`);
}

/*******************  CONTEXT & MODEL  *********************/
function teamContext(team, isHome) {
  const sideKey = isHome ? "Home" : "Away";

  const oeff  = S.oeff[team]  || {};
  const deff  = S.deff[team]  || {};
  const oreb  = S.oreb[team]  || {};
  const dreb  = S.dreb[team]  || {};
  const pace  = S.pace[team]  || {};
  const ooreb = S.ooreb[team] || {};
  const odreb = S.odreb[team] || {};

  return {
    offEff:  blend(oeff[sideKey], oeff.L3),
    defEff:  blend(deff[sideKey], deff.L3),
    oreb:    blend(oreb[sideKey], oreb.L3),
    dreb:    blend(dreb[sideKey], dreb.L3),
    oppOreb: blend(ooreb.Season, ooreb.L3),
    oppDreb: blend(odreb.Season, odreb.L3),
    pace:    pace[sideKey]
  };
}

function predictScores(awayTeam, homeTeam, awayLineup, homeLineup, awayB2B, homeB2B) {
  const leaguePace = S.league.pace;
  const leaguePPG  = S.league.ppg;
  const leagueOff  = S.league.offEff;
  const leagueDef  = S.league.defEff;

  const awayCtx = teamContext(awayTeam, false);
  const homeCtx = teamContext(homeTeam, true);

  const pace = (safe(awayCtx.pace, leaguePace) + safe(homeCtx.pace, leaguePace)) / 2;
  const basePPP = leaguePPG / leaguePace;

  const awayOffMult = safe(awayCtx.offEff, leagueOff) / leagueOff;
  const homeOffMult = safe(homeCtx.offEff, leagueOff) / leagueOff;

  const awayDefMult = leagueDef / safe(homeCtx.defEff, leagueDef);
  const homeDefMult = leagueDef / safe(awayCtx.defEff, leagueDef);

  const awayPER = lineupWeightedPER(awayLineup) || S.teamBasePER[awayTeam] || 15;
  const homePER = lineupWeightedPER(homeLineup) || S.teamBasePER[homeTeam] || 15;
  const perDiff = awayPER - homePER;
  const awayPERmult = 1 + (perDiff * PER_K) / 100;
  const homePERmult = 1 - (perDiff * PER_K) / 100;

  const awayRebEdge =
    safe(awayCtx.oreb, 0) - safe(homeCtx.oppDreb, 0) +
    safe(awayCtx.dreb, 0) - safe(homeCtx.oppOreb, 0);

  const homeRebEdge =
    safe(homeCtx.oreb, 0) - safe(awayCtx.oppDreb, 0) +
    safe(homeCtx.dreb, 0) - safe(awayCtx.oppOreb, 0);

  const awayRebMult = 1 + (awayRebEdge * REB_K);
  const homeRebMult = 1 + (homeRebEdge * REB_K);

  let awayScore =
    pace * basePPP * awayOffMult * awayDefMult * awayPERmult * awayRebMult;
  let homeScore =
    pace * basePPP * homeOffMult * homeDefMult * homePERmult * homeRebMult;

  awayScore -= HCA_PTS / 2;
  homeScore += HCA_PTS / 2;

  if (awayB2B) awayScore -= B2B_PENALTY;
  if (homeB2B) homeScore -= B2B_PENALTY;

  awayScore = Math.max(70, Math.min(150, awayScore));
  homeScore = Math.max(70, Math.min(150, homeScore));

  return { awayScore, homeScore };
}

/*******************  PREDICTION & OUTPUT  *********************/
function predictGame() {
  const awayTeam = document.getElementById("awayTeam").value;
  const homeTeam = document.getElementById("homeTeam").value;
  const bookSpread = toFloat(document.getElementById("bookSpread").value);
  const bookTotal  = toFloat(document.getElementById("bookTotal").value);
  const awayB2B    = document.getElementById("awayB2B").checked;
  const homeB2B    = document.getElementById("homeB2B").checked;

  if (!awayTeam || !homeTeam || awayTeam === homeTeam) {
    alert("Please select two different teams.");
    return;
  }

  const awayLineup = readLineupFromUI("away");
  const homeLineup = readLineupFromUI("home");

  const { awayScore, homeScore } = predictScores(
    awayTeam,
    homeTeam,
    awayLineup,
    homeLineup,
    awayB2B,
    homeB2B
  );

  const modelTotal  = awayScore + homeScore;
  const modelSpread = homeScore - awayScore;

  let totalPlay = "NO BET";
  if (!isNaN(bookTotal)) {
    if (modelTotal >= bookTotal + 10) totalPlay = "BET OVER";
    else if (modelTotal <= bookTotal - 10) totalPlay = "BET UNDER";
  }

  let spreadPlay = "NO BET";
  if (!isNaN(bookSpread)) {
    const edge = modelSpread - (-bookSpread);
    if (edge >= 2)      spreadPlay = `BET ${homeTeam}`;
    else if (edge <= -2) spreadPlay = `BET ${awayTeam}`;
  }

  const diff = homeScore - awayScore;
  const homeWinProb = logisticProb(diff);
  const awayWinProb = 1 - homeWinProb;
  const winner =
    awayScore > homeScore ? awayTeam :
    homeScore > awayScore ? homeTeam : "Push";

  const el = document.getElementById("results");
  el.style.display = "block";
  el.innerHTML = `
    <h2>Game Prediction Results</h2>
    <p><strong>${awayTeam}:</strong> ${awayScore.toFixed(1)}</p>
    <p><strong>${homeTeam}:</strong> ${homeScore.toFixed(1)}</p>
    <p><strong>Predicted Winner:</strong> ${winner}</p>
    <p><strong>Win Probability:</strong><br>
       ${awayTeam}: ${(awayWinProb * 100).toFixed(1)}%<br>
       ${homeTeam}: ${(homeWinProb * 100).toFixed(1)}%
    </p>
    <hr>
    <p><strong>Model Total:</strong> ${modelTotal.toFixed(1)} ${
      isNaN(bookTotal) ? "" : `vs Book Total ${bookTotal.toFixed(1)}`
    }<br>
       <strong>Total Play:</strong> ${totalPlay}
    </p>
    <p><strong>Model Spread (Home - Away):</strong> ${modelSpread.toFixed(1)} ${
      isNaN(bookSpread) ? "" : `vs Book Spread ${bookSpread.toFixed(1)}`
    }<br>
       <strong>Spread Play:</strong> ${spreadPlay}
    </p>
  `;

  S.lastPrediction = {
    awayTeam,
    homeTeam,
    awayScore,
    homeScore,
    bookSpread,
    bookTotal,
    modelTotal,
    modelSpread,
    totalPlay,
    spreadPlay
  };
}

/*******************  STATS COMPARISON  *********************/
function compareStats() {
  const awayTeam = document.getElementById("awayTeam").value;
  const homeTeam = document.getElementById("homeTeam").value;
  if (!awayTeam || !homeTeam || awayTeam === homeTeam) {
    alert("Select two different teams first.");
    return;
  }

  const awayCtx = teamContext(awayTeam, false);
  const homeCtx = teamContext(homeTeam, true);

  const awayLineup = getOverrideOrDefaultLineup(awayTeam);
  const homeLineup = getOverrideOrDefaultLineup(homeTeam);
  const awayPER = lineupWeightedPER(awayLineup) || S.teamBasePER[awayTeam] || 15;
  const homePER = lineupWeightedPER(homeLineup) || S.teamBasePER[homeTeam] || 15;

  const metrics = [
    { name: "Off Efficiency", a: awayCtx.offEff, h: homeCtx.offEff, better: "higher" },
    { name: "Def Efficiency", a: awayCtx.defEff, h: homeCtx.defEff, better: "lower"  },
    { name: "Off Reb %",      a: awayCtx.oreb,   h: homeCtx.oreb,   better: "higher" },
    { name: "Def Reb %",      a: awayCtx.dreb,   h: homeCtx.dreb,   better: "higher" },
    { name: "Pace",           a: awayCtx.pace,   h: homeCtx.pace,   better: "higher" },
    { name: "Lineup PER",     a: awayPER,        h: homePER,        better: "higher" }
  ];

  const box = document.getElementById("compareBox");
  let rowsHtml = "";
  const fmt = v => (isNaN(v) ? "—" : Math.abs(v) < 5 ? v.toFixed(3) : v.toFixed(1));

  metrics.forEach(m => {
    const a = m.a, h = m.h;
    let favA = "", favH = "";
    if (!isNaN(a) && !isNaN(h)) {
      if (m.better === "higher") {
        if (a > h) favA = "fav-away";
        else if (h > a) favH = "fav-home";
      } else {
        if (a < h) favA = "fav-away";
        else if (h < a) favH = "fav-home";
      }
    }
    rowsHtml += `
      <tr>
        <td>${m.name}</td>
        <td class="${favA}">${fmt(a)}</td>
        <td class="${favH}">${fmt(h)}</td>
      </tr>`;
  });

  box.style.display = "block";
  box.innerHTML = `
    <h2>Stats Comparison</h2>
    <table class="compare-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>${awayTeam}</th>
          <th>${homeTeam}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p><span class="fav-away">Green</span> = favored side on that metric.</p>
  `;
}

/*******************  SAVE GAME TABLE  *********************/
function saveGameToTable() {
  if (!S.lastPrediction) {
    alert("Run a prediction first.");
    return;
  }
  S.savedGames.push({ ts: new Date(), ...S.lastPrediction });
  renderSavedTable();
}

function renderSavedTable() {
  const box = document.getElementById("savedBox");
  if (!S.savedGames.length) {
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }

  let rowsHtml = "";
  S.savedGames.forEach(g => {
    rowsHtml += `
      <tr>
        <td>${g.ts.toLocaleTimeString()}</td>
        <td>${g.awayTeam}</td>
        <td>${g.homeTeam}</td>
        <td>${g.awayScore.toFixed(1)}</td>
        <td>${g.homeScore.toFixed(1)}</td>
        <td>${g.modelTotal.toFixed(1)}</td>
        <td>${isNaN(g.bookTotal) ? "—" : g.bookTotal.toFixed(1)}</td>
        <td>${g.totalPlay}</td>
        <td>${g.modelSpread.toFixed(1)}</td>
        <td>${isNaN(g.bookSpread) ? "—" : g.bookSpread.toFixed(1)}</td>
        <td>${g.spreadPlay}</td>
      </tr>`;
  });

  box.style.display = "block";
  box.innerHTML = `
    <h2>Saved Games</h2>
    <table class="saved-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Away</th>
          <th>Home</th>
          <th>Away Score</th>
          <th>Home Score</th>
          <th>Model Total</th>
          <th>Book Total</th>
          <th>Total Play</th>
          <th>Model Spread</th>
          <th>Book Spread</th>
          <th>Spread Play</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

/*******************  START  *********************/
document.addEventListener("DOMContentLoaded", init);
