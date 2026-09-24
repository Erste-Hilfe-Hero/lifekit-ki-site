// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
export function realmTargetFor(index,roomCount){
  const rooms=Math.max(1,Number(roomCount)||1);
  return Math.floor(Number(index)/rooms)%2?'realm-2':'realm-1';
}
export function stressDistribution(clients,roomCount){
  const rooms=Math.max(1,Number(roomCount)||1),rows=[];
  for(let i=0;i<clients;i++)rows.push({index:i,room:`LOAD${i%rooms}`,realm:realmTargetFor(i,rooms)});
  return rows;
}
