// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// No shell interpolation or execution: only explicitly supported server settings.
const KEYS=new Set(['HOST','PORT','DATA_PATH','BACKUP_SECONDS','BACKUP_RETAIN','BACKUP_DIRECTORY','PUBLIC_URL','ALLOWED_ORIGINS','TRUSTED_PROXY_IPS']);
export function parseConfig(text){
  const values={};
  for(const [index,line] of String(text).split(/\r?\n/).entries()){
    const s=line.trim();if(!s||s.startsWith('#'))continue;
    const match=s.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if(!match||!KEYS.has(match[1]))throw new Error(`.env Zeile ${index+1}: unbekannte oder ungültige Einstellung.`);
    let value=match[2].trim();
    if(value.startsWith('"')||value.startsWith("'")){
      if(value.length<2||value.at(-1)!==value[0])throw new Error(`.env Zeile ${index+1}: Anführungszeichen schließen.`);
      value=value.slice(1,-1);
    }else value=value.replace(/\s+#.*$/,'').trim();
    if(/[\x00-\x1f]/.test(value))throw new Error(`.env Zeile ${index+1}: Steuerzeichen nicht erlaubt.`);
    values[match[1]]=value;
  }return values;
}
export function supportedNode(version){const [major,minor]=String(version).split('.').map(Number);return Number.isInteger(major)&&(major>22||(major===22&&minor>=16));}
export function validateConfig(env){
  const n=(key,min,max,fallback)=>{const raw=env[key]||String(fallback);if(!/^\d+$/.test(raw)||+raw<min||+raw>max)throw new Error(`${key}: ganze Zahl ${min}–${max} erforderlich.`);return String(+raw);};
  const result={...env,PORT:n('PORT',1,65535,3000),BACKUP_SECONDS:n('BACKUP_SECONDS',30,86400,900),BACKUP_RETAIN:n('BACKUP_RETAIN',1,100,8)};
  if(result.HOST&&!/^[a-zA-Z0-9.:[\]-]+$/.test(result.HOST))throw new Error('HOST ist keine gültige Bind-Adresse.');
  if(result.PUBLIC_URL){const u=new URL(result.PUBLIC_URL);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('PUBLIC_URL muss eine HTTPS-Basisadresse sein.');}
  return result;
}
