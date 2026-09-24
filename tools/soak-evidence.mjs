#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {validateEnduranceSoakEvidence} from '../server/production.mjs';

const args=process.argv.slice(2),flag=name=>args.includes(name),value=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const reportFile=value('--report')||process.env.SOAK_REPORT_FILE||'';
if(!reportFile||!existsSync(reportFile)){console.error('Usage: node tools/soak-evidence.mjs --report <load-report.json> [--write-evidence]');process.exit(2);}
let raw=readFileSync(reportFile,'utf8').trim();
if(raw.startsWith('NYR_LOAD_REPORT '))raw=raw.slice('NYR_LOAD_REPORT '.length);
else if(raw.includes('\n')){const line=raw.split(/\r?\n/).reverse().find(x=>x.startsWith('NYR_LOAD_REPORT '));if(line)raw=line.slice('NYR_LOAD_REPORT '.length);}
let report;try{report=JSON.parse(raw);}catch(error){console.error('Invalid soak report JSON:',error.message);process.exit(2);}
const started=Date.parse(report.startedAt||''),finished=Date.parse(report.finishedAt||''),hours=Number.isFinite(started)&&Number.isFinite(finished)?(finished-started)/3600000:0;
const soak={passed:report.status==='passed',status:report.status||'unknown',hours,at:report.finishedAt||null,report};
const validation=validateEnduranceSoakEvidence(soak);
const result={ok:validation.ok,soak,validation};
if(flag('--write-evidence')){
 if(!validation.ok){console.error(JSON.stringify(result,null,2));process.exit(1);}
 const evidenceFile=value('--evidence')||process.env.RELEASE_EVIDENCE_FILE||'release/external-evidence.json';
 const evidence=existsSync(evidenceFile)?JSON.parse(readFileSync(evidenceFile,'utf8')):{};evidence.soak=soak;writeFileSync(evidenceFile,JSON.stringify(evidence,null,2)+'\n');result.wrote=evidenceFile;
}
console.log(JSON.stringify(result,null,2));
if(!validation.ok)process.exitCode=1;
