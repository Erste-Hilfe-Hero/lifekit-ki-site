#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Local release qualification. External store/cloud credentials are separately gated by production:preflight.
import {spawnSync} from 'node:child_process';
const steps=[
 ['regression',[process.execPath,'--test','tests/*.test.mjs'],true],
 ['fuzz',[process.execPath,'tools/fuzz.mjs']],
 ['dr',[process.execPath,'tools/dr-drill.mjs']],
 ['economy-race',[process.execPath,'tools/economy-race.mjs']],
 ['chaos',[process.execPath,'tools/chaos-failover.mjs']],
 ['worker-stress',[process.execPath,'tools/stress-node.mjs']]
];
for(const [name,cmd,shell] of steps){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',shell:!!shell,env:{...process.env,SNAPSHOT_HZ:process.env.SNAPSHOT_HZ||'5',STRESS_CLIENTS:process.env.STRESS_CLIENTS||'100',STRESS_SECONDS:process.env.STRESS_SECONDS||'8',CHAOS_CLIENTS:process.env.CHAOS_CLIENTS||'80'}});if(r.status!==0)throw new Error(name+' qualification failed');}
console.log(JSON.stringify({ok:true,qualified:['regression','fuzz','dr','economy-race','chaos','100-active-worker']},null,2));
