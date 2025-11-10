/****************************************************
 * NBA MODEL — column-letter only + editable lineups
 * Works as a static site on Vercel (no build step).
 * Paste your Google Sheets CSV links below.
 ****************************************************/

/* 1) PASTE YOUR CSV LINKS */
const Player_URL      = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=2033299676&single=true&output=csv";
const LINEUPS_URL    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=975459408&single=true&output=csv";
const OEFF_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1030421164&single=true&output=csv";
const DEFF_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1401009495&single=true&output=csv";
const PACE_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1579578655&single=true&output=csv";
const OREB_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1907720061&single=true&output=csv";
const OPP_OREB_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1902898168&single=true&output=csv";
const DREB_URL       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=957131207&single=true&output=csv";
const OPP_DREB_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=32364573&single=true&output=csv";
const LEAGUE_URL     = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQBKVlskmdHsujbUSOK_73O32-atb-RXYaWuqZL6THtbkWrYx8DTH3s8vfmsbxN9mxzBd0FiTzz49KI/pub?gid=1422185850&single=true&output=csv";

/* 2) COLUMN LETTER MAP (no headers required) */
const COLS = {
  // Stats: if you don’t have a Team column in your stats, set team:null
  player:  { team:"null", player:"B", g:"F", mp:"H", per:"I", usg:"T" },

  // Lineups tab (matches your screenshot)
  lineups:{ team:"A", g1:"B", g2:"C", f1:"D", f2:"E", c:"F" },

  // TeamRankings tabs
  oreb:   { team:"B", haF:"F", haG:"G", l3:"D" },
  dreb:   { team:"B", haF:"F", haG:"G", l3:"D" },
  oeff:   { team:"B", haF:"F", haG:"G", l3:"D" },
  deff:   { team:"B", haF:"F", haG:"G", l3:"D" },
  ooreb:  { team:"B", season:"C", l3:"D" },
  odreb:  { team:"B", season:"C", l3:"D" },
  pace:   { team:"B", haF:"F", haG:"G" }
};

/* 3) MODEL WEIGHTS */
const BLEND_SZN = 0.70;  // H/A vs L3
const PER_K = 0.10;      // PER influence
const ORB_W = 60;        // points per pct-pt ORB edge
const DRB_W = 40;        // points per pct-pt DRB edge
const HCA_PTS = 2;       // home-court
const WIN_SIGMA = 6.5;   // logistic steepness for win prob

/* 4) INLINE DEBUG (open with ?debug=1) */
const DEBUG = new URLSearchParams(location.search).get("debug") === "1";
function dshow(){ const w=document.getElementById("debugWrap"); if(w) w.style.display="block"; }
function dlog(...args){
  if(!DEBUG) return; dshow();
  const el=document.getElementById("debug"); if(!el) return;
  const line = args.map(a=>{ try{return typeof a==="string"?a:JSON.stringify(a);}catch{ return String(a);} }).join(" ");
  el.textContent += line + "\n";
}

/* 5) Helpers */
const colLetterToIdx = L => { L=L?.trim()?.toUpperCase(); if(!L) return -1; let v=0; for(const ch of L) v=v*26+(ch.charCodeAt(0)-65+1); return v-1; };
const toFloat = v => { if(v==null) return NaN; if(typeof v==="number") return v; let s=String(v).trim().replace(/,/g,""); if(!s) return NaN; if(s.endsWith("%")) return parseFloat(s.slice(0,-1))/100; const x=parseFloat(s); return isNaN(x)?NaN:x; };
const safe = (x,d)=> (isNaN(toFloat(x))?d:toFloat(x));
const minutesPerGame = (mp,g)=> (toFloat(g)>0?toFloat(mp)/toFloat(g):NaN);
const usageAdjPER = (per,usg,base=20)=> Math.max(0.6,Math.min(1.4,toFloat(usg)/base))*toFloat(per);
const pctEdge = (a,b)=> ((toFloat(a)-toFloat(b))*100);
const blend = (a,b)=> BLEND_SZN*toFloat(a) + (1-BLEND_SZN)*toFloat(b);
const logisticProb = (x,s=WIN_SIGMA)=> 1/(1+Math.exp(-x/s));
const hardTrim = s => String(s ?? "").replace(/\uFEFF/g,"").replace(/\u00A0/g," ").replace(/\s+/g," ").trim();

