# File Service

A full-stack file upload and download service built with Turborepo, Hono, Next.js/React, and MongoDB.

Quick Demo:

https://github.com/user-attachments/assets/27455d02-efad-4057-9671-0f537d4cbfd6

## Project Structure

```
.
├── apps/
│   ├── api/          # Hono backend API
│   └── web/          # Next.js/React frontend
├── packages/
│   └── shared/       # Shared types and schemas
└── scripts/          # Utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Development

```bash
pnpm dev
```

This will start both the frontend and backend in development mode.
If running into build errors to do with missing dependencies, try running `pnpm install` in `apps/api` and `apps/web`.

Default ports:

- Web: http://localhost:3000
- API: http://localhost:8787

## Features

- **File Requests**: Allow others to upload files to you with password protection
- **Shares**: Allow others to download files from you with password protection
- **S3 Integration**: Mock S3 client for signed URL uploads
- **Multipart Uploads**: Support for both single-part and multipart file uploads
- **Type Safety**: Full TypeScript support with Zod validation
- **Local Blob Storage**: Stored under apps/api/data/blobs for dev

## Tech Stack

- **Backend**: Hono (HTTP framework)
- **Frontend**: Next.js with React
- **Database**: MongoDB (in-memory instance for development)
- **Build System**: Turborepo
- **Validation**: Zod
- **Package Manager**: pnpm

## Environment Variables

API (apps/api):

- `PORT` (default: 8787)
- `CORS_ORIGIN` (default: http://localhost:3000)
- `DEV_SEED_ENABLED` (default: true)

Web (apps/web):

- `NEXT_PUBLIC_API_URL` (default: http://localhost:8787)

## Utilities

- `pnpm clean:blobs` clears the local blob store under apps/api/data/blobs.

## Documentation

See individual README files in each workspace for more details:

- [API Documentation](apps/api/README.md)
- [Web Documentation](apps/web/README.md)
- [Database Schema](packages/shared/DATABASE_SCHEMA.md)
