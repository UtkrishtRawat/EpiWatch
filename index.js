/**
 * Express Server Entry Point
 * Disease Outbreak Dashboard
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static Files ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API Routes ────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Catch-all: serve the dashboard ────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║     🦠 Disease Outbreak Dashboard                        ║
║     ─────────────────────────────                        ║
║     Server running on http://localhost:${PORT}              ║
║     Dashboard: http://localhost:${PORT}                     ║
║     API Base:  http://localhost:${PORT}/api                 ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
