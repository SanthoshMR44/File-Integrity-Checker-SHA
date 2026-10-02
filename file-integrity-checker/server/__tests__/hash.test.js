const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const request = require('supertest');
const { app } = require('../src/app');

describe('File Integrity Checker API', () => {
  const tempDir = path.join(__dirname, 'tmp');

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('GET /api/health returns service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/hash generates SHA-256 for uploaded file', async () => {
    const filePath = path.join(tempDir, 'sample.txt');
    fs.writeFileSync(filePath, 'hello file integrity checker');

    const res = await request(app)
      .post('/api/hash')
      .attach('file', filePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.fileName).toBe('sample.txt');
  });

  test('POST /api/verify accepts correct hash and returns VERIFIED', async () => {
    const filePath = path.join(tempDir, 'verified.txt');
    const content = 'same-content';
    fs.writeFileSync(filePath, content);
    const expected = crypto.createHash('sha256').update(content).digest('hex');

    const res = await request(app)
      .post('/api/verify')
      .field('expectedHash', expected)
      .attach('file', filePath);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('VERIFIED');
    expect(res.body.verified).toBe(true);
  });

  test('POST /api/verify rejects incorrect hash', async () => {
    const filePath = path.join(tempDir, 'wrong.txt');
    fs.writeFileSync(filePath, 'different-content');

    const res = await request(app)
      .post('/api/verify')
      .field('expectedHash', 'a'.repeat(64))
      .attach('file', filePath);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('MODIFIED');
    expect(res.body.verified).toBe(false);
  });

  test('POST /api/verify rejects invalid hash', async () => {
    const filePath = path.join(tempDir, 'invalid.txt');
    fs.writeFileSync(filePath, 'content');

    const res = await request(app)
      .post('/api/verify')
      .field('expectedHash', 'not-a-real-hash')
      .attach('file', filePath);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid sha-256|64 hexadecimal/i);
  });

  test('POST /api/hash handles missing file', async () => {
    const res = await request(app).post('/api/hash');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/please select a file/i);
  });
});
