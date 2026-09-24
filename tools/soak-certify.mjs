#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Long single-worker endurance harness with parallel v5.7 commerce/entitlement churn.
// Real multi-node 1k soak remains an external evidence gate.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const hours=Number(process.env.SOAK_HOURS||6),clients=Number(process.env.SOAK_CLIENTS||80);
if(!Number.isFinite(hours)||hours<1||hours>24)throw new Error('SOAK_HOURS 1–24');
if(!Number.isInteger(clients)||clients<2||clients>1000)throw new Error('SOAK_CLIENTS 2–1000');
const seconds=Math.round(hours*3600),dir=resolve(process.env.NYRATHEN_TEST_REPORT_DIR||'release/verification/v5.7/long-soak');mkdirSync(dir,{recursive:true});
const env={...process.env,STRESS_CLIENTS:String(clients),STRESS_SECONDS:String(seconds),STRESS_P99_SLO_MS:process.env.STRESS_P99_SLO_MS||'180',STRESS_MAX_RSS_MB:process.env.STRESS_MAX_RSS_MB||'768',STRESS_MAX_BACKPRESSURE_RATE:process.env.STRESS_MAX_BACKPRESSURE_RATE||'0.01',STRESS_MAX_INPUT_TIMEOUT_RATE:process.env.STRESS_MAX_INPUT_TIMEOUT_RATE||'0.02',COMMERCE_SOAK_SECONDS:process.env.COMMERCE_SOAK_SECONDS||String(seconds),NYRATHEN_TEST_REPORT_DIR:dir};
const started=new Date().toISOString();
const run=(label,args)=>new Promise(resolveRun=>{const child=spawn(process.execPath,args,{stdio:'inherit',env});child.once('error',error=>resolveRun({label,status:null,error:error.message}));child.once('exit',(status,signal)=>resolveRun({label,status,signal,error:null}));});
const results=await Promise.all([run('gameplay',['tools/stress-node.mjs']),run('commerce',['tools/commerce-soak.mjs'])]);
const ok=results.every(x=>x.status===0&&!x.error),report={ok,hours,clients,commerceSeconds:Number(env.COMMERCE_SOAK_SECONDS),started,finished:new Date().toISOString(),results,scope:'local single-worker gameplay endurance + independent commerce/entitlement endurance; does not satisfy external multi-node 1k or physical-store/device evidence'};
writeFileSync(resolve(dir,'soak-summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!ok)process.exitCode=1;
