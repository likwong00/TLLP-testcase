# Database Schema

This document reflects the current schema as implemented in the API models and highlights trade-offs and potential inefficiencies.

## Overview

The system has two primary collection types: **File Requests** and **Shares**. Each of these is a collection that can contain multiple files. Access is granted via password-authenticated sessions.

## Collections

### FileRequests

Represents a request for others to upload files.

| Field        | Type         | Notes                                    |
| ------------ | ------------ | ---------------------------------------- |
| id           | ObjectId     | Primary identifier                       |
| passwordHash | string       | Hash of request password (bcrypt)        |
| shareId      | string       | Optional Share id (stringified ObjectId) |
| createdAt    | string (ISO) | Creation timestamp                       |
| updatedAt    | string (ISO) | Last update                              |

### Shares

Represents a share for others to download files.

| Field        | Type         | Notes                           |
| ------------ | ------------ | ------------------------------- |
| id           | ObjectId     | Primary identifier              |
| passwordHash | string       | Hash of share password (bcrypt) |
| fileIds      | ObjectId[]   | References Files                |
| createdAt    | string (ISO) | Creation timestamp              |
| updatedAt    | string (ISO) | Last update                     |

### Files

Each file references a File Request; Shares point to files.

| Field        | Type         | Notes                                |
| ------------ | ------------ | ------------------------------------ |
| id           | ObjectId     | Primary identifier                   |
| requestId    | string       | FileRequest id (stored as string)    |
| originalName | string       | Original filename                    |
| size         | number       | Size in bytes                        |
| mimeType     | string       | Content type                         |
| status       | string       | pending/uploaded/failed              |
| uploadToken  | string       | Optional upload token for signed URL |
| storageKey   | string       | Optional key in blob storage         |
| createdAt    | string (ISO) | Creation timestamp                   |
| updatedAt    | string (ISO) | Last update                          |

### AuthSessions

Password-authenticated session for a File Request or Share.

| Field     | Type         | Notes                            |
| --------- | ------------ | -------------------------------- |
| id        | ObjectId     | Primary identifier               |
| token     | string       | Session token (unique, indexed)  |
| scope     | string       | request/share                    |
| scopeId   | string       | FileRequest or Share id          |
| expiresAt | string (ISO) | Expiration timestamp (TTL index) |
| createdAt | string (ISO) | Creation timestamp               |
| updatedAt | string (ISO) | Last update                      |

### MultipartUploads

Tracks multipart uploads and their state.

| Field     | Type         | Notes                                     |
| --------- | ------------ | ----------------------------------------- |
| id        | ObjectId     | Primary identifier                        |
| fileId    | ObjectId     | References Files                          |
| uploadId  | string       | Multipart upload id                       |
| partSize  | number       | Target size per part                      |
| parts     | array        | Part metadata (number, size, token, etag) |
| status    | string       | pending/uploading/completed/failed        |
| createdAt | string (ISO) | Creation timestamp                        |
| updatedAt | string (ISO) | Last update                               |

## Notes

- `passwordHash` is stored using bcrypt (work factor 10).
- `AuthSessions` use a TTL index on `expiresAt` for cleanup.
- Files are owned by requests; shares only reference file ids.

## Architecture & Trade-offs

- **String vs ObjectId**: `requestId` and `shareId` are stored as strings in some documents to simplify API handling, but it limits native MongoDB relations and indexing optimizations.
- **Share snapshot**: shares store an array of `fileIds`. This makes downloads fast but requires updating the share when new files upload.
- **Local blob storage**: simple and fast for dev, but not distributed or durable for production.
- **Multipart metadata**: parts are embedded; this is easy to query per upload but can grow large for very high part counts.

## Potential Inefficiencies / Risks

- **Missing compound indexes**: frequent queries like `(requestId, status)` and `(uploadId, fileId)` may benefit from indexes.
- **Large part arrays**: storing many parts in a single document can approach BSON size limits for extremely large files.
- **String IDs**: storing ObjectId as string prevents efficient joins and referential integrity.
- **Share fileIds growth**: large shares may create big arrays and slower updates.
