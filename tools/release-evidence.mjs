#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {ReleaseEvidenceGate} from '../server/production.mjs';
const file=process.env.RELEASE_EVIDENCE_FILE||'release/external-evidence.json',strict=String(process.env.REQUIRE_EXTERNAL_EVIDENCE||'false')==='true';let evidence={};if(existsSync(file))evidence=JSON.parse(readFileSync(file,'utf8'));const result=new ReleaseEvidenceGate().evaluate(evidence);mkdirSync('release',{recursive:true});writeFileSync('release/external-evidence-status.json',JSON.stringify({...result,generatedAt:new Date().toISOString()},null,2));console.log(JSON.stringify(result,null,2));if(strict&&!result.ok)process.exitCode=1;
