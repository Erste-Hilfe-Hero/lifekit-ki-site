import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeProfiles} from '../tools/beta-metrics-report.mjs';
import {accountXPForLevel} from '../shared/endgame-data.mjs';

test('v5.7 beta aggregate metrics expose progression without account identifiers',()=>{
  const r=summarizeProfiles([
    {account:{accountXP:accountXPForLevel(5),totals:{kills:100,dungeons:2,'boss:captain':1},unlocks:{enchanter:false,forge:false,crucible:false}}},
    {account:{accountXP:accountXPForLevel(27),totals:{kills:900,dungeons:12,'boss:captain':3,'boss:lich':2},unlocks:{enchanter:true,forge:true,crucible:true}}}
  ]);
  assert.equal(r.accounts,2);assert.equal(r.totals.kills,1000);assert.equal(r.totals.bosses,6);assert.equal(r.unlockRatesPct.forge,50);assert(!('names' in r));
});

test('v5.7 locked account curve remains reachable and dungeon premium cannot bypass unlock ordering',()=>{
  assert.equal(accountXPForLevel(5),1632);assert.equal(accountXPForLevel(17),26112);assert.equal(accountXPForLevel(23),49368);assert.equal(accountXPForLevel(27),68952);assert.equal(accountXPForLevel(50),244902);
  assert(accountXPForLevel(5)<accountXPForLevel(17));assert(accountXPForLevel(17)<accountXPForLevel(23));assert(accountXPForLevel(23)<accountXPForLevel(27));
});

test('v5.7 admin status remains readable before optional economy/admin tables exist',async t=>{
  const {mkdtempSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {spawnSync}=await import('node:child_process');
  const {ProfileStore}=await import('../server/store.mjs');
  const dir=mkdtempSync(join(tmpdir(),'nyr-admin-status-')),file=join(dir,'state.sqlite');
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const store=new ProfileStore(file);store.create('AdminStatus','ranger');store.close();
  const run=spawnSync(process.execPath,['tools/admin.mjs','status'],{cwd:process.cwd(),env:{...process.env,DATA_PATH:file},encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);const out=JSON.parse(run.stdout);assert.equal(out.players,1);assert.equal(out.economyReceipts,0);assert.equal(out.adminAuditRows,0);
});
