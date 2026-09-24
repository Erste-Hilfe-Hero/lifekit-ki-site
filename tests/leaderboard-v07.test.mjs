// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { ProfileStore } from '../server/store.mjs';
import { createGameServer } from '../server/server.mjs';
import { PROTOCOL } from '../shared/data.mjs';

test('persistent fame leaderboard sorts by fame then dungeons and kills without exposing account credentials',()=>{
  const store=new ProfileStore(':memory:');
  try{
    const alpha=store.create('Alpha','warden'),beta=store.create('Beta','ranger'),gamma=store.create('Gamma','weaver');
    alpha.profile.fame=120;alpha.profile.account.totals.dungeons=2;alpha.profile.account.totals.kills=80;store.save(alpha.id,alpha.profile);
    beta.profile.fame=120;beta.profile.account.totals.dungeons=5;beta.profile.account.totals.kills=60;store.save(beta.id,beta.profile);
    gamma.profile.fame=70;gamma.profile.account.totals.dungeons=9;gamma.profile.account.totals.kills=300;store.save(gamma.id,gamma.profile);
    const board=store.leaderboard(3);
    assert.deepEqual(board.map(x=>x.name),['Beta','Alpha','Gamma']);
    assert.deepEqual(board.map(x=>x.rank),[1,2,3]);
    assert.equal(board[0].dungeons,5);
    assert.equal('id' in board[0],false);
    assert.equal('token' in board[0],false);
    assert.equal('username' in board[0],false);
  } finally { store.close(); }
});

test('session snapshots include refreshed server-wide leaderboard',async t=>{
  const app=createGameServer({dataPath:':memory:'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
  const base='http://127.0.0.1:'+app.server.address().port;
  const join=async name=>{const r=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({protocol:PROTOCOL,name,classId:'warden',room:'PUBLIC'})});assert.equal(r.status,200);return r.json();};
  const a=await join('Alpha'),b=await join('Beta');
  const engine=app.rooms.get('PUBLIC').engine;engine.players.get(a.playerId).fame=90;engine.players.get(b.playerId).fame=150;
  app.store.save(a.playerId,engine.profile(a.playerId));app.store.save(b.playerId,engine.profile(b.playerId));
  // A committed action invalidates the cached ranking and returns a fresh snapshot.
  const action=await fetch(base+'/api/action',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+a.token},body:JSON.stringify({type:'nonsense',requestId:'rankrefresh01'})});
  assert.equal(action.status,200);const body=await action.json();
  assert.equal(body.snapshot.leaderboard[0].name,'Beta');
  assert.equal(body.snapshot.leaderboard[0].fame,150);
  assert.equal(body.snapshot.leaderboard.length,2);
});
