#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Read-only beta snapshot report. Never mutates player data and never prints names/tokens.
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {accountLevelFromXP} from '../shared/endgame-data.mjs';

export function summarizeProfiles(profiles=[]){
  const rows=profiles.filter(Boolean).map(p=>{
    const a=p.account||{},t=a.totals||{};
    const bosses=Object.entries(t).filter(([k])=>k.startsWith('boss:')).reduce((n,[,v])=>n+(Number(v)||0),0);
    return {accountLevel:accountLevelFromXP(Number(a.accountXP)||0),accountXP:Number(a.accountXP)||0,kills:Number(t.kills)||0,bosses,dungeons:Number(t.dungeons)||0,bestLevel:Number(t.bestLevel)||1,forgeUnlocked:a.unlocks?.forge===true,enchanterUnlocked:a.unlocks?.enchanter===true,crucibleUnlocked:a.unlocks?.crucible===true};
  });
  const band=n=>n<5?'1-4':n<10?'5-9':n<17?'10-16':n<23?'17-22':n<27?'23-26':n<40?'27-39':n<50?'40-49':'50';
  const levels={};for(const r of rows)levels[band(r.accountLevel)]=(levels[band(r.accountLevel)]||0)+1;
  const sum=k=>rows.reduce((n,r)=>n+r[k],0),avg=k=>rows.length?+(sum(k)/rows.length).toFixed(2):0;
  const pct=fn=>rows.length?+(rows.filter(fn).length/rows.length*100).toFixed(2):0;
  return {accounts:rows.length,accountLevelBands:levels,averages:{accountLevel:avg('accountLevel'),accountXP:avg('accountXP'),kills:avg('kills'),bosses:avg('bosses'),dungeons:avg('dungeons'),bestCharacterLevel:avg('bestLevel')},unlockRatesPct:{enchanter:pct(r=>r.enchanterUnlocked),forge:pct(r=>r.forgeUnlocked),crucible:pct(r=>r.crucibleUnlocked)},totals:{kills:sum('kills'),bosses:sum('bosses'),dungeons:sum('dungeons')}};
}

export function reportDatabase(dbPath){
  if(!existsSync(dbPath))throw new Error('Beta metrics DB not found: '+dbPath);
  const db=new DatabaseSync(dbPath,{readOnly:true});
  try{
    const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
    if(!tables.has('players'))throw new Error('players table missing');
    const profiles=[];for(const row of db.prepare('SELECT profile FROM players').all()){try{profiles.push(JSON.parse(row.profile));}catch{}}
    const progression=summarizeProfiles(profiles);
    let retention=null;if(tables.has('player_activity')){
      const today=Math.floor(Date.now()/86400000),by=new Map();
      for(const r of db.prepare('SELECT player_id AS playerId,day FROM player_activity').all()){if(!by.has(r.playerId))by.set(r.playerId,new Set());by.get(r.playerId).add(Number(r.day));}
      const metric=h=>{let eligible=0,returned=0;for(const days of by.values()){const first=Math.min(...days);if(today-first<h)continue;eligible++;if(days.has(first+h))returned++;}return{eligible,returned,rate:eligible?+(returned/eligible).toFixed(4):0};};
      retention={trackedAccounts:by.size,d1:metric(1),d7:metric(7),d30:metric(30)};
    }
    return {ok:true,privacy:'aggregate-only; no account identifiers emitted',progression,retention,limitations:['No play-duration telemetry: XP/hour must be measured by beta session logs or a future duration metric.','Snapshot report cannot infer boss win-rate without attempt counters.']};
  }finally{db.close();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const dbPath=resolve(process.env.BETA_DB_PATH||'.data/state-authority.sqlite');
  try{console.log(JSON.stringify(reportDatabase(dbPath),null,2));}catch(error){console.error(JSON.stringify({ok:false,error:error.message},null,2));process.exitCode=1;}
}
