import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'

export function localReportSignature(path: string, supabaseUrl: string, publishableKey: string) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    const loopback = ['::1', '127.0.0.1', '::ffff:127.0.0.1']
    if (!path || !supabaseUrl || !publishableKey || request.method !== 'GET'
        || !loopback.includes(request.socket.remoteAddress ?? '')) {
      response.writeHead(404).end()
      return
    }

    const authorization = request.headers.authorization
    if (!authorization?.startsWith('Bearer ')) {
      response.writeHead(401).end()
      return
    }

    try {
      const role = await fetch(new URL('/rest/v1/rpc/muc_is_trainer', supabaseUrl), {
        method: 'POST',
        headers: { apikey: publishableKey, Authorization: authorization, 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(5000),
      })
      if (!role.ok || await role.json() !== true) {
        response.writeHead(403).end()
        return
      }

      const png = await readFile(path)
      if (png.length < 24 || png.readBigUInt64BE(0) !== 0x89504e470d0a1a0an) {
        response.writeHead(404).end()
        return
      }
      response.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }).end(png)
    } catch {
      response.writeHead(404).end()
    }
  }
}
