#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {VERSION} from '../shared/data.mjs';
import { readFileSync,existsSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { parseConfig,validateConfig,supportedNode } from './config.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
try{
 if(!supportedNode(process.versions.node))throw new Error(`Node.js ${process.versions.node} ist zu alt. Benötigt: mindestens 22.16.0.`);
 const args=process.argv.slice(2),allowed=new Set(['--lan','--check','--help','--no-build','--no-browser']);
 if(args.some(a=>!allowed.has(a)))throw new Error('Unbekannte Option. Erlaubt: --lan, --check, --help, --no-build, --no-browser.');
 if(args.includes('--help')){console.log('Nyrathen starten: node tools/launch.mjs [--lan] [--no-build] [--no-browser]\nUmgebung prüfen: node tools/launch.mjs --check\nLädt optionale .env. Kein Hosting, keine Käufe, keine Firewall-Änderung.');process.exit(0);}
 if(args.includes('--check')){const p=spawnSync(process.execPath,['tools/doctor.mjs'],{stdio:'inherit'});process.exit(p.status??1);}
 const env=validateConfig({...process.env,...Object.fromEntries(Object.entries(existsSync('.env')?parseConfig(readFileSync('.env','utf8')):{}).filter(([key])=>process.env[key]===undefined))});
 if(args.includes('--lan'))env.HOST='0.0.0.0';env.HOST||='127.0.0.1';Object.assign(process.env,env);
 if(!args.includes('--no-build')){const build=spawnSync(process.execPath,['tools/build.mjs'],{stdio:'inherit'});if(build.status!==0)process.exit(build.status??1);}
 const {createGameServer}=await import('../server/server.mjs');const app=createGameServer();let stopping=false;
 const stop=async(code=0)=>{if(stopping)return;stopping=true;console.log('\nSpeichere und beende den Server …');try{await app.close();}catch(e){console.error('Fehler beim Beenden:',e.message);code=1;}process.exit(code);};
 app.server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port bereits belegt. Anderen PORT in .env wählen.':e.message);void stop(1);});
 process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
 app.server.listen(+env.PORT,env.HOST,()=>{
  console.log(`\nNYRATHEN ${VERSION} · Server aktiv\nHealth/API: http://localhost:${env.PORT}/healthz\nIm Spiel: Gemeinsam spielen → Region PUBLIC → Smaragd-01`);
  if(env.HOST==='0.0.0.0'){for(const list of Object.values(networkInterfaces()))for(const i of list||[])if(i.family==='IPv4'&&!i.internal)console.log(`WLAN/LAN-Server: http://${i.address}:${env.PORT}`);console.log('LAN-Modus: nur im vertrauten privaten Netz verwenden. Keine Portweiterleitung eingerichtet.');}
  console.log('Zum Beenden Strg+C. Fenster bis zur Speicherung geöffnet lassen.\n');
 });
}catch(e){console.error('Start abgebrochen:',e.message);process.exit(1);}
