# File Integrity Checker Using SHA-256

A simple mini-project for checking whether a file has changed by comparing its SHA-256 hash.

## Objective
To verify file integrity using a cryptographic hash so that even a tiny change in file contents produces a different digest.

## Tech Stack
- React + Vite
- Express.js
- Node.js crypto
- Multer for file upload
- SHA-256 hashing

## Project Structure
```text
file-integrity-checker/
├── client/                 # React frontend
├── server/                 # Express API
├── package.json            # Root scripts
├── README.md
└── ...
```

## Installation
```bash
npm install
```

## Run the app
Open two terminals and run:

```bash
npm run dev:server
npm run dev:client
```

Then open:

```text
http://localhost:5173
```

## Production build
```bash
npm run build
```

## API Endpoints
### Health check
```bash
curl http://localhost:5000/api/health
```

### Generate SHA-256 hash
```bash
curl -F "file=@your-file.txt" http://localhost:5000/api/hash
```

### Verify file integrity
```bash
curl -F "file=@your-file.txt" -F "expectedHash=<64-char-sha256>" http://localhost:5000/api/verify
```

## Features
- Generate SHA-256 for any uploaded file
- Verify whether a file matches a known hash
- Compare a file with a saved baseline in the browser
- Simple, reliable workflow with no database or login required

## How it works
```text
File
  ↓
SHA-256 Hash
  ↓
Compare with expected hash
  ↓
VERIFIED or MODIFIED
```

A SHA-256 hash is a fixed-length fingerprint of the file contents. If the file changes even slightly, the hash changes completely.

## Browser usage
1. Open the app in the browser.
2. Go to Generate Hash and upload a file.
3. Copy the generated hash or use it as the expected hash.
4. Go to Verify File and compare the file against the hash.
5. Use Baseline to save the current file hash and check later whether the file changed.

## Tests
```bash
npm test
```

This project includes a small Jest test suite covering the hash API and verification logic.

## Notes
This is intentionally kept minimal and functional for a student mini-project. It does not use MongoDB, JWT, admin roles, reports, signers, monitoring, or background workers.
