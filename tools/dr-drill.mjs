#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {mkdtempSync,rmSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {ProfileStore} from '../server/store.mjs';
import {createBackup,restoreBackup,inspectDatabase} from '../server/operations.mjs';
const dir=mkdtempSync(join(tmpdir(),'nyrathen-dr-')),source=join(dir,'source.sqlite'),target=join(dir,'restored.sqlite'),backups=join(dir,'backups');
let store;const started=performance.now();
try{
 store=new ProfileStore(source);const record=store.create('RestoreDrill','warden');record.profile.bank=731;store.save(record.id,record.profile);store.saveWorld('DRILL',{marker:'world-ok',players:[]});store.saveSocial({guilds:{},friends:{}});const expectedId=record.id;const expectedHash=store.hash(record.token);
 const backup=await createBackup(store.db,backups,{retain:2});store.close();store=null;const backupPath=join(backups,backup.file);if(!existsSync(backupPath+'.sha256'))throw new Error('Backup sidecar missing');
 const restored=await restoreBackup(backupPath,target,{confirm:true});const report=inspectDatabase(target);const verify=new ProfileStore(target);try{const row=verify.db.prepare('SELECT id,token_hash,profile FROM players WHERE id=?').get(expectedId);if(!row||row.token_hash!==expectedHash||JSON.parse(row.profile).bank!==731)throw new Error('Restored player mismatch');if(verify.loadWorld('DRILL')?.marker!=='world-ok')throw new Error('Restored world mismatch');}finally{verify.close();}
 const elapsed=performance.now()-started;console.log(JSON.stringify({ok:true,backup,restored,report,restoreDurationMs:+elapsed.toFixed(2),shaSidecar:readFileSync(backupPath+'.sha256','utf8').trim().split(/\s+/)[0]},null,2));
}catch(error){console.error(error.stack||error.message);process.exitCode=1;}finally{store?.close();rmSync(dir,{recursive:true,force:true});}