async function loadCSV(url){
  return new Promise((resolve,reject)=>{
    Papa.parse(url,{download:true,skipEmptyLines:true,complete:r=>resolve(r.data),error:reject});
  });
}

/* 6) Build TR tables */
function buildHA(rows,map){
  const out={};
  for(let i=1;i<rows.length;i++){
    const t=hardTrim(rows[i]?.[colLetterToIdx(map.team)]); if(!t) continue;
    out[t]={ Home:toFloat(rows[i]?.[colLetterToIdx(map.haF)]),
             Away:toFloat(rows[i]?.[colLetterToIdx(map.haG)]),
             L3:toFloat(rows[i]?.[colLetterToIdx(map.l3)]) };
  } return out;
}
function buildSeasonL3(rows,map){
  const out={};
  for(let i=1;i<rows.length;i++){
    const t=hardTrim(rows[i]?.[colLetterToIdx(map.team)]); if(!t) continue;
    out[t]={ Season:toFloat(rows[i]?.[colLetterToIdx(map.season)]),
             L3:toFloat(rows[i]?.[colLetterToIdx(map.l3)]) };
  } return out;
}
function buildPace(rows,map){
  const out={};
  for(let i=1;i<rows.length;i++){
    const t=hardTrim(rows[i]?.[colLetterToIdx(map.team)]); if(!t) continue;
    out[t]={ Home:toFloat(rows[i]?.[colLetterToIdx(map.haF)]),
             Away:toFloat(rows[i]?.[colLetterToIdx(map.haG)]) };
  } return out;
}

/* 7) Lineup + roster helpers */
function lineupWeightedPER(playerNames, statsRows){
  const pIdx=colLetterToIdx(COLS.stats.player);
  const gIdx=colLetterToIdx(COLS.stats.g);
  const mIdx=colLetterToIdx(COLS.stats.mp);
  const rIdx=colLetterToIdx(COLS.stats.per);
  const uIdx=colLetterToIdx(COLS.stats.usg);
  let sumPM=0,sumM=0;
  for(const name of playerNames){
    for(let i=1;i<statsRows.length;i++){
      const pname=hardTrim(statsRows[i]?.[pIdx]); if(pname!==name) continue;
      const mpg=minutesPerGame(statsRows[i]?.[mIdx], statsRows[i]?.[gIdx]);
      const adj=usageAdjPER(statsRows[i]?.[rIdx], statsRows[i]?.[uIdx]);
      if(!isNaN(mpg)&&!isNaN(adj)){ sumPM+=adj*mpg; sumM+=mpg; }
    }
  }
  return sumM>0 ? sumPM/sumM : NaN;
}

function rosterForTeam(team, statsRows){
  const tIdx=colLetterToIdx(COLS.stats.team);
  const pIdx=colLetterToIdx(COLS.stats.player);
  const out=[];
  for(let i=1;i<statsRows.length;i++){
    const name=hardTrim(statsRows[i]?.[pIdx]); if(!name) continue;
    if(tIdx<0){ out.push(name); continue; }
    const tm=hardTrim(statsRows[i]?.[tIdx]);
    if(tm===team) out.push(name);
  }
  return [...new Set(out)].sort();
}

function defaultLineupForTeam(team, lineupsRows){
  const T=hardTrim(team).toLowerCase();
  const tIdx=colLetterToIdx(COLS.lineups.team);
  const ps=[COLS.lineups.g1,COLS.lineups.g2,COLS.lineups.f1,COLS.lineups.f2,COLS.lineups.c].map(colLetterToIdx);
  for(let i=0;i<lineupsRows.length;i++){
    const cell=hardTrim(lineupsRows[i]?.[tIdx]).toLowerCase();
    if(cell && cell===T){
      return ps.map(j=>hardTrim(lineupsRows[i]?.[j])).filter(Boolean);
    }
  }
  return [];
}

/* 8) Global state */
const S = {
  stats:null, lineups:null,
  oeff:null, deff:null, pace:null,
  oreb:null, dreb:null, ooreb:null, odreb:null,
  league:{pace:105, ppg:115, oe:1.12, de:1.12},
  teams:[], teamPER:{}, overrides:{}
};

