#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// No public admin API and no hidden network access. Write operations require a stopped server.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {ProfileStore} from '../server/store.mjs';
import {SafetyStore} from '../server/safety.mjs';
import {acquireDataLock} from '../server/operations.mjs';
import {parseConfig} from './config.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let release,store;
try{
 const args=process.argv.slice(2),command=args.shift();
 if(!command||command==='--help'){
  console.log('Meldungen: npm run moderation -- list\nEntscheiden: npm run moderation -- review ID actioned|dismissed "Begründung" --confirm\nChat begrenzen: npm run moderation -- mute SPIELER_ID MINUTEN "Begründung" --confirm\n0 Minuten hebt eine Chatsperre auf. Für Schreiboperationen den Server vorher regulär stoppen.');
  process.exit(0);
 }
 const config=existsSync(resolve(root,'.env'))?parseConfig(readFileSync(resolve(root,'.env'),'utf8')):{};
 const file=resolve(root,process.env.DATA_PATH||config.DATA_PATH||'.data/nyrathen.sqlite');
 if(!existsSync(file))throw new Error('Keine bestehende Serverdatenbank gefunden.');
 if(command==='list'){
  if(args.length)throw new Error('list nimmt keine weiteren Argumente an.');
  const db=new DatabaseSync(file,{readOnly:true});
  try{console.log(JSON.stringify(db.prepare('SELECT id,reporter,target,reason,quote,created_at,status,reviewed_at,review_note FROM player_reports ORDER BY created_at DESC LIMIT 200').all(),null,2));}finally{db.close();}
 }else{
  if(!['review','mute'].includes(command)||args.length!==4||args[3]!=='--confirm')throw new Error('Ungültiger Aufruf oder Bestätigung fehlt. --help zeigt die Syntax.');
  release=acquireDataLock(file);store=new ProfileStore(file);const safety=new SafetyStore(store.db);
  store.transaction(()=>{
   if(command==='review'&&!safety.review(args[0],args[1],args[2]))throw new Error('Meldung nicht gefunden.');
   if(command==='mute')safety.mute(args[0],Number(args[1]),args[2]);
  });
  console.log(JSON.stringify({ok:true,operation:command,id:args[0]}));
 }
}catch(error){console.error(error.message);process.exitCode=1;}
finally{store?.close();release?.();}
