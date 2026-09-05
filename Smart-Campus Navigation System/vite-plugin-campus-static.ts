import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

const PHOTOS_PREFIX = '/campus-photos/'
const PUBLIC_IMAGES_PREFIX = '/images/'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

function mimeFor(filePath: string): string {
  return MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function walkFiles(dir: string, base: string, into: Map<string, string>): void {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      walkFiles(full, base, into)
      continue
    }
    if (!stat.isFile()) continue
    const rel = path.relative(base, full).replace(/\\/g, '/')
    into.set(rel.toLowerCase(), full)
  }
}

function sendFile(res: ServerResponse, filePath: string, method: string): void {
  res.setHeader('Content-Type', mimeFor(filePath))
  res.setHeader('Cache-Control', 'public, max-age=0')
  if (method === 'HEAD') {
    res.statusCode = 200
    res.end()
    return
  }
  fs.createReadStream(filePath).pipe(res)
}

function attachStaticMiddleware(
  server: ViteDevServer | PreviewServer,
  photosDir: string,
  publicImagesDir: string
): void {
  const photoByLower = new Map<string, string>()
  const publicByLower = new Map<string, string>()
  walkFiles(photosDir, photosDir, photoByLower)
  walkFiles(publicImagesDir, publicImagesDir, publicByLower)

  server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    const rawUrl = req.url?.split('?')[0] ?? ''
    if (!rawUrl) {
      next()
      return
    }

    let decoded: string
    try {
      decoded = decodeURIComponent(rawUrl)
    } catch {
      next()
      return
    }

    if (decoded.startsWith(PHOTOS_PREFIX) || decoded === '/campus-photos') {
      const rel = decoded.slice(PHOTOS_PREFIX.length)
      if (!rel || rel.includes('..') || rel.includes('/') || rel.includes('\\')) {
        next()
        return
      }
      const file = photoByLower.get(rel.toLowerCase())
      if (!file) {
        next()
        return
      }
      sendFile(res, file, req.method ?? 'GET')
      return
    }

    if (decoded.startsWith(PUBLIC_IMAGES_PREFIX)) {
      const rel = decoded.slice(PUBLIC_IMAGES_PREFIX.length)
      if (!rel || rel.includes('..')) {
        next()
        return
      }
      const file = publicByLower.get(rel.toLowerCase())
      if (!file) {
        next()
        return
      }
      sendFile(res, file, req.method ?? 'GET')
      return
    }

    next()
  })
}

/** Serve campus photos + case-insensitive `/images/...` (catalog `.JPG` vs files `.jpg`). */
export function campusStaticAssetsPlugin(projectRoot: string): Plugin {
  const photosDir = path.resolve(projectRoot, 'src/app/assets/images/Images')
  const publicImagesDir = path.resolve(projectRoot, 'public/images')

  return {
    name: 'campus-static-assets',
    configureServer(server) {
      attachStaticMiddleware(server, photosDir, publicImagesDir)
    },
    configurePreviewServer(server) {
      attachStaticMiddleware(server, photosDir, publicImagesDir)
    },
    writeBundle(options) {
      if (!options.dir || !fs.existsSync(photosDir)) return
      const dest = path.join(options.dir, 'campus-photos')
      fs.mkdirSync(dest, { recursive: true })
      for (const name of fs.readdirSync(photosDir)) {
        if (name.startsWith('.')) continue
        const src = path.join(photosDir, name)
        if (!fs.statSync(src).isFile()) continue
        fs.copyFileSync(src, path.join(dest, name))
      }
    },
  }
}
