#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Prefer fresh real multi-service staging evidence; optionally fall back to a local 3x100 qualification.
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const file=process.env.CAPACITY_EVIDENCE_FILE||'release/verification/v5.5/railway-active-300/summary.json';
const maxAgeMs=Number(process.env.CAPACITY_EVIDENCE_MAX_AGE_MS||30*86400000),slo=Number(process.env.STRESS_P99_SLO_MS||180);
let evidence=null;if(existsSync(file)){try{evidence=JSON.parse(readFileSync(file,'utf8'));}catch{}}
const at=Date.parse(evidence?.at||''),fresh=Number.isFinite(at)&&Date.now()-at<=maxAgeMs;
if(evidence?.status==='passed'&&Number(evidence?.loadTest?.players||0)>=300&&Number(evidence?.loadTest?.eventLoopP99MaxMs||Infinity)<=slo&&fresh){
 console.log(JSON.stringify({ok:true,source:'external-staging',provider:evidence.provider,players:evidence.loadTest.players,p99Ms:evidence.loadTest.eventLoopP99MaxMs,sloMs:slo,at:evidence.at},null,2));process.exit(0);
}
if(String(process.env.CAPACITY_EVIDENCE_REQUIRE_EXTERNAL||'false')==='true'){
 console.error(JSON.stringify({ok:false,error:'Fresh external capacity evidence missing or below SLO',file},null,2));process.exit(1);
}
const r=spawnSync(process.execPath,['tools/cluster-stress.mjs'],{stdio:'inherit',timeout:240000,env:{...process.env,STRESS_TOTAL:'300',STRESS_WORKERS:'3',STRESS_SECONDS:'5',STRESS_P99_SLO_MS:String(slo)}});
if(r.error||r.status!==0)process.exit(r.status||1);
