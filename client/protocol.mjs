// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Shared, bounded wire parsing and invite validation. Contains no DOM or credentials.
export function normalizeServerAddress(value) {
  let u; try { u = new URL(String(value).trim()); } catch { throw new Error('Bitte eine vollständige Serveradresse eingeben.'); }
  const host = u.hostname;
  const local = ['localhost','127.0.0.1','[::1]'].includes(host) || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (u.username || u.password || u.hash || u.search || !['','/'].includes(u.pathname) || !(u.protocol === 'https:' || u.protocol === 'http:' && local)) {
    throw new Error('HTTPS-Adresse ohne Pfad, Zugangsdaten oder Parameter erforderlich. HTTP ist nur im lokalen Netz erlaubt.');
  }
  return u.origin;
}
export function normalizeRegion(value) {
  const room = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,12}$/.test(room)) throw new Error('Region: 3–12 Buchstaben oder Ziffern.');
  return room;
}
export function makeInvitation(base, room) {
  return normalizeServerAddress(base) + '/#join=' + encodeURIComponent(normalizeRegion(room));
}
export function parseInvitation(value) {
  let u; try { u = new URL(String(value).trim()); } catch { throw new Error('Ungültiger Einladungslink.'); }
  const base = normalizeServerAddress(u.origin);
  if (u.username || u.password || u.search || u.pathname !== '/') throw new Error('Dieser Link ist keine Nyrathen-Einladung.');
  const params = new URLSearchParams(u.hash.slice(1));
  if ([...params.keys()].some(k => k !== 'join') || params.getAll('join').length !== 1) throw new Error('Dieser Link ist keine Nyrathen-Einladung.');
  return {base, room:normalizeRegion(params.get('join'))};
}
export class SnapshotDecoder {
  constructor(onMessage, maxBytes=2000000) { this.pending=''; this.onMessage=onMessage; this.maxBytes=maxBytes; this.decoder=new TextDecoder(); }
  push(bytes) {
    this.pending += this.decoder.decode(bytes, {stream:true});
    if (this.pending.length > this.maxBytes) throw new Error('Servernachricht zu groß.');
    // SSE permits both LF and CRLF; a delimiter may straddle any network chunk.
    let match;
    while ((match=/\r?\n\r?\n/.exec(this.pending))) {
      const block=this.pending.slice(0,match.index); this.pending=this.pending.slice(match.index+match[0].length);
      const data=block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');
      if(data) this.onMessage(JSON.parse(data));
    }
  }
}
