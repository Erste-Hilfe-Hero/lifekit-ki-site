// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { existsSync,readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseConfig,validateConfig } from './config.mjs';
import { createBackup, inspectDatabase, restoreBackup } from '../server/operations.mjs';
const [command,...args]=process.argv.slice(2);
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
try {
  const config=validateConfig({...process.env,...Object.fromEntries(Object.entries(existsSync('.env')?parseConfig(readFileSync('.env','utf8')):{}).filter(([key])=>process.env[key]===undefined))});
  const path=resolve(config.DATA_PATH||'.data/nyrathen.sqlite');
  let result;
  if(command==='inspect')result=inspectDatabase(args[0]||path);
  else if(command==='backup') {const db=new DatabaseSync(path,{readOnly:true});try{result=await createBackup(db,args[0]||config.BACKUP_DIRECTORY||path+'.backups',{retain:Number(config.BACKUP_RETAIN)});}finally{db.close();}}
  else if(command==='restore'&&args[0])result=await restoreBackup(args[0],path,{confirm:args.includes('--confirm=RESTORE')});
  else throw new Error('Aufruf: node tools/database.mjs inspect [datei] | backup [ordner] | restore DATEI --confirm=RESTORE. DATA_PATH wählt die Serverdatenbank.');
  console.log(JSON.stringify(result,null,2));
} catch(error){console.error(error.message);process.exitCode=1;}