/* 9) Init */
async function init(){
  document.getElementById("status").textContent="Loading data…";

  const [statsRows,lineupsRows,oeffRows,deffRows,paceRows,orebRows,oorebRows,drebRows,odrebRows,leagueRows] = await Promise.all([
    loadCSV(STATS_URL), loadCSV(LINEUPS_URL),
    loadCSV(OEFF_URL),  loadCSV(DEFF_URL),
    loadCSV(PACE_URL),  loadCSV(OREB_URL),
    loadCSV(OPP_OREB_URL), loadCSV(DREB_URL), loadCSV(OPP_DREB_URL),
    loadCSV(LEAGUE_URL)
  ]);

  S.stats=statsRows; S.lineups=lineupsRows;
  S.oeff=buildHA(oeffRows,COLS.oeff); S.deff=buildHA(deffRows,COLS.deff);
  S.pace=buildPace(paceRows,COLS.pace);
  S.oreb=buildHA(orebRows,COLS.oreb); S.dreb=buildHA(drebRows,COLS.dreb);
  S.ooreb=buildSeasonL3(oorebRows,COLS.ooreb); S.odreb=buildSeasonL3(odrebRows,COLS.odreb);

  // League (first two cols: label, value)
  const labels=leagueRows.map(r=>hardTrim(r[0]).toLowerCase());
  const vals=leagueRows.map(r=>toFloat(r[1]));
  const getVal=k=>{ const i=labels.findIndex(x=>x===k.toLowerCase()); return (i>-1&&!isNaN(vals[i]))?vals[i]:NaN; };
  S.league={ pace:safe(getVal("pace"),105), ppg:safe(getVal("points"),115), oe:safe(getVal("off efficiency"),1.12), de:safe(getVal("def efficiency"),1.12) };

  // Teams from Lineups (robust + debug)
  const tIdx=colLetterToIdx(COLS.lineups.team);
  const first6=(S.lineups||[]).slice(0,6).map((r,i)=>({row:i,teamCell:r?r[tIdx]:undefined}));
  dlog("[Lineups] URL:", LINEUPS_URL);
  dlog("[Lineups] rows:", (S.lineups||[]).length);
  dlog("[Lineups] team col letter:", COLS.lineups.team, " index:", tIdx);
  dlog("[Lineups] first 6 team cells:", JSON.stringify(first6,null,2));

  let teams=[];
  for(let i=0;i<S.lineups.length;i++){
    const raw=S.lineups[i]?.[tIdx]; const t=hardTrim(raw);
    if(t && t.toLowerCase()!=="team") teams.push(t);
  }
  teams=[...new Set(teams)].sort();
  dlog("[Lineups] parsed teams:", teams.slice(0,40));

  if(teams.length===0 && S.oeff){
    teams=Object.keys(S.oeff).map(hardTrim).filter(Boolean).sort();
    dlog("[Fallback] Using OEFF keys:", teams.slice(0,40));
    document.getElementById("status").textContent="No teams found in Lineups; using OEFF list (check gid/column).";
  }
  S.teams=teams;

  // Baseline lineup PER from default lineups
  S.teamPER={};
  for(const t of S.teams){
    const defLu=defaultLineupForTeam(t, S.lineups);
    S.teamPER[t]=lineupWeightedPER(defLu, S.stats);
    dlog(`[PER] ${t}:`, S.teamPER[t]);
  }

  // Fill dropdowns
  const awaySel=document.getElementById("awayTeam");
  const homeSel=document.getElementById("homeTeam");
  awaySel.innerHTML=""; homeSel.innerHTML="";
  if(S.teams.length===0){
    document.getElementById("status").textContent="No teams found. Verify Lineups CSV gid and team column letter.";
  }else{
    S.teams.forEach(t=>{
      const a=document.createElement("option"); a.value=t; a.textContent=t; awaySel.appendChild(a);
      const b=document.createElement("option"); b.value=t; b.textContent=t; homeSel.appendChild(b);
    });
    if(S.teams.length>1) homeSel.selectedIndex=1;
    document.getElementById("status").textContent="Ready.";
  }

  awaySel.addEventListener("change", renderEditors);
  homeSel.addEventListener("change", renderEditors);
  document.getElementById("saveAway").addEventListener("click", ()=>saveEditor("away"));
  document.getElementById("resetAway").addEventListener("click", ()=>resetEditor("away"));
  document.getElementById("saveHome").addEventListener("click", ()=>saveEditor("home"));
  document.getElementById("resetHome").addEventListener("click", ()=>resetEditor("home"));

  renderEditors();
}

