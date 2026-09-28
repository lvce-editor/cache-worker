import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, pathname.slice(1) || 'packages/e2e/test/index.html')
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  try {
    if (!statSync(file).isFile()) {
      response.writeHead(404).end()
      return
    }
  } catch {
    response.writeHead(404).end()
    return
  }
  response.setHeader('content-type', contentTypes[extname(file)] ?? 'application/octet-stream')
  createReadStream(file).pipe(response)
}).listen(4173, '127.0.0.1')
