#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {CapacityPlanner} from '../server/production.mjs';

const base=[
  'NYRATHEN_DOMAIN','ACME_EMAIL','METRICS_TOKEN','LIVEOPS_SIGNING_SECRET',
  'CLUSTER_SHARED_SECRET','RESUME_TICKET_SECRET','BACKUP_TARGET','OFFSITE_BACKUP_TARGET',
  'ALERT_TARGET','EXPECTED_CONCURRENT_PLAYERS','GAME_WORKERS','LOGICAL_NODES','DEPLOYMENT_MODE','STATE_BACKEND_MODE'
];
const commerce=String(process.env.NYRATHEN_COMMERCE||'off')==='on';
const push=String(process.env.NYRATHEN_PUSH||'off')==='on';
const deploymentHint=String(process.env.DEPLOYMENT_MODE||'').trim();
const required=[...base,...(deploymentHint==='multi-node'?['GAME_ROUTING_MODE']:[]),...(deploymentHint==='multi-node'&&String(process.env.STATE_BACKEND_MODE||'')==='external-certified'?['DISTRIBUTED_STATE_EVIDENCE']:[]),...(deploymentHint==='multi-node'&&String(process.env.STATE_BACKEND_MODE||'')==='central-authority'?['STATE_AUTHORITY_URL','STATE_AUTHORITY_SECRET','STATE_WORLD_NAMESPACE']:[]),
  ...(commerce?['APPLE_IAP_ISSUER_ID','APPLE_IAP_KEY_ID','GOOGLE_PLAY_SERVICE_ACCOUNT']:[]),
  ...(push?['APNS_KEY_ID','APNS_TEAM_ID','FCM_SERVICE_ACCOUNT']:[])
];
const missing=required.filter(k=>!String(process.env[k]||'').trim());
if(missing.length){console.error(JSON.stringify({ok:false,missing},null,2));process.exit(1);}

const domain=String(process.env.NYRATHEN_DOMAIN).trim();
if(!/^[a-z0-9.-]+$/i.test(domain)||domain.includes('/')||domain.endsWith('.invalid')){console.error('NYRATHEN_DOMAIN ist ungültig.');process.exit(1);}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ACME_EMAIL)){console.error('ACME_EMAIL ist ungültig.');process.exit(1);}
for(const key of ['METRICS_TOKEN','LIVEOPS_SIGNING_SECRET','CLUSTER_SHARED_SECRET','RESUME_TICKET_SECRET']){
  if(String(process.env[key]).length<32){console.error(key+' muss mindestens 32 Zeichen lang sein.');process.exit(1);}
}

