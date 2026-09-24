#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {spawnSync} from 'node:child_process';
const steps=[
 ['regression',['--test','tests/*.test.mjs'],true,120000,{}],
 ['mobile-preflight',['tools/release-mobile.mjs'],false,120000,{}],
 ['store-policy',['tools/store-policy-preflight.mjs'],false,60000,{}],
 ['fuzz',['tools/fuzz.mjs'],false,120000,{}],
 ['security',['tools/security-audit.mjs'],false,120000,{}],
 ['dr',['tools/dr-drill.mjs'],false,120000,{}],
 ['economy-race',['tools/economy-race.mjs'],false,120000,{}],
 ['economy-health',['tools/economy-health.mjs'],false,60000,{}],
 ['chaos',['tools/chaos-failover.mjs'],false,180000,{CHAOS_CLIENTS:'80'}],
 ['state-authority-burst',['tools/state-authority-burst.mjs'],false,120000,{}],
 ['capacity-evidence',['tools/capacity-evidence.mjs'],false,60000,{CAPACITY_EVIDENCE_REQUIRE_EXTERNAL:'false'}],
 ['session-burst-1000',['tools/cluster-session-burst.mjs'],false,240000,{}],
 ['evidence',['tools/release-evidence.mjs'],false,60000,{}]
];
const results=[];
for(const [name,args,shell,timeout,extraEnv] of steps){
 const started=Date.now();
 const r=spawnSync(process.execPath,args,{stdio:'inherit',shell:!!shell,timeout,env:{...process.env,...extraEnv}});
 if(r.error)throw new Error(`${name} failed: ${r.error.message}`);
 if(r.status!==0)throw new Error(name+' failed with exit '+r.status);
 results.push({name,ok:true,durationMs:Date.now()-started});
}
console.log(JSON.stringify({ok:true,releaseCandidate:'5.7.0',internalQualification:'passed',externalEvidence:'reported-separately',results},null,2));
