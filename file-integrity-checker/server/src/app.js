const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 5000;
const uploadDir = path.join(__dirname, '../tmp/uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const hashFile = (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  stream.on('error', reject);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
});

const removeTemporaryFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    // Ignore cleanup errors; the app should remain stable.
  }
};

const isValidSha256 = (value) => typeof value === 'string' && /^[a-fA-F0-9]{64}$/.test(value.trim());

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'File Integrity Checker API running',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/hash', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please select a file.',
    });
  }

  const filePath = req.file.path;

  try {
    const hash = await hashFile(filePath);
    res.json({
      success: true,
      message: 'SHA-256 generated successfully.',
      fileName: req.file.originalname,
      size: req.file.size,
      hash,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to read the selected file.',
    });
  } finally {
    await removeTemporaryFile(filePath);
  }
});

app.post('/api/verify', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please select a file.',
    });
  }

  const expectedHash = String(req.body.expectedHash || '').trim();
  if (!isValidSha256(expectedHash)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid SHA-256 hash. Please enter exactly 64 hexadecimal characters.',
    });
  }

  const filePath = req.file.path;

  try {
    const actualHash = await hashFile(filePath);
    const normalizedExpected = expectedHash.toLowerCase();
    const normalizedActual = actualHash.toLowerCase();
    const verified = normalizedActual === normalizedExpected;

    res.json({
      success: true,
      verified,
      status: verified ? 'VERIFIED' : 'MODIFIED',
      expectedHash: normalizedExpected,
      actualHash: normalizedActual,
      message: verified ? 'FILE INTEGRITY VERIFIED' : 'FILE INTEGRITY FAILED',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to verify the selected file.',
    });
  } finally {
    await removeTemporaryFile(filePath);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Upload failed. Please try a smaller file or a different file name.',
    });
  }

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while processing your request.',
    });
  }

  return res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

const startServer = () => {
  app.listen(port, () => {
    console.log(`Server running successfully on port ${port}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