const players=Number(process.env.EXPECTED_CONCURRENT_PLAYERS);
const workers=Number(process.env.GAME_WORKERS);
const nodes=Number(process.env.LOGICAL_NODES);
if(!Number.isInteger(players)||players<1||players>1000000||!Number.isInteger(workers)||workers<1||workers>10000||!Number.isInteger(nodes)||nodes<1||nodes>10000){
  console.error('EXPECTED_CONCURRENT_PLAYERS/GAME_WORKERS/LOGICAL_NODES ungültig.');process.exit(1);
}
const deploymentMode=String(process.env.DEPLOYMENT_MODE).trim();
if(!['single-node','multi-node'].includes(deploymentMode)){console.error('DEPLOYMENT_MODE muss single-node oder multi-node sein.');process.exit(1);}
const stateBackendMode=String(process.env.STATE_BACKEND_MODE).trim();
if(!['local-sqlite','central-authority','external-certified'].includes(stateBackendMode)){console.error('STATE_BACKEND_MODE muss local-sqlite, central-authority oder external-certified sein.');process.exit(1);}
if(deploymentMode==='multi-node'&&stateBackendMode==='local-sqlite'){console.error('Multi-Node-Betrieb darf kein lokales SQLite pro GameServer-Worker verwenden. Nutze einen extern zertifizierten gemeinsamen Account-/State-Backend-Pfad: central-authority oder external-certified.');process.exit(1);}
if(deploymentMode==='multi-node'){const routing=String(process.env.GAME_ROUTING_MODE||'').trim();if(!['dedicated-endpoints','stable-pod-addresses'].includes(routing)){console.error('GAME_ROUTING_MODE muss dedicated-endpoints oder stable-pod-addresses sein; zufällige Replica-Pools ohne Session-Affinity sind nicht zulässig.');process.exit(1);}if(routing==='dedicated-endpoints'){const urls=String(process.env.PUBLIC_SERVER_URLS||'').split(',').map(x=>x.trim()).filter(Boolean);if(urls.length<2||urls.some(x=>!/^https:\/\/[^\s/]+(?::\d+)?$/i.test(x))){console.error('PUBLIC_SERVER_URLS muss mindestens zwei dedizierte HTTPS-GameServer-Endpunkte enthalten.');process.exit(1);}}}
if(deploymentMode==='multi-node'&&stateBackendMode==='external-certified'&&String(process.env.DISTRIBUTED_STATE_EVIDENCE||'').trim().length<8){console.error('DISTRIBUTED_STATE_EVIDENCE fehlt oder ist zu kurz.');process.exit(1);}
if(stateBackendMode==='central-authority'){if(!/^https?:\/\//.test(String(process.env.STATE_AUTHORITY_URL||''))){console.error('STATE_AUTHORITY_URL ist ungültig.');process.exit(1);}if(String(process.env.STATE_AUTHORITY_SECRET||'').length<32){console.error('STATE_AUTHORITY_SECRET muss mindestens 32 Zeichen lang sein.');process.exit(1);}if(String(process.env.STATE_WORLD_NAMESPACE||'').trim().length<2){console.error('STATE_WORLD_NAMESPACE fehlt.');process.exit(1);}}

const planner=new CapacityPlanner();
const plan=planner.plan(players);
if(workers<plan.workers){console.error(JSON.stringify({ok:false,error:'Zu wenig GameServer-Worker für die Zielkapazität.',configuredWorkers:workers,requiredWorkers:plan.workers,plan},null,2));process.exit(1);}
if(nodes<plan.nodes){console.error(JSON.stringify({ok:false,error:'Zu wenig logische Nodes für die Zielkapazität und CPU-Headroom.',configuredNodes:nodes,requiredNodes:plan.nodes,plan},null,2));process.exit(1);}
if(deploymentMode==='single-node'&&plan.nodes>1){console.error(JSON.stringify({ok:false,error:'Zielkapazität benötigt Multi-Node-Betrieb; single-node wird nicht als 1k/2k/5k/10k-fähig freigegeben.',plan},null,2));process.exit(1);}
const workersPerNode=Math.ceil(workers/nodes);
if(workersPerNode>planner.workersPerNode){console.error(JSON.stringify({ok:false,error:'Zu viele GameServer-Worker pro Node; gemessene CPU-SLO würde überschritten.',workersPerNode,maxWorkersPerNode:planner.workersPerNode,plan},null,2));process.exit(1);}
if(process.env.BACKUP_TARGET===process.env.OFFSITE_BACKUP_TARGET){console.error('OFFSITE_BACKUP_TARGET muss vom primären BACKUP_TARGET getrennt sein.');process.exit(1);}

console.log(JSON.stringify({
  ok:true,domain,https:`https://${domain}`,metrics:'private-token-protected',liveOps:'signed-revisions',
  cluster:'shared-secret+resume-ticket',deploymentMode,stateBackendMode,gameRoutingMode:deploymentMode==='multi-node'?String(process.env.GAME_ROUTING_MODE):'single-node',distributedStateEvidence:deploymentMode==='multi-node'?(stateBackendMode==='central-authority'?'bundled-central-authority':'configured'):'not-required',backupTarget:'configured',offsiteBackup:'configured',alerting:'configured',
  capacity:{configuredWorkers:workers,configuredNodes:nodes,workersPerNode,...plan},commerce,push
},null,2));
