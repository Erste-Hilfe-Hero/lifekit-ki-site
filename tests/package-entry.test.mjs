// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';import {tmpdir}from'node:os';import{join}from'node:path';
import{spawn}from'node:child_process';import net from'node:net';import{setTimeout as sleep}from'node:timers/promises';
import{parseConfig,validateConfig,supportedNode}from'../tools/config.mjs';import{createGameServer}from'../server/server.mjs';
test('config parses only whitelisted keys, comments and matching quotes',()=>{
 assert.deepEqual(parseConfig('# config\nHOST=127.0.0.1\nPORT = 3001 # note\nDATA_PATH="a b.sqlite"'),{HOST:'127.0.0.1',PORT:'3001',DATA_PATH:'a b.sqlite'});
 assert.throws(()=>parseConfig('NODE_OPTIONS=--require=evil'),/unbekannte/);
 assert.throws(()=>parseConfig('DATA_PATH="open'),/Anführungszeichen/);
});
test('config does not execute interpolation or replace arbitrary process settings',()=>{
 assert.equal(parseConfig('DATA_PATH=$(rm -rf example)').DATA_PATH,'$(rm -rf example)');
 assert.throws(()=>parseConfig('PATH=/untrusted'),/unbekannte/);
});
test('launch config defaults to bounded port and backups',()=>{
 const c=validateConfig({});assert.equal(c.PORT,'3000');assert.equal(c.BACKUP_SECONDS,'900');assert.equal(c.BACKUP_RETAIN,'8');
 for(const PORT of ['0','65536','bad','1.2'])assert.throws(()=>validateConfig({PORT}));
 for(const BACKUP_SECONDS of ['NaN','-1','0','900000'])assert.throws(()=>validateConfig({BACKUP_SECONDS}));
});
test('public address and host reject unsafe or malformed launch settings',()=>{
 for(const PUBLIC_URL of ['http://public.example','https://user:pass@host.example','https://host.example/a','https://host.example/#secret'])assert.throws(()=>validateConfig({PUBLIC_URL}));
 assert.throws(()=>validateConfig({HOST:'localhost; sh'}));
 assert.equal(validateConfig({PUBLIC_URL:'https://game.example',HOST:'::1'}).HOST,'::1');
});
test('supported runtime version boundary is explicit',()=>{
 for(const version of ['20.20.0','22.15.9','x'])assert.equal(supportedNode(version),false);
 for(const version of ['22.16.0','22.20.0','25.6.0'])assert.equal(supportedNode(version),true);
});
test('server rejects bad backup configuration before creating a writer lock',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rw-config-'));const db=join(dir,'game.sqlite');
 try{assert.throws(()=>createGameServer({dataPath:db,backupSeconds:NaN}));assert.throws(()=>createGameServer({dataPath:db,backupRetain:0}));assert(!existsSync(db+'.lock'));}finally{rmSync(dir,{recursive:true,force:true});}
});
test('packaged Linux/Node launcher starts a real server and shuts down with a final backup',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'rw-launch-'));const db=join(dir,'game.sqlite');
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const child=spawn(process.execPath,['tools/launch.mjs','--no-build'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_PATH:db,BACKUP_DIRECTORY:join(dir,'backups')},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);const exit=new Promise(r=>child.once('exit',(code,signal)=>r({code,signal})));
 try{
  let up=false;for(let i=0;i<100;i++){try{const r=await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(400)});const h=await r.json();if(r.ok&&h.version==='5.7.0'){up=true;break;}}catch{}if(child.exitCode!==null)break;await sleep(50);}
  assert(up,log);assert.match(log,/PUBLIC/);assert.match(log,/localhost:/);assert(!log.includes('WLAN/LAN-Adresse:'));
  child.kill('SIGTERM');const result=await exit;assert.equal(result.code,0,log);assert(!existsSync(db+'.lock'));assert(existsSync(join(dir,'backups')));
 }finally{if(child.exitCode===null){child.kill('SIGTERM');await exit;}rmSync(dir,{recursive:true,force:true});}
});
test('legacy database without action receipt table opens without losing profiles',async()=>{
 const {ProfileStore}=await import('../server/store.mjs');const dir=mkdtempSync(join(tmpdir(),'rw-legacy-'));const path=join(dir,'old.sqlite');let db;
 try{db=new ProfileStore(path);const old=db.create('Legacy','ranger');db.db.exec('DROP TABLE action_receipts');db.close();db=new ProfileStore(path);assert.equal(db.find(old.token).id,old.id);assert.equal(db.find(old.token).profile.name,'Legacy');assert.equal(db.receipt(old.id,'nonexistent'),undefined);}
 finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
test('database CLI inspects and backs up the explicitly selected database',async()=>{
 const {spawnSync}=await import('node:child_process');const {ProfileStore}=await import('../server/store.mjs');
 const dir=mkdtempSync(join(tmpdir(),'rw-dbcli-')),path=join(dir,'game.sqlite'),backupDir=join(dir,'backup');const store=new ProfileStore(path);
 try{store.create('Cli','ranger');for(const args of [['inspect'],['backup',backupDir]]){const p=spawnSync(process.execPath,['tools/database.mjs',...args],{encoding:'utf8',env:{...process.env,DATA_PATH:path}});assert.equal(p.status,0,p.stderr);const result=JSON.parse(p.stdout);assert.equal(result.integrity,'ok');assert.equal(result.counts.players,1);}assert(existsSync(backupDir));}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
