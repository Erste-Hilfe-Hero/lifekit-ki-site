// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ProfileStore} from '../server/store.mjs';
import {pruneBackups} from '../server/operations.mjs';

test('backup pruning retains newest snapshots and removes stale partials',()=>{
  const dir=mkdtempSync(join(tmpdir(),'nyrathen-backup-prune-'));
  try{
    for(let i=0;i<5;i++){const name=`nyrathen-2026-09-23T17-0${i}-00-000Z-0000000${i}.sqlite`;writeFileSync(join(dir,name),'db'+i);writeFileSync(join(dir,name+'.sha256'),'x');}
    writeFileSync(join(dir,'nyrathen-stale.sqlite.partial'),'partial');
    writeFileSync(join(dir,'nyrathen-stale.sqlite.partial-wal'),'wal');
    const result=pruneBackups(dir,{retain:2});
    const files=readdirSync(dir);assert.equal(result.removed,3);assert.equal(result.partialsRemoved,2);
    assert.equal(files.filter(x=>/\.sqlite$/.test(x)).length,2);assert.equal(files.some(x=>x.includes('.partial')),false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('transaction preserves original sqlite failure and leaves no open transaction',()=>{
  const store=new ProfileStore(':memory:');
  try{
    assert.throws(()=>store.transaction(()=>{throw new Error('original-failure');}),/original-failure/);
    assert.equal(store.db.isTransaction,false);
    const row=store.create('Rollback','ranger');assert.ok(row.id);
  }finally{store.close();}
});

test('late activity after account deletion is ignored instead of violating foreign key',()=>{
  const store=new ProfileStore(':memory:');
  try{
    const row=store.create('Activity','weaver');store.delete(row.id);
    const result=store.recordActivity(row.id);assert.equal(result.recorded,false);
  }finally{store.close();}
});


test('late action receipt after account deletion is ignored instead of violating foreign key',()=>{
  const store=new ProfileStore(':memory:');
  try{
    const row=store.create('ReceiptRace','ranger');store.delete(row.id);
    const result=store.saveReceipt(row.id,'request-12345','hash',true);assert.equal(result.saved,false);assert.equal(result.missing,true);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM action_receipts').get().n,0);
  }finally{store.close();}
});
