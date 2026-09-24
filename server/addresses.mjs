// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { isIP } from 'node:net';
export function clientAddress(request,trusted=new Set()) {
  const peer=(request.socket?.remoteAddress||'unknown').replace(/^::ffff:/,'');
  const value=request.headers?.['x-real-ip'];
  return trusted.has(peer)&&typeof value==='string'&&isIP(value)?value:peer;
}
