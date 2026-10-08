const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { authMiddleware } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

// --- Public ---
app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (_, res) => res.json({ ok: true }));

// --- Protected (all routes below require a valid JWT) ---
app.use('/api/aod',            authMiddleware, require('./routes/aod'));
app.use('/api/aod-secondcopy', authMiddleware, require('./routes/aodSecondCopy'));
app.use('/api/invoices',       authMiddleware, require('./routes/invoices'));
app.use('/api/returns',        authMiddleware, require('./routes/returns'));
app.use('/api/qc',             authMiddleware, require('./routes/qc'));
app.use('/api/replacements',   authMiddleware, require('./routes/replacements'));
app.use('/api/dashboard',      authMiddleware, require('./routes/dashboard'));
app.use('/api/import',         authMiddleware, require('./routes/import'));
app.use('/api/users',          require('./routes/users')); // users.js already has authMiddleware + requireRole('Admin')

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));