/* 10) Lineup editors */
function renderEditors(){
  const awayTeam=document.getElementById("awayTeam").value;
  const homeTeam=document.getElementById("homeTeam").value;
  if(!awayTeam || !homeTeam) return;

  document.getElementById("lineupEditors").style.display="flex";
  document.getElementById("awayEditorTitle").textContent=`Away Lineup — ${awayTeam}`;
  document.getElementById("homeEditorTitle").textContent=`Home Lineup — ${homeTeam}`;
  renderOneEditor("away", awayTeam);
  renderOneEditor("home", homeTeam);
}

function renderOneEditor(side, team){
  const ids={ g1:`${side}_g1`, g2:`${side}_g2`, f1:`${side}_f1`, f2:`${side}_f2`, c:`${side}_c` };
  const roster=rosterForTeam(team, S.stats);
  const cur = (S.overrides[team] && S.overrides[team].length===5) ? S.overrides[team]
            : defaultLineupForTeam(team, S.lineups);

  ["g1","g2","f1","f2","c"].forEach((slot,idx)=>{
    const sel=document.getElementById(ids[slot]); sel.innerHTML="";
    const empty=document.createElement("option"); empty.value=""; empty.textContent="—"; sel.appendChild(empty);
    roster.forEach(p=>{
      const opt=document.createElement("option"); opt.value=p; opt.textContent=p;
      if(cur[idx]===p) opt.selected=true; sel.appendChild(opt);
    });
  });

  const per=lineupWeightedPER(getEditorLineup(side), S.stats);
  document.getElementById(side==="away"?"awayPER":"homePER").textContent=isNaN(per)?"—":per.toFixed(2);
}

function getEditorLineup(side){
  return [`${side}_g1`,`${side}_g2`,`${side}_f1`,`${side}_f2`,`${side}_c`]
    .map(id=>hardTrim(document.getElementById(id).value)).filter(Boolean);
}

function saveEditor(side){
  const team=(side==="away"?document.getElementById("awayTeam").value:document.getElementById("homeTeam").value);
  const lu=getEditorLineup(side); if(lu.length===0) return;
  S.overrides[team]=lu;
  S.teamPER[team]=lineupWeightedPER(lu, S.stats);
  document.getElementById(side==="away"?"awayPER":"homePER").textContent=isNaN(S.teamPER[team])?"—":S.teamPER[team].toFixed(2);
}
function resetEditor(side){
  const team=(side==="away"?document.getElementById("awayTeam").value:document.getElementById("homeTeam").value);
  delete S.overrides[team];
  const defLu=defaultLineupForTeam(team, S.lineups);
  S.teamPER[team]=lineupWeightedPER(defLu, S.stats);
  renderOneEditor(side, team);
}

