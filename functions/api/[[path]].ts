import { createS3Client, ensureBucketConfig, startMultipartUpload, getPartUploadUrl, completeMultipartUpload, abortMultipartUpload, getPresignedGetUrl, getChunkSize } from '../lib/s3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function err(message: string, status = 400) {
  return json({ error: message }, status)
}

export const onRequestOptions = () => new Response(null, { headers: corsHeaders })

export async function onRequest(context: { request: Request; env: { DB: D1Database }; params: { path?: string } }) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const pathRaw = params.path
  const pathStr = Array.isArray(pathRaw) ? pathRaw.join('/') : (pathRaw ?? '')
  const segments = pathStr ? pathStr.split('/').filter(Boolean) : []
  const db = env.DB

  // Setup: allow status check and init from web (before requiring db for other routes)
  if (segments[0] === 'setup' && segments.length === 1) {
    if (request.method === 'GET') {
      if (!db) return json({ initialized: false, error: 'Database not configured' })
      try {
        await db.prepare('SELECT 1 FROM buckets LIMIT 1').first()
        return json({ initialized: true })
      } catch {
        return json({ initialized: false })
      }
    }
    if (request.method === 'POST') {
      if (!db) return err('Database not configured', 500)
      const statements = [
        `CREATE TABLE IF NOT EXISTS buckets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          access_key TEXT NOT NULL,
          secret_key TEXT NOT NULL,
          bucket_name TEXT NOT NULL,
          storage_limit_gb INTEGER NOT NULL DEFAULT 9,
          used_bytes INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bucket_id INTEGER NOT NULL,
          path TEXT NOT NULL,
          name TEXT NOT NULL,
          size INTEGER NOT NULL,
          mime_type TEXT,
          etag TEXT,
          r2_key TEXT NOT NULL,
          is_folder INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (bucket_id) REFERENCES buckets(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_files_bucket_path ON files(bucket_id, path)`,
        `CREATE INDEX IF NOT EXISTS idx_files_r2_key ON files(bucket_id, r2_key)`,
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`,
      ]
      try {
        await db.batch(statements.map((sql) => db.prepare(sql)))
        return json({ initialized: true })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Migration failed'
        return json({ error: message }, 500)
      }
    }
  }

  if (!db) return err('Database not configured', 500)

  try {
    // GET/POST /api/buckets
    if (segments[0] === 'buckets' && segments.length === 1) {
      if (request.method === 'GET') {
        const { results } = await db.prepare('SELECT id, name, endpoint, bucket_name, storage_limit_gb, used_bytes, created_at FROM buckets ORDER BY id').all()
        return json({ buckets: results })
      }
      if (request.method === 'POST') {
        const body = await request.json() as { name: string; endpoint: string; access_key: string; secret_key: string; bucket_name: string; storage_limit_gb?: number }
        if (!body.name || !body.endpoint || !body.access_key || !body.secret_key || !body.bucket_name) return err('Missing required fields')
        const limit = body.storage_limit_gb ?? 9
        const { meta } = await db.prepare(
          'INSERT INTO buckets (name, endpoint, access_key, secret_key, bucket_name, storage_limit_gb) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(body.name, body.endpoint, body.access_key, body.secret_key, body.bucket_name, limit).run()
        const row = await db.prepare('SELECT id, name, endpoint, bucket_name, storage_limit_gb, used_bytes, created_at FROM buckets WHERE id = ?').bind(meta.last_row_id).first()
        return json({ bucket: row })
      }
    }

    // GET/PUT/DELETE /api/buckets/:id
    const bucketId = segments[0] === 'buckets' && segments[1] ? parseInt(segments[1], 10) : null
    if (bucketId != null && !Number.isNaN(bucketId) && segments.length === 2) {
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      if (request.method === 'GET') return json({ bucket: { id: config.id, name: config.name, endpoint: config.endpoint, bucket_name: config.bucket_name, storage_limit_gb: config.storage_limit_gb, used_bytes: config.used_bytes } })
      if (request.method === 'PUT') {
        const body = await request.json() as { name?: string; endpoint?: string; access_key?: string; secret_key?: string; bucket_name?: string; storage_limit_gb?: number }
        const updates: string[] = []
        const values: unknown[] = []
        if (body.name != null) { updates.push('name = ?'); values.push(body.name) }
        if (body.endpoint != null) { updates.push('endpoint = ?'); values.push(body.endpoint) }
        if (typeof body.access_key === 'string' && body.access_key.length > 0) { updates.push('access_key = ?'); values.push(body.access_key) }
        if (typeof body.secret_key === 'string' && body.secret_key.length > 0) { updates.push('secret_key = ?'); values.push(body.secret_key) }
        if (body.bucket_name != null) { updates.push('bucket_name = ?'); values.push(body.bucket_name) }
        if (body.storage_limit_gb != null) { updates.push('storage_limit_gb = ?'); values.push(body.storage_limit_gb) }
        if (updates.length === 0) return json({ bucket: config })
        values.push(bucketId)
        await db.prepare(`UPDATE buckets SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
        const row = await db.prepare('SELECT id, name, endpoint, bucket_name, storage_limit_gb, used_bytes, created_at FROM buckets WHERE id = ?').bind(bucketId).first()
        return json({ bucket: row })
      }
      if (request.method === 'DELETE') {
        await db.prepare('DELETE FROM files WHERE bucket_id = ?').bind(bucketId).run()
        await db.prepare('DELETE FROM buckets WHERE id = ?').bind(bucketId).run()
        return json({ ok: true })
      }
    }

    // /api/buckets/:id/files
    if (bucketId != null && !Number.isNaN(bucketId) && segments[2] === 'files' && (segments.length === 3 || (segments.length === 4 && segments[3] !== 'presign'))) {
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      const pathParam = new URL(request.url).searchParams.get('path') ?? '/'

      if (request.method === 'GET' && segments.length === 3) {
        const pathNorm = pathParam === '/' ? '' : pathParam.replace(/^\//, '').replace(/\/$/, '')
        const { results } = await db.prepare(
          'SELECT id, bucket_id, path, name, size, mime_type, r2_key, created_at, is_folder FROM files WHERE bucket_id = ? AND path = ?'
        ).bind(bucketId, pathNorm).all()
        const entries = (results as { path: string; name: string; is_folder: number }[]).map((r) => ({
          ...r,
          path: r.path ? r.path + '/' + r.name : r.name,
          is_folder: r.is_folder === 1,
        }))
        return json({ entries })
      }

      if (request.method === 'POST' && segments.length === 3) {
        const body = await request.json() as { path: string; name: string; folder?: boolean }
        if (!body.name) return err('Missing name')
        const folder = body.folder === true
        const pathNorm = (body.path ?? '/').replace(/^\//, '').replace(/\/$/, '')
        const r2Key = pathNorm ? `${pathNorm}/${body.name}${folder ? '/.keep' : ''}` : (folder ? `${body.name}/.keep` : body.name)
        if (folder) {
          const client = createS3Client(config)
          const { PutObjectCommand } = await import('@aws-sdk/client-s3')
          await client.send(new PutObjectCommand({ Bucket: config.bucket_name, Key: r2Key, Body: new Uint8Array(0) }))
          await db.prepare(
            'INSERT INTO files (bucket_id, path, name, size, r2_key, is_folder) VALUES (?, ?, ?, 0, ?, 1)'
          ).bind(bucketId, pathNorm, body.name, r2Key).run()
        }
        return json({ ok: true })
      }
    }

    // DELETE /api/buckets/:id/files/:fileId
    const fileId = segments[2] === 'files' && segments[3] ? parseInt(segments[3], 10) : null
    if (bucketId != null && fileId != null && !Number.isNaN(fileId) && segments.length === 4) {
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      const file = await db.prepare('SELECT id, r2_key, size, is_folder FROM files WHERE id = ? AND bucket_id = ?').bind(fileId, bucketId).first()
      if (!file) return err('File not found', 404)
      const client = createS3Client(config)
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket_name, Key: (file as { r2_key: string }).r2_key }))
      await db.prepare('DELETE FROM files WHERE id = ?').bind(fileId).run()
      const size = (file as { size: number; is_folder: number }).is_folder ? 0 : (file as { size: number }).size
      await db.prepare('UPDATE buckets SET used_bytes = max(0, used_bytes - ?) WHERE id = ?').bind(size, bucketId).run()
      return json({ ok: true })
    }

    // GET /api/buckets/:id/files/:fileId/presign
    if (bucketId != null && segments[2] === 'files' && segments[3] && segments[4] === 'presign' && segments.length === 5) {
      const fid = parseInt(segments[3], 10)
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      const file = await db.prepare('SELECT r2_key FROM files WHERE id = ? AND bucket_id = ?').bind(fid, bucketId).first()
      if (!file) return err('File not found', 404)
      const client = createS3Client(config)
      const url = await getPresignedGetUrl(client, config.bucket_name, (file as { r2_key: string }).r2_key)
      return json({ url })
    }

    // POST /api/buckets/:id/upload/single
    if (bucketId != null && segments[2] === 'upload' && segments[3] === 'single' && request.method === 'POST') {
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      const formData = await request.formData()
      const path = (formData.get('path') as string) ?? ''
      const file = formData.get('file') as File
      if (!file) return err('No file')
      const pathNorm = path.replace(/^\//, '').replace(/\/$/, '')
      const r2Key = pathNorm ? `${pathNorm}/${file.name}` : file.name
      const limitBytes = config.storage_limit_gb * 1e9
      if (config.used_bytes + file.size > limitBytes) return err('Bucket storage limit exceeded', 413)
      const client = createS3Client(config)
      const { PutObjectCommand } = await import('@aws-sdk/client-s3')
      await client.send(new PutObjectCommand({
        Bucket: config.bucket_name,
        Key: r2Key,
        Body: file.stream(),
        ContentType: file.type || 'application/octet-stream',
      }))
      const { meta } = await db.prepare(
        'INSERT INTO files (bucket_id, path, name, size, mime_type, r2_key) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(bucketId, pathNorm, file.name, file.size, file.type || null, r2Key).run()
      await db.prepare('UPDATE buckets SET used_bytes = used_bytes + ? WHERE id = ?').bind(file.size, bucketId).run()
      const row = await db.prepare('SELECT id, bucket_id, path, name, size, mime_type, r2_key, created_at FROM files WHERE id = ?').bind(meta.last_row_id).first()
      return json({ file: row })
    }

    // POST /api/buckets/:id/upload/multipart (start)
    if (bucketId != null && segments[2] === 'upload' && segments[3] === 'multipart' && request.method === 'POST') {
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      const body = await request.json() as { path: string; name: string; size: number }
      if (!body.name || body.size == null) return err('Missing name or size')
      const limitBytes = config.storage_limit_gb * 1e9
      if (config.used_bytes + body.size > limitBytes) return err('Bucket storage limit exceeded', 413)
      const pathNorm = (body.path ?? '').replace(/^\//, '').replace(/\/$/, '')
      const key = pathNorm ? `${pathNorm}/${body.name}` : body.name
      const client = createS3Client(config)
      const uploadId = await startMultipartUpload(client, config.bucket_name, key, 'application/octet-stream')
      return json({ uploadId, key })
    }

    // POST /api/buckets/:id/upload/part-url
    if (bucketId != null && segments[2] === 'upload' && segments[3] === 'part-url' && request.method === 'POST') {
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      const body = await request.json() as { uploadId: string; key: string; partNumber: number }
      const client = createS3Client(config)
      const url = await getPartUploadUrl(client, config.bucket_name, body.key, body.uploadId, body.partNumber)
      return json({ url })
    }

    // POST /api/buckets/:id/upload/complete
    if (bucketId != null && segments[2] === 'upload' && segments[3] === 'complete' && request.method === 'POST') {
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      const body = await request.json() as { uploadId: string; key: string; parts: { partNumber: number; etag: string }[] }
      const client = createS3Client(config)
      await completeMultipartUpload(
        client,
        config.bucket_name,
        body.key,
        body.uploadId,
        body.parts.map((p: { partNumber: number; etag: string }) => ({ PartNumber: p.partNumber, ETag: p.etag }))
      )
      const pathNorm = body.key.includes('/') ? body.key.slice(0, body.key.lastIndexOf('/')) : ''
      const name = body.key.includes('/') ? body.key.slice(body.key.lastIndexOf('/') + 1) : body.key
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3')
      const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket_name, Key: body.key }))
      const size = head.ContentLength ?? 0
      await db.prepare(
        'INSERT INTO files (bucket_id, path, name, size, mime_type, r2_key, etag) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(bucketId, pathNorm, name, size, head.ContentType ?? null, body.key, head.ETag ?? null).run()
      await db.prepare('UPDATE buckets SET used_bytes = used_bytes + ? WHERE id = ?').bind(size, bucketId).run()
      const row = await db.prepare('SELECT id, bucket_id, path, name, size, mime_type, r2_key, created_at FROM files WHERE bucket_id = ? AND r2_key = ?').bind(bucketId, body.key).first()
      return json({ file: row })
    }

    // POST /api/buckets/:id/upload/abort
    if (bucketId != null && segments[2] === 'upload' && segments[3] === 'abort' && request.method === 'POST') {
      const config = await ensureBucketConfig(db, bucketId)
      if (!config) return err('Bucket not found', 404)
      const body = await request.json() as { uploadId: string; key: string }
      const client = createS3Client(config)
      await abortMultipartUpload(client, config.bucket_name, body.key, body.uploadId)
      return json({ ok: true })
    }

    return err('Not found', 404)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    return json({ error: message }, 500)
  }
}
