import { useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';

const API_URL = '/api';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : {};

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

function formatHash(value) {
  if (!value) return 'Not available';
  return value.length > 20 ? `${value.slice(0, 20)}...` : value;
}

async function computeHashFromFile(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function readBaseline() {
  const saved = localStorage.getItem('file-integrity-baseline');
  return saved ? JSON.parse(saved) : null;
}

function writeBaseline(record) {
  localStorage.setItem('file-integrity-baseline', JSON.stringify(record));
}

function HomePage() {
  const cards = [
    { title: 'Generate Hash', path: '/generate', description: 'Select a file and compute its SHA-256 digest.' },
    { title: 'Verify File', path: '/verify', description: 'Compare a file against an expected SHA-256 value.' },
    { title: 'Baseline Check', path: '/baseline', description: 'Save a trusted hash and compare later.' },
  ];

  return (
    <main className="page-shell">
      <section className="hero card">
        <p className="eyebrow">File Integrity Checker</p>
        <h1>File Integrity Checker Using SHA-256</h1>
        <p className="hero-copy">
          This mini-project checks whether a file has changed by generating a hash and comparing it with a trusted value.
        </p>
        <div className="hero-actions">
          {cards.map((card) => (
            <Link key={card.path} to={card.path} className="action-card">
              <strong>{card.title}</strong>
              <span>{card.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function HashPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [hash, setHash] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const data = await requestJson(`${API_URL}/hash`, {
        method: 'POST',
        body: formData,
      });

      setHash(data.hash);
      setMessage(`SHA-256 generated successfully for ${data.fileName}.`);
    } catch (err) {
      setError(err.message || 'Unable to generate the hash.');
      setHash('');
    } finally {
      setLoading(false);
    }
  };

  const copyHash = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setMessage('Hash copied to clipboard.');
    } catch (error) {
      setError('Copy failed. You can still select and copy the hash manually.');
    }
  };

  return (
    <main className="page-shell">
      <section className="panel card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Generate Hash</p>
            <h2>Calculate SHA-256</h2>
          </div>
          <NavLink to="/" className="text-link">Back to home</NavLink>
        </div>

        <div className="field-group">
          <label htmlFor="hash-file">Select a file</label>
          <input
            id="hash-file"
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
        </div>

        <button className="primary-btn" onClick={handleGenerate} disabled={loading || !selectedFile}>
          {loading ? 'Generating...' : 'Calculate Hash'}
        </button>

        {selectedFile && (
          <div className="meta-row">
            <span>File name: {selectedFile.name}</span>
            <span>File size: {(selectedFile.size / 1024).toFixed(2)} KB</span>
          </div>
        )}

        {error && <div className="status-box error">{error}</div>}
        {message && <div className="status-box success">{message}</div>}

        {hash && (
          <div className="result-box">
            <div className="result-label">SHA-256</div>
            <div className="hash-box">{hash}</div>
            <button className="secondary-btn" onClick={copyHash}>Copy Hash</button>
          </div>
        )}
      </section>
    </main>
  );
}

function VerifyPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [expectedHash, setExpectedHash] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }

    if (!expectedHash.trim()) {
      setError('Please enter the expected SHA-256 hash.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('expectedHash', expectedHash);

      const data = await requestJson(`${API_URL}/verify`, {
        method: 'POST',
        body: formData,
      });

      setResult(data);
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="panel card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Verify File</p>
            <h2>Compare against expected hash</h2>
          </div>
          <NavLink to="/" className="text-link">Back to home</NavLink>
        </div>

        <div className="field-group">
          <label htmlFor="verify-file">Select file</label>
          <input id="verify-file" type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
        </div>

        <div className="field-group">
          <label htmlFor="expected-hash">Expected SHA-256</label>
          <input
            id="expected-hash"
            type="text"
            value={expectedHash}
            onChange={(event) => setExpectedHash(event.target.value)}
            placeholder="Enter a 64-character hexadecimal hash"
          />
        </div>

        <button className="primary-btn" onClick={handleVerify} disabled={loading || !selectedFile}>
          {loading ? 'Verifying...' : 'Verify File'}
        </button>

        {error && <div className="status-box error">{error}</div>}

        {result && (
          <div className={`result-box ${result.verified ? 'verified' : 'modified'}`}>
            <div className="result-title">{result.verified ? '✓ FILE INTEGRITY VERIFIED' : '✗ FILE INTEGRITY FAILED'}</div>
            <div className="result-label">Expected SHA-256</div>
            <div className="hash-box">{result.expectedHash}</div>
            <div className="result-label">Actual SHA-256</div>
            <div className="hash-box">{result.actualHash}</div>
            <div className="result-label">Status</div>
            <div className="state-pill">{result.status}</div>
          </div>
        )}
      </section>
    </main>
  );
}

function BaselinePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [baseline, setBaseline] = useState(() => readBaseline());
  const [currentHash, setCurrentHash] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const createBaseline = async () => {
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }

    try {
      const hash = await computeHashFromFile(selectedFile);
      const record = { fileName: selectedFile.name, hash, savedAt: new Date().toISOString() };
      writeBaseline(record);
      setBaseline(record);
      setCurrentHash(hash);
      setStatus('SAFE');
      setMessage('Baseline saved successfully in this browser.');
      setError('');
    } catch (err) {
      setError('Unable to create the baseline for this file.');
    }
  };

  const checkBaseline = async () => {
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }

    try {
      const hash = await computeHashFromFile(selectedFile);
      setCurrentHash(hash);

      if (!baseline) {
        setError('No baseline is saved yet. Create a baseline first.');
        setStatus('');
        return;
      }

      const isMatch = baseline.hash.toLowerCase() === hash.toLowerCase();
      setStatus(isMatch ? 'SAFE' : 'MODIFIED');
      setMessage(isMatch ? 'The file matches the saved baseline.' : 'The file differs from the saved baseline.');
      setError('');
    } catch (err) {
      setError('Unable to compare the file with the saved baseline.');
    }
  };

  return (
    <main className="page-shell">
      <section className="panel card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Baseline Check</p>
            <h2>Quick baseline comparison</h2>
          </div>
          <NavLink to="/" className="text-link">Back to home</NavLink>
        </div>

        <div className="field-group">
          <label htmlFor="baseline-file">Select a file</label>
          <input id="baseline-file" type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
        </div>

        <div className="button-row">
          <button className="primary-btn" onClick={createBaseline}>Create Baseline</button>
          <button className="secondary-btn" onClick={checkBaseline}>Check Integrity</button>
        </div>

        {error && <div className="status-box error">{error}</div>}
        {message && <div className="status-box success">{message}</div>}

        {baseline && (
          <div className="result-box">
            <div className="result-label">Baseline</div>
            <div className="hash-box">{baseline.hash}</div>
            <div className="result-label">Saved file</div>
            <div className="hash-box">{baseline.fileName}</div>
          </div>
        )}

        {currentHash && (
          <div className="result-box">
            <div className="result-label">Current</div>
            <div className="hash-box">{currentHash}</div>
            {status && <div className="state-pill">{status}</div>}
          </div>
        )}
      </section>
    </main>
  );
}

function AppShell() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">SHA-256 Integrity</div>
          <nav className="nav">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink to="/generate" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Generate Hash
            </NavLink>
            <NavLink to="/verify" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Verify File
            </NavLink>
            <NavLink to="/baseline" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Baseline
            </NavLink>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<HashPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/baseline" element={<BaselinePage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppShell />;
}