/* 11) Predict */
function predict(){
  const awayTeam=document.getElementById("awayTeam").value;
  const homeTeam=document.getElementById("homeTeam").value;
  const bookSpread=parseFloat(document.getElementById("bookSpread").value);
  const bookTotal=parseFloat(document.getElementById("bookTotal").value);
  const L=S.league;

  const A_per = isNaN(S.teamPER[awayTeam]) ? 15 : S.teamPER[awayTeam];
  const H_per = isNaN(S.teamPER[homeTeam]) ? 15 : S.teamPER[homeTeam];

  const A_off = blend(S.oeff[awayTeam]?.Away ?? L.oe, S.oeff[awayTeam]?.L3 ?? L.oe);
  const H_def = blend(S.deff[homeTeam]?.Home ?? L.de, S.deff[homeTeam]?.L3 ?? L.de);
  const H_off = blend(S.oeff[homeTeam]?.Home ?? L.oe, S.oeff[homeTeam]?.L3 ?? L.oe);
  const A_def = blend(S.deff[awayTeam]?.Away ?? L.de, S.deff[awayTeam]?.L3 ?? L.de);

  const A_p = S.pace[awayTeam]?.Away ?? L.pace;
  const H_p = S.pace[homeTeam]?.Home ?? L.pace;
  const g_pace = (A_p + H_p)/2;

  const A_or_edge = pctEdge(
    blend(S.oreb[awayTeam]?.Away, S.oreb[awayTeam]?.L3),
    1 - (BLEND_SZN*safe(S.odreb[homeTeam]?.Season, NaN) + (1-BLEND_SZN)*safe(S.odreb[homeTeam]?.L3, NaN))
  );
  const H_or_edge = pctEdge(
    blend(S.oreb[homeTeam]?.Home, S.oreb[homeTeam]?.L3),
    1 - (BLEND_SZN*safe(S.odreb[awayTeam]?.Season, NaN) + (1-BLEND_SZN)*safe(S.odreb[awayTeam]?.L3, NaN))
  );

  const A_dr_edge = pctEdge(
    blend(S.dreb[awayTeam]?.Away, S.dreb[awayTeam]?.L3),
    BLEND_SZN*safe(S.ooreb[homeTeam]?.Season, NaN) + (1-BLEND_SZN)*safe(S.ooreb[homeTeam]?.L3, NaN)
  );
  const H_dr_edge = pctEdge(
    blend(S.dreb[homeTeam]?.Home, S.dreb[homeTeam]?.L3),
    BLEND_SZN*safe(S.ooreb[awayTeam]?.Season, NaN) + (1-BLEND_SZN)*safe(S.ooreb[awayTeam]?.L3, NaN)
  );

  const A_ppp = A_off * (L.de / H_def) * (1 + PER_K*((A_per-15)/15));
  const H_ppp = H_off * (L.de / A_def) * (1 + PER_K*((H_per-15)/15));

  let A_pts = g_pace*A_ppp + ORB_W*A_or_edge/100 + DRB_W*A_dr_edge/100;
  let H_pts = g_pace*H_ppp + ORB_W*H_or_edge/100 + DRB_W*H_dr_edge/100 + HCA_PTS;

  const targetTotal = L.ppg*2;
  const total0 = A_pts + H_pts;
  if(total0>0){ const k=targetTotal/total0; A_pts*=k; H_pts*=k; }

  const spread = H_pts - A_pts; // home - away
  const total  = A_pts + H_pts;
  const pHome  = logisticProb(spread);
  const pAway  = 1 - pHome;

  let totalPlay="NO BET";
  if(total > bookTotal + 4) totalPlay="BET OVER";
  else if(total < bookTotal - 4) totalPlay="BET UNDER";

  let spreadPlay="NO BET";
  if(spread > bookSpread + 2) spreadPlay=`BET ${homeTeam}`;
  else if(spread < bookSpread - 2) spreadPlay=`BET ${awayTeam}`;

  document.getElementById("results").style.display="block";
  document.getElementById("awayName").textContent=awayTeam;
  document.getElementById("homeName").textContent=homeTeam;
  document.getElementById("awayScore").textContent=A_pts.toFixed(1);
  document.getElementById("homeScore").textContent=H_pts.toFixed(1);
  document.getElementById("winner").textContent=(H_pts>A_pts)?homeTeam:awayTeam;
  document.getElementById("awayProb").textContent=`${awayTeam}: ${(pAway*100).toFixed(1)}%`;
  document.getElementById("homeProb").textContent=`${homeTeam}: ${(pHome*100).toFixed(1)}%`;
  document.getElementById("modelTotal").textContent=total.toFixed(1);
  document.getElementById("bookTotalOut").textContent=bookTotal.toFixed(1);
  document.getElementById("modelSpread").textContent=(spread>=0?"+":"")+spread.toFixed(1);
  document.getElementById("bookSpreadOut").textContent=(bookSpread>=0?"+":"")+bookSpread.toFixed(1);
  document.getElementById("totalPlay").textContent=totalPlay;
  document.getElementById("spreadPlay").textContent=spreadPlay;
}

/* 12) Wire up */
document.getElementById("predictBtn").addEventListener("click", predict);
init().catch(err=>{
  document.getElementById("status").textContent="Load error — check CSV links/permissions in app.js";
  console.error(err);
});
