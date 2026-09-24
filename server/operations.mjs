// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Operational safeguards. Backups are consistent SQLite snapshots, never copies of a live WAL file.
import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, closeSync, writeFileSync, readFileSync, rmSync, readdirSync, statSync, chmodSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve, basename, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { hostname } from 'node:os';
export function acquireDataLock(path) {
  if(path===':memory:')return ()=>{};
  mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});
  const lock=resolve(path)+'.lock',owner=randomUUID(),host=hostname();let fd;
  const create=()=>{fd=openSync(lock,'wx',0o600);writeFileSync(fd,JSON.stringify({pid:process.pid,host,owner,startedAt:new Date().toISOString()}));};
  try {create();}
  catch(error){
    if(error.code!=='EEXIST')throw error;
    // A SIGKILL/power loss cannot clean the lock. Reclaim only a same-host lock whose PID no
    // longer exists; unknown/remote locks remain fail-closed to protect a live SQLite writer.
    let stale=false;try{const holder=JSON.parse(readFileSync(lock,'utf8'));if(holder?.host===host&&Number.isInteger(holder.pid)&&holder.pid>0){try{process.kill(holder.pid,0);}catch(e){if(e.code==='ESRCH')stale=true;}}}catch{}
    if(stale){rmSync(lock,{force:true});fd=undefined;create();}
    else throw new Error('Diese Datenbank ist gesperrt: '+lock+'. Läuft bereits ein Server? Verwaiste fremde/ungeklärte Sperren werden nicht automatisch entfernt.');
  } finally {if(fd!==undefined)closeSync(fd);}
  return ()=>{try{if(JSON.parse(readFileSync(lock,'utf8')).owner===owner)rmSync(lock);}catch{}};
}
export function inspectDatabase(path) {
  const db=new DatabaseSync(resolve(path),{readOnly:true});
  try {
    const integrity=db.prepare('PRAGMA quick_check').all().map(r=>Object.values(r)[0]);
    if(integrity.length!==1||integrity[0]!=='ok')throw new Error('SQLite-Integritätsprüfung fehlgeschlagen.');
    const required=['players','realms','social','credentials'];
    const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
    if(required.some(t=>!tables.has(t)))throw new Error('Keine vollständige Nyrathen-Datenbank.');
    const counts={};for(const table of required)counts[table]=db.prepare('SELECT COUNT(*) AS n FROM '+table).get().n;
    return{integrity:'ok',counts,bytes:statSync(path).size};
  } finally {db.close();}
}

export function pruneBackups(directory,{retain=2}={}) {
  const dir=resolve(directory),keep=Math.max(1,Math.min(100,Math.floor(Number(retain))||2));
  if(!existsSync(dir))return{directory:dir,kept:0,removed:0,partialsRemoved:0};
  let removed=0,partialsRemoved=0;
  const files=readdirSync(dir);
  const backups=files.filter(f=>/^nyrathen-.*\.sqlite$/.test(f)).sort().reverse();
  for(const old of backups.slice(keep)){rmSync(join(dir,old),{force:true});rmSync(join(dir,old+'.sha256'),{force:true});removed++;}
  for(const file of files){if(!/\.partial(?:-wal|-shm)?$/.test(file))continue;rmSync(join(dir,file),{force:true});partialsRemoved++;}
  return{directory:dir,kept:Math.min(backups.length,keep),removed,partialsRemoved};
}

export async function createBackup(db,directory,{retain=8,now=new Date()}={}) {
  const dir=resolve(directory);mkdirSync(dir,{recursive:true,mode:0o700});
  const filename='nyrathen-'+now.toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8)+'.sqlite';
  const final=join(dir,filename),temporary=final+'.partial';
  try {
    await backup(db,temporary,{rate:100});
    // A portable backup must not depend on WAL/SHM sidecars.
    const portable=new DatabaseSync(temporary);try{portable.exec('PRAGMA journal_mode=DELETE');}finally{portable.close();}
    chmodSync(temporary,0o600);
    const report=inspectDatabase(temporary);renameSync(temporary,final);
    const sha256=createHash('sha256').update(readFileSync(final)).digest('hex');
    writeFileSync(final+'.sha256',sha256+'  '+filename+'\n',{mode:0o600});
    const all=readdirSync(dir).filter(f=>/^nyrathen-.*\.sqlite$/.test(f)).sort().reverse();
    for(const old of all.slice(Math.max(1,Math.min(100,Math.floor(retain)||8)))){rmSync(join(dir,old),{force:true});rmSync(join(dir,old+'.sha256'),{force:true});}
    return{...report,file:filename,sha256,createdAt:now.toISOString()};
  } catch(error) {for(const suffix of ['', '-wal', '-shm'])rmSync(temporary+suffix,{force:true});throw error;}
}
export async function restoreBackup(source,destination,{confirm=false}={}) {
  if(!confirm)throw new Error('Wiederherstellung benötigt --confirm=RESTORE.');
  source=resolve(source);destination=resolve(destination);
  if(source===destination)throw new Error('Quelle und Ziel müssen verschieden sein.');
  const report=inspectDatabase(source);
  if(existsSync(source+'.sha256')){
    const expected=readFileSync(source+'.sha256','utf8').split(/\s/)[0];
    if(createHash('sha256').update(readFileSync(source)).digest('hex')!==expected)throw new Error('SHA-256 der Sicherung stimmt nicht.');
  }
  const release=acquireDataLock(destination);let sourceDB;const temp=destination+'.restore-'+randomUUID();
  try {
    sourceDB=new DatabaseSync(source,{readOnly:true});await backup(sourceDB,temp);sourceDB.close();sourceDB=null;const portable=new DatabaseSync(temp);try{portable.exec('PRAGMA journal_mode=DELETE');}finally{portable.close();}inspectDatabase(temp);chmodSync(temp,0o600);
    // Preserve the complete previous checkpoint before touching any current file.
    let previous=null;
    if(existsSync(destination)){
      const old=new DatabaseSync(destination,{readOnly:true});
      try{previous=await createBackup(old,destination+'.before-restore',{retain:3});}finally{old.close();}
    }
    rmSync(destination+'-wal',{force:true});rmSync(destination+'-shm',{force:true});renameSync(temp,destination);
    return{restored:basename(destination),...report,previous};
  } finally {sourceDB?.close();rmSync(temp,{force:true});release();}
}
