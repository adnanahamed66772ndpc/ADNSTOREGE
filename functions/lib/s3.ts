import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface BucketConfig {
  id: number
  name: string
  endpoint: string
  access_key: string
  secret_key: string
  bucket_name: string
  storage_limit_gb: number
  used_bytes: number
}

export function createS3Client(config: Pick<BucketConfig, 'endpoint' | 'access_key' | 'secret_key'>) {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint.startsWith('http') ? config.endpoint : `https://${config.endpoint}`,
    credentials: {
      accessKeyId: config.access_key,
      secretAccessKey: config.secret_key,
    },
    forcePathStyle: true,
  })
}

export async function ensureBucketConfig(db: D1Database, bucketId: number): Promise<BucketConfig | null> {
  const row = await db.prepare('SELECT id, name, endpoint, access_key, secret_key, bucket_name, storage_limit_gb, used_bytes FROM buckets WHERE id = ?').bind(bucketId).first()
  return row ? (row as unknown as BucketConfig) : null
}

const CHUNK_MIN_SIZE = 5 * 1024 * 1024 // 5 MB

export function getChunkSize(fileSize: number): number {
  if (fileSize <= CHUNK_MIN_SIZE) return fileSize
  const parts = Math.ceil(fileSize / CHUNK_MIN_SIZE)
  return Math.ceil(fileSize / parts)
}

export async function startMultipartUpload(
  client: S3Client,
  bucketName: string,
  key: string,
  contentType?: string
) {
  const cmd = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  })
  const out = await client.send(cmd)
  return out.UploadId!
}

export async function getPartUploadUrl(
  client: S3Client,
  bucketName: string,
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const cmd = new UploadPartCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  })
  return getSignedUrl(client, cmd as never, { expiresIn: 3600 })
}

export async function completeMultipartUpload(
  client: S3Client,
  bucketName: string,
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
) {
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    })
  )
}

export async function abortMultipartUpload(
  client: S3Client,
  bucketName: string,
  key: string,
  uploadId: string
) {
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
    })
  )
}

export async function getPresignedGetUrl(
  client: S3Client,
  bucketName: string,
  key: string,
  expiresIn = 300
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucketName, Key: key })
  return getSignedUrl(client, cmd as never, { expiresIn })
}
