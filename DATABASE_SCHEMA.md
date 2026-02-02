# Database Schema (Proposed)

This document proposes a minimal schema to satisfy the assessment requirements while remaining flexible for future file interactions.

## Overview

The system has two primary collection types: **File Requests** and **Shares**. Each of these is a collection that can contain multiple files. Access is granted via password-authenticated sessions.

## Collections

### FileRequests

Represents a request for others to upload files.

| Field        | Type         | Notes                    |
| ------------ | ------------ | ------------------------ |
| \_id         | string       | Primary identifier       |
| title        | string       | Optional display name    |
| passwordHash | string       | Hash of request password |
| createdAt    | string (ISO) | Creation timestamp       |
| updatedAt    | string (ISO) | Last update              |
| expiresAt    | string (ISO) | Optional expiration      |

### Shares

Represents a share for others to download files.

| Field        | Type         | Notes                  |
| ------------ | ------------ | ---------------------- |
| \_id         | string       | Primary identifier     |
| title        | string       | Optional display name  |
| passwordHash | string       | Hash of share password |
| createdAt    | string (ISO) | Creation timestamp     |
| updatedAt    | string (ISO) | Last update            |
| expiresAt    | string (ISO) | Optional expiration    |

### Files

Each file references either a File Request or a Share (one of the two).

| Field      | Type         | Notes                             |
| ---------- | ------------ | --------------------------------- |
| \_id       | string       | Primary identifier                |
| requestId  | string       | Optional, references FileRequests |
| shareId    | string       | Optional, references Shares       |
| name       | string       | Original filename                 |
| size       | number       | Size in bytes                     |
| mimeType   | string       | Content type                      |
| storageKey | string       | Path/key in blob storage          |
| checksum   | string       | Optional hash for integrity       |
| createdAt  | string (ISO) | Creation timestamp                |

### AuthSessions

Password-authenticated session for a File Request or Share.

| Field      | Type         | Notes                   |
| ---------- | ------------ | ----------------------- | -------------------------- |
| \_id       | string       | Primary identifier      |
| targetType | "request"    | "share"                 | Indicates which collection |
| targetId   | string       | FileRequest or Share id |
| token      | string       | Session token           |
| createdAt  | string (ISO) | Creation timestamp      |
| expiresAt  | string (ISO) | Expiration timestamp    |

### MultipartUploads

Tracks multipart uploads and their state.

| Field       | Type         | Notes                         |
| ----------- | ------------ | ----------------------------- |
| \_id        | string       | Primary identifier            |
| fileId      | string       | References Files              |
| uploadId    | string       | Mock S3 multipart upload id   |
| parts       | array        | Uploaded parts metadata       |
| createdAt   | string (ISO) | Creation timestamp            |
| completedAt | string (ISO) | Optional completion timestamp |

## Notes

- `passwordHash` should be stored using a secure hash (e.g., bcrypt).
- Either `requestId` or `shareId` is required on `Files` (not both).
- `AuthSessions` allow multiple uploads/downloads with a single authentication.
- The schema is designed to map cleanly to a flat-file DB or in-memory MongoDB.
