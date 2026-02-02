# File Upload/Download Service

A full-stack file upload and download service built with Turborepo, Hono, Next.js, and MongoDB.

## Project Structure

```
file-service/
├── apps/
│   ├── api/          # Hono backend API
│   └── web/          # Next.js frontend
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

### Development

```bash
pnpm dev
```

This will start both the frontend and backend in development mode.

### Build

```bash
pnpm build
```

## Features

- **File Requests**: Allow others to upload files to you with password protection
- **Shares**: Allow others to download files from you with password protection
- **S3 Integration**: Mock S3 client for signed URL uploads
- **Multipart Uploads**: Support for both single-part and multipart file uploads
- **Type Safety**: Full TypeScript support with Zod validation

## Tech Stack

- **Backend**: Hono (HTTP framework)
- **Frontend**: Next.js with React
- **Database**: MongoDB (in-memory instance)
- **Build System**: Turborepo
- **Validation**: Zod
- **Package Manager**: pnpm

## Documentation

See individual README files in each workspace for more details:

- [API Documentation](apps/api/README.md)
- [Web Documentation](apps/web/README.md)
