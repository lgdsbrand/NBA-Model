/****************************************************
 * NBA MODEL — editable lineups + full player pool
 * Uses PLAYER tab (no Team col needed).
 * Adds:
 *  - Back-to-back toggles (B2B penalty)
 *  - Stats Comparison panel
 *  - Save Game table
 *  - Type-ahead players via <datalist>
 ****************************************************/

/* 1) PASTE YOUR CSV LINKS */
const PLAYER_URL     = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=PLAYER";
const LINEUPS_URL    = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=LINEUPS";
const OEFF_URL       = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=OEFF";
const DEFF_URL       = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=DEFF";
const PACE_URL       = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=PACE";
const OREB_URL       = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=OREB";
const OPP_OREB_URL   = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=OPP_OREB";
const DREB_URL       = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=DREB";
const OPP_DREB_URL   = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=OPP_DREB";
const LEAGUE_URL     = "https://docs.google.com/spreadsheets/d/REPLACE/export?format=csv&gid=LEAGUE";

/* 2) COLUMN LETTER MAP (no headers required) */
const COLS = {
  // Player tab: NO team column (set to null)
  player:  { team: null, player:"B", g:"F", mp:"H", per:"I", usg:"T" },

  // Lineups tab
  lineups: { team:"A", g1:"B", g2:"C", f1:"D", f2:"E", c:"F" },

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
const BLEND_SZN = 0.70;
const PER_K     = 0.10;
const ORB_W     = 60;
const DRB_W     = 40;
const HCA_PTS   = 2;
const B2B_PENALTY = 1.0;  // points to subtract if B2B toggle is on
const WIN_SIGMA = 6.5;

/* 4) INLINE DEBUG (?debug=1) */
const DEBUG = new URLSearchParams(location.search).get("debug") === "1";
function dshow(){ const w=document.getElementById("debugWrap"); if(w) w.style.display="block"; }
function dlog(...args){ if(!DEBUG) return; dshow(); const el=document.getElementById("debug"); if(!el) return;
  const line=args.map(a=>{try{return typeof a==="string"?a:JSON.stringify(a);}catch{return String(a);}}).join(" ");
  el.textContent += line + "\n";
}

/* 5) Helpers */
const colLetterToIdx = L => { L=L?.trim()?.toUpperCase(); if(!L) return -1; let v=0; for(const ch of L) v=v*26+(ch.charCodeAt(0)-65+1); return v-1; };
const toFloat = v => { if(v==null) return NaN; if(typeof v==="number") return v; let s=String(v).trim().replace(/,/g,""); if(!s) return NaN; if(s.endsWith("%")) return parseFloat(s.slice(0,-1))/100; const x=parseFloat(s); return isNaN(x)?NaN:x; };
const safe   = (x,d)=> (isNaN(toFloat(x))?d:toFloat(x));
const minutesPerGame = (mp,g)=> (toFloat(g)>0?toFloat(mp)/toFloat(g):NaN);
const usageAdjPER    = (per,usg,base=20)=> Math.max(0.6,Math.min(1.4,toFloat(usg)/base))*toFloat(per);
const pctEdge        = (a,b)=> ((toFloat(a)-toFloat(b))*100);
const blend          = (a,b)=> BLEND_SZN*toFloat(a) + (1-BLEND_SZN)*toFloat(b);
const logisticProb   = (x,s=WIN_SIGMA)=> 1/(1+Math.exp(-x/s));
const hardTrim       = s => String(s ?? "").replace(/\uFEFF/g,"").replace(/\u00A0/g," ").replace(/\s+/g," ").trim();

async function loadCSV(url){
  return new Promise((resolve,reject)=>{
    Papa.parse(url,{download:true,skipEmptyLines:true,complete:r=>resolve(r.data),error:err=>{
      const s=document.getElementById("status"); if(s) s.textContent="Failed to load: "+url;
      console.error("CSV load failed:", url, err); reject(err);
    }});
  });
}

/* 6) Build TR tables */
function buildHA(rows,map){
  const out={};
  for(let i=1;i<rows.length;i++){
    const t=hardTrim(rows[i]?.[colLetterToIdx(map.team)]); if(!t) continue;
    out[t]={ Home:toFloat(rows[i]?.[colLetterToIdx(map.haF)]),
             Away:toFloat(rows[i]?.[colLetterToIdx(map.haG)]),
             L3:  toFloat(rows[i]?.[colLetterToIdx(map.l3)]) };
  } return out;
}
function buildSeasonL3(rows,map){
  const out={};
  for(let i=1;i<rows.length;i++){
    const t=hardTrim(rows[i]?.[colLetterToIdx(map.team)]); if(!t) continue;
    out[t]={ Season:toFloat(rows[i]?.[colLetterToIdx(map.season)]),
             L3:     toFloat(rows[i]?.[colLetterToIdx(map.l3)]) };
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
function lineupWeightedPER(playerNames, playerRows){
  const pIdx=colLetterToIdx(COLS.player.player);
  const gIdx=colLetterToIdx(COLS.player.g);
  const mIdx=colLetterToIdx(COLS.player.mp);
  const rIdx=colLetterToIdx(COLS.player.per);
  const uIdx=colLetterToIdx(COLS.player.usg);
  let sumPM=0,sumM=0;
  for(const name of playerNames){
    for(let i=1;i<playerRows.length;i++){
      const pname=hardTrim(playerRows[i]?.[pIdx]); if(pname!==name) continue;
      const mpg=minutesPerGame(playerRows[i]?.[mIdx], playerRows[i]?.[gIdx]);
      const adj=usageAdjPER(playerRows[i]?.[rIdx], playerRows[i]?.[uIdx]);
      if(!isNaN(mpg)&&!isNaN(adj)){ sumPM+=adj*mpg; sumM+=mpg; }
    }
  }
  return sumM>0 ? sumPM/sumM : NaN;
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
  player:null, lineups:null,
  oeff:null, deff:null, pace:null,
  oreb:null, dreb:null, ooreb:null, odreb:null,
  league:{pace:105, ppg:115, oe:1.12, de:1.12},
  teams:[], teamPER:{}, overrides:{},
  allPlayers:[]
};

/* 9) Init */
async function init(){
  document.getElementById("status").textContent="Loading data…";

  const [playerRows,lineupsRows,oeffRows,deffRows,paceRows,orebRows,oorebRows,drebRows,odrebRows,leagueRows] = await Promise.all([
    loadCSV(PLAYER_URL), loadCSV(LINEUPS_URL),
    loadCSV(OEFF_URL),  loadCSV(DEFF_URL),
    loadCSV(PACE_URL),  loadCSV(OREB_URL),
    loadCSV(OPP_OREB_URL), loadCSV(DREB_URL), loadCSV(OPP_DREB_URL),
    loadCSV(LEAGUE_URL)
  ]);

  S.player=playerRows; S.lineups=lineupsRows;
  S.oeff=buildHA(oeffRows,COLS.oeff); S.deff=buildHA(deffRows,COLS.deff);
  S.pace=buildPace(paceRows,COLS.pace);
  S.oreb=buildHA(orebRows,COLS.oreb); S.dreb=buildHA(drebRows,COLS.dreb);
  S.ooreb=buildSeasonL3(oorebRows,COLS.ooreb); S.odreb=buildSeasonL3(odrebRows,COLS.odreb);

  // League (first two cols: label, value)
  const labels=leagueRows.map(r=>hardTrim(r[0]).toLowerCase());
  const vals=leagueRows.map(r=>toFloat(r[1]));
  const getVal=k=>{ const i=labels.findIndex(x=>x===k.toLowerCase()); return (i>-1&&!isNaN(vals[i]))?vals[i]:NaN; };
  S.league={ pace:safe(getVal("pace"),105), ppg:safe(getVal("points"),115), oe:safe(getVal("off efficiency"),1.12), de:safe(getVal("def efficiency"),1.12) };

  // Build full player list from Player tab
  (function buildAllPlayers(){
    const pIdx=colLetterToIdx(COLS.player.player);
    const names=[];
    for(let i=1;i<S.player.length;i++){
      const nm=hardTrim(S.player[i]?.[pIdx]); if(nm) names.push(nm);
    }
    S.allPlayers=[...new Set(names)].sort();
    dlog("[Players] total:", S.allPlayers.length, "first 10:", S.allPlayers.slice(0,10));

    // Fill datalist for type-ahead inputs
    const dl=document.getElementById("playerList");
    if(dl){
      dl.innerHTML="";
      S.allPlayers.forEach(p=>{
        const opt=document.createElement("option");
        opt.value=p;
        dl.appendChild(opt);
      });
    }
  })();

  // Teams from Lineups
  const tIdx=colLetterToIdx(COLS.lineups.team);
  let teams=[];
  for(let i=0;i<S.lineups.length;i++){
    const raw=S.lineups[i]?.[tIdx]; const t=hardTrim(raw);
    if(t && t.toLowerCase()!=="team") teams.push(t);
  }
  S.teams=[...new Set(teams)].sort();
  dlog("[Lineups] teams:", S.teams.slice(0,40));

  // Baseline lineup PER from default lineups
  S.teamPER={};
  for(const t of S.teams){
    const defLu=defaultLineupForTeam(t, S.lineups);
    S.teamPER[t]=lineupWeightedPER(defLu, S.player);
    dlog(`[PER] ${t}:`, S.teamPER[t]);
  }

  // Fill team dropdowns
  const awaySel=document.getElementById("awayTeam");
  const homeSel=document.getElementById("homeTeam");
  awaySel.innerHTML=""; homeSel.innerHTML="";
  S.teams.forEach(t=>{
    const a=document.createElement("option"); a.value=t; a.textContent=t; awaySel.appendChild(a);
    const b=document.createElement("option"); b.value=t; b.textContent=t; homeSel.appendChild(b);
  });
  if(S.teams.length>1) homeSel.selectedIndex=1;
  document.getElementById("status").textContent="Ready.";

  // Wire lineup editors
  awaySel.addEventListener("change", renderEditors);
  homeSel.addEventListener("change", renderEditors);
  document.getElementById("saveAway").addEventListener("click", ()=>saveEditor("away"));
  document.getElementById("resetAway").addEventListener("click", ()=>resetEditor("away"));
  document.getElementById("saveHome").addEventListener("click", ()=>saveEditor("home"));
  document.getElementById("resetHome").addEventListener("click", ()=>resetEditor("home"));

  // Extra buttons
  const compareBtn=document.getElementById("compareBtn");
  if(compareBtn) compareBtn.addEventListener("click", compareStats);
  const saveBtn=document.getElementById("saveGameBtn");
  if(saveBtn) saveBtn.addEventListener("click", saveGame);

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

// Roster builder: starters (from Lineups) + full player pool
function rosterForTeam(team){
  const starters = defaultLineupForTeam(team, S.lineups);
  const rest = S.allPlayers.filter(p => !starters.includes(p));
  return [...starters, ...rest]; // starters first
}

function renderOneEditor(side, team){
  const ids={ g1:`${side}_g1`, g2:`${side}_g2`, f1:`${side}_f1`, f2:`${side}_f2`, c:`${side}_c` };
  const roster=rosterForTeam(team);
  const cur = (S.overrides[team] && S.overrides[team].length===5) ? S.overrides[team]
            : defaultLineupForTeam(team, S.lineups);

  ["g1","g2","f1","f2","c"].forEach((slot,idx)=>{
    const input=document.getElementById(ids[slot]);
    if(!input) return;
    // If current player is in roster, keep; otherwise just leave whatever is typed
    if(cur[idx]) input.value = cur[idx];
  });

  const per=lineupWeightedPER(getEditorLineup(side), S.player);
  document.getElementById(side==="away"?"awayPER":"homePER").textContent=isNaN(per)?"—":per.toFixed(2);
}

function getEditorLineup(side){
  return [`${side}_g1`,`${side}_g2`,`${side}_f1`,`${side}_f2`,`${side}_c`]
    .map(id=>hardTrim(document.getElementById(id)?.value)).filter(Boolean);
}

function saveEditor(side){
  const team=(side==="away"?document.getElementById("awayTeam").value:document.getElementById("homeTeam").value);
  const lu=getEditorLineup(side); if(lu.length===0) return;
  S.overrides[team]=lu;
  S.teamPER[team]=lineupWeightedPER(lu, S.player);
  document.getElementById(side==="away"?"awayPER":"homePER").textContent=isNaN(S.teamPER[team])?"—":S.teamPER[team].toFixed(2);
}
function resetEditor(side){
  const team=(side==="away"?document.getElementById("awayTeam").value:document.getElementById("homeTeam").value);
  delete S.overrides[team];
  const defLu=defaultLineupForTeam(team, S.lineups);
  S.teamPER[team]=lineupWeightedPER(defLu, S.player);
  renderOneEditor(side, team);
}

/* 11) Predict */
function predict(){
  const awayTeam=document.getElementById("awayTeam").value;
  const homeTeam=document.getElementById("homeTeam").value;
  const bookSpread=parseFloat(document.getElementById("bookSpread").value);
  const bookTotal=parseFloat(document.getElementById("bookTotal").value);
  const awayB2B = document.getElementById("awayB2B")?.checked ?? false;
  const homeB2B = document.getElementById("homeB2B")?.checked ?? false;
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

  // Back-to-back penalty
  if(awayB2B) A_pts -= B2B_PENALTY;
  if(homeB2B) H_pts -= B2B_PENALTY;

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

/* 12) Stats comparison */
function compareStats(){
  const away=document.getElementById("awayTeam").value;
  const home=document.getElementById("homeTeam").value;
  const L=S.league;
  const div=document.getElementById("comparison");
  if(!div) return;

  function valOffReb(tm,isHome){
    const row=S.oreb[tm]; if(!row) return NaN;
    return isHome ? row.Home : row.Away;
  }
  function valDefReb(tm,isHome){
    const row=S.dreb[tm]; if(!row) return NaN;
    return isHome ? row.Home : row.Away;
  }
  function valPace(tm,isHome){
    const row=S.pace[tm]; if(!row) return L.pace;
    return isHome ? row.Home : row.Away;
  }
  function valOffEff(tm,isHome){
    const row=S.oeff[tm]; if(!row) return L.oe;
    return blend(isHome?row.Home:row.Away, row.L3);
  }
  function valDefEff(tm,isHome){
    const row=S.deff[tm]; if(!row) return L.de;
    return blend(isHome?row.Home:row.Away, row.L3);
  }

  const rows = [
    { label:"Off Reb %", a:valOffReb(away,false), h:valOffReb(home,true), higher:true,  fmt:v=> (v*100).toFixed(1)+"%" },
    { label:"Def Reb %", a:valDefReb(away,false), h:valDefReb(home,true), higher:true,  fmt:v=> (v*100).toFixed(1)+"%" },
    { label:"Pace",      a:valPace(away,false),   h:valPace(home,true),   higher:true,  fmt:v=> v.toFixed(1) },
    { label:"Off Eff",   a:valOffEff(away,false), h:valOffEff(home,true), higher:true,  fmt:v=> v.toFixed(3) },
    { label:"Def Eff",   a:valDefEff(away,false), h:valDefEff(home,true), higher:false, fmt:v=> v.toFixed(3) },
    { label:"Lineup PER",a:S.teamPER[away],       h:S.teamPER[home],      higher:true,  fmt:v=> v.toFixed(2) }
  ];

  let html = `<h3>Stat Comparison</h3><table class="compare-table"><thead><tr>
    <th>Stat</th><th>${away}</th><th>${home}</th></tr></thead><tbody>`;
  rows.forEach(r=>{
    const a = r.a, h = r.h;
    const aWin = r.higher ? a>h : a<h;
    const hWin = r.higher ? h>a : h<a;
    const aClass = aWin ? "fav-away" : "";
    const hClass = hWin ? "fav-home" : "";
    const fa = isNaN(a) ? "-" : r.fmt(a);
    const fh = isNaN(h) ? "-" : r.fmt(h);
    html += `<tr><td>${r.label}</td><td class="${aClass}">${fa}</td><td class="${hClass}">${fh}</td></tr>`;
  });
  html += "</tbody></table>";
  div.innerHTML = html;
}

/* 13) Save game predictions */
function saveGame(){
  const body=document.getElementById("savedGamesBody");
  if(!body) return;

  const away=document.getElementById("awayTeam").value;
  const home=document.getElementById("homeTeam").value;
  const awayScore=document.getElementById("awayScore").textContent || "";
  const homeScore=document.getElementById("homeScore").textContent || "";
  const modelTotal=document.getElementById("modelTotal").textContent || "";
  const bookTotal=document.getElementById("bookTotal").value || "";
  const modelSpread=document.getElementById("modelSpread").textContent || "";
  const bookSpread=document.getElementById("bookSpread").value || "";

  const tr=document.createElement("tr");
  tr.innerHTML = `
    <td>${away}</td>
    <td>${home}</td>
    <td>${awayScore}</td>
    <td>${homeScore}</td>
    <td>${modelTotal}</td>
    <td>${bookTotal}</td>
    <td>${modelSpread}</td>
    <td>${bookSpread}</td>`;
  body.appendChild(tr);
}

/* 14) Wire up */
document.getElementById("predictBtn").addEventListener("click", predict);
init().catch(err=>{
  document.getElementById("status").textContent="Load error — check CSV links/permissions in app.js";
  console.error(err);
});
