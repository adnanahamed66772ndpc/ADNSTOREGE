const API_BASE = '/api'

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...init } = options
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.message || res.statusText)
  }
  return res.json()
}

export const api = {
  setup: {
    status: () => request<{ initialized: boolean; error?: string }>('/api/setup'),
    init: () => request<{ initialized: boolean }>('/api/setup', { method: 'POST' }),
  },
  buckets: {
    list: () => request<{ buckets: Bucket[] }>(`${API_BASE}/buckets`),
    create: (body: CreateBucketBody) =>
      request<{ bucket: Bucket }>(`${API_BASE}/buckets`, { method: 'POST', body: JSON.stringify(body) }),
    get: (id: number) => request<{ bucket: Bucket }>(`${API_BASE}/buckets/${id}`),
    update: (id: number, body: Partial<CreateBucketBody>) =>
      request<{ bucket: Bucket }>(`${API_BASE}/buckets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<{ ok: true }>(`${API_BASE}/buckets/${id}`, { method: 'DELETE' }),
  },
  files: {
    list: (bucketId: number, path: string) =>
      request<{ entries: FileEntry[] }>(`${API_BASE}/buckets/${bucketId}/files`, { params: { path } }),
    delete: (bucketId: number, fileId: number) =>
      request<{ ok: true }>(`${API_BASE}/buckets/${bucketId}/files/${fileId}`, { method: 'DELETE' }),
    createFolder: (bucketId: number, path: string, name: string) =>
      request<{ ok: true }>(`${API_BASE}/buckets/${bucketId}/files`, {
        method: 'POST',
        body: JSON.stringify({ path, name, folder: true }),
      }),
  },
  upload: {
    startMultipart: (bucketId: number, path: string, name: string, size: number) =>
      request<{ uploadId: string; key: string }>(`${API_BASE}/buckets/${bucketId}/upload/multipart`, {
        method: 'POST',
        body: JSON.stringify({ path, name, size }),
      }),
    getPartUrl: (bucketId: number, uploadId: string, key: string, partNumber: number) =>
      request<{ url: string }>(`${API_BASE}/buckets/${bucketId}/upload/part-url`, {
        method: 'POST',
        body: JSON.stringify({ uploadId, key, partNumber }),
      }),
    completeMultipart: (bucketId: number, uploadId: string, key: string, parts: { partNumber: number; etag: string }[]) =>
      request<{ file: FileEntry }>(`${API_BASE}/buckets/${bucketId}/upload/complete`, {
        method: 'POST',
        body: JSON.stringify({ uploadId, key, parts }),
      }),
    abortMultipart: (bucketId: number, uploadId: string, key: string) =>
      request<{ ok: true }>(`${API_BASE}/buckets/${bucketId}/upload/abort`, {
        method: 'POST',
        body: JSON.stringify({ uploadId, key }),
      }),
    single: async (bucketId: number, path: string, file: File) => {
      const form = new FormData()
      form.append('path', path)
      form.append('file', file)
      const res = await fetch(`/api/buckets/${bucketId}/upload/single`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || res.statusText)
      }
      return res.json()
    },
  },
  presign: (bucketId: number, fileId: number) =>
    request<{ url: string }>(`${API_BASE}/buckets/${bucketId}/files/${fileId}/presign`),
}

export interface Bucket {
  id: number
  name: string
  endpoint: string
  bucket_name: string
  storage_limit_gb: number
  used_bytes: number
  created_at: string
}

export interface FileEntry {
  id: number
  bucket_id: number
  path: string
  name: string
  size: number
  mime_type: string | null
  r2_key: string
  created_at: string
  is_folder?: boolean
}

export interface CreateBucketBody {
  name: string
  endpoint: string
  access_key: string
  secret_key: string
  bucket_name: string
  storage_limit_gb?: number
}
