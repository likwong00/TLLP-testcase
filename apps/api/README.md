# API Server

Hono-based API that powers requests, shares, and uploads (single and multipart). Data is stored in MongoDB and blobs are stored on disk for the mock S3 flow.

## Architecture & Design

### High-Level Flow

- **Requests** are password-protected upload inboxes.
- **Shares** are password-protected download bundles created from a request’s uploaded files.
- Uploads are performed with **signed URLs** against the mock S3 handler.
- Large files use a **multipart workflow** with explicit part creation and server-side merge.

### Components

- **Routes**: Hono routers split by domain (`requests`, `shares`, `mockS3`).
- **Models**: `FileRequest`, `File`, `Share`, `MultipartUpload`, `AuthSession`.
- **Storage**: Local blob store under `apps/api/data/blobs` via `storage/blobStore.ts`.
- **Validation**: Zod schemas from `@file-service/shared`.

### Passwords & Sessions

- Passwords are **never stored in plaintext**.
- The API uses **bcrypt** (bcryptjs) to hash passwords with a work factor of 10.
- Hashes are stored on `FileRequest` and `Share` records as `passwordHash`.
- Authentication creates short-lived **session tokens** stored in `AuthSession`.
- Tokens are scoped to `request` or `share` and validated by middleware.

### Error Handling & Validation

- All request bodies are validated with **Zod** schemas from `@file-service/shared`.
- Invalid payloads return **400** with `error` and `details` fields.
- Auth failures return **401**, missing resources **404**, rate limits **429**.
- Multipart flows validate part ordering, sizes, and ETags before merge.
- Upload limits (size, file count, part count) are enforced server-side.

### Default Limits

- **Max file size**: 1 GB
- **Max files per request/share**: 20
- **Multipart part size**: 10 MB
- **Max multipart parts**: 1000
- **Auth rate limit**: 5 attempts per 5 minutes

## Endpoints

### Requests

- `POST /requests` — Create a new request (returns `id` + auth token).
- `POST /requests/:id/auth` — Authenticate to a request with password.
- `GET /requests/:id` — Verify request access (auth required).
- `GET /requests/:id/exists` — Check request existence.
- `POST /requests/:id/files/initiate` — Begin upload (single or multipart).
- `POST /requests/:id/files/:fileId/complete` — Finalize single-part upload.
- `GET /requests/:id/files` — List uploaded files (auth required).
- `POST /requests/:id/create-share` — Create a share from uploaded files.

### Multipart Uploads

- `POST /requests/:id/files/:fileId/multipart/parts` — Create/get an upload URL for a part.
- `POST /requests/:id/files/:fileId/multipart/complete` — Finalize multipart upload and merge.

### Shares

- `POST /shares/:id/auth` — Authenticate to a share with password.
- `GET /shares/:id/exists` — Check share existence.
- `GET /shares/:id/files` — List share files (auth required).
- `GET /shares/:id/files/:fileId/download` — Get a signed download URL (auth required).

### Mock S3

- `PUT /mock-s3/upload/:token` — Upload single-part blob.
- `PUT /mock-s3/upload-part/:token` — Upload multipart chunk.
- `GET /mock-s3/download/:token?filename=...` — Download blob.

### Dev Utilities

- `GET /dev/dump` — Inspect dev state (requests, files, shares, multipart uploads).

## Trade-offs

- **In-memory MongoDB (dev)** reduces setup overhead but resets data on restart.
- **Signed URL uploads** offload file transfer from main API routes at the cost of extra endpoints.
- **Multipart merge on server** simplifies client logic but requires additional local disk resources.

## Next Steps

- Add flexible shares with different password as requests.
- Replace mock S3 with real object storage.
- Add persistent MongoDB for production.
- Add background cleanup for failed multipart uploads.
- Add audit logging and metrics for uploads/downloads.
