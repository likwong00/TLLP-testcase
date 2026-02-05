# Web App

Next.js/React App Router frontend for creating requests, uploading files, and sharing downloads.

## Architecture & Design

### Key Screens

- **Requests Access**: Create a request or join an existing one.
- **Request Detail**: Upload files, view upload progress, create shares.
- **Shares Access**: Authenticate to a share.
- **Share Detail**: Browse and download shared files.

### Core Components

- **PasswordGate**: Handles password creation and access flows.
- **UploadQueue**: Manages upload state, progress, retries, and multipart dispatch.
- **FilesList**: File metadata display for requests and shares.

### Data Flow

- API calls live in `components/apiClient.ts`.
- Auth tokens are stored in local/session storage and attached to API requests.
- File uploads use **signed URLs** for single-part and **multipart** for larger files.

## Validation

- Passwords must be **8+ chars** with upper/lowercase, number, and symbol.
- Client validates request/share existence before gating access.
- Uploads enforce size and file-count limits (server-side, with client messaging).

## Design Decisions

- **App Router** for modern Next.js routing and layout composition.
- **XHR upload** to support granular upload progress events.
- **Multipart threshold** for large files to improve reliability.
- **Short-lived auth tokens** for request/share access.
- **Tailwind CSS** for fast iteration on a small scale UI, easy consistency across cards/dialogs, and minimal custom CSS overhead.
- **Motion (motion/react)** for handling polished animations and transitions (dialog transitions, overlays).

## Upload Defaults

The client upload queue uses the following defaults (see `useUploadQueue.ts`):

- **Max retries**: 2
- **Retry base delay**: 800 ms (exponential backoff)
- **Max parallel uploads**: 3
- **Multipart threshold**: 20 MB (files at or above use multipart)
- **Multipart concurrency**: 5 parts at a time

## Trade-offs

- Client-side checks improve UX but final enforcement is server-side.
- Multipart uploads increase complexity but provide resilience for large files.
- Local storage tokens are convenient but should be replaced with HttpOnly cookies in production.

## Next Steps

- Add more features for downloads, such as a select list to download multiple files at once.
- Owner of the request should be able to remove files from uploaded list.
- Add loading states/components when waiting for API calls.
- Add background upload resume + persistent queue.
- Improve global upload concurrency controls per user/session.
