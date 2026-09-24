#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {CapacityPlanner} from '../server/production.mjs';
const targets=(process.argv.slice(2).length?process.argv.slice(2):['1000','2000','5000','10000']).map(Number);if(targets.some(n=>!Number.isInteger(n)||n<1||n>1000000))throw new Error('Player targets must be integers 1–1,000,000');const planner=new CapacityPlanner();console.log(JSON.stringify({assumptions:{nominalPlayersPerWorker:planner.playersPerWorker,targetUtilization:planner.targetUtilization,safePlayersPerWorker:Math.floor(planner.playersPerWorker*planner.targetUtilization),workersPerNode:planner.workersPerNode,spareWorkers:planner.spareWorkers},plans:targets.map(n=>planner.plan(n))},null,2));
