#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Authenticated internal commerce operations for the central State Authority.
import {StateAuthorityClient} from '../server/state-client.mjs';
const args=process.argv.slice(2),command=args.shift(),opt=name=>{const v=args.find(x=>x.startsWith(`--${name}=`));return v?v.slice(name.length+3):'';};
const url=process.env.STATE_AUTHORITY_URL,secret=process.env.STATE_AUTHORITY_SECRET,actor=opt('actor');
if(!url||!secret)throw new Error('STATE_AUTHORITY_URL und STATE_AUTHORITY_SECRET erforderlich.');
const client=new StateAuthorityClient({url,secret,nodeId:'commerce-admin',timeoutMs:15000});
if(command==='history'){const playerId=args[0];if(!playerId)throw new Error('history PLAYER_ID');console.log(JSON.stringify(await client.commerceHistory(playerId,200),null,2));}
else if(command==='report')console.log(JSON.stringify(await client.commerceReport(),null,2));
else if(command==='refund'){const [provider,transactionId,reason]=args;if(!actor||actor.length<2||!provider||!transactionId||!reason||opt('confirm')!=='WRITE')throw new Error('refund PROVIDER TRANSACTION_ID "Reason" --actor=NAME --confirm=WRITE');console.log(JSON.stringify(await client.commerceRevoke(provider,transactionId,actor,reason),null,2));}
else console.log('Read: node tools/commerce-admin.mjs history PLAYER_ID | report\nWrite: node tools/commerce-admin.mjs refund PROVIDER TRANSACTION_ID "Reason" --actor=NAME --confirm=WRITE');
