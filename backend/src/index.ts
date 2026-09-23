import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { visionRouter } from './routes/vision.js';
import { shotsRouter } from './routes/shots.js';
import { trainingRouter } from './routes/training.js';
import { securityRouter } from './routes/security.js';
import { authRouter } from './routes/auth.js';
import { decryptPayloadMiddleware } from './middleware/decryptPayloadMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 8181;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(decryptPayloadMiddleware);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/security', securityRouter);
app.use('/auth', authRouter);
app.use('/vision', visionRouter);
app.use('/shots', shotsRouter);
app.use('/training', trainingRouter);

app.listen(PORT, () => {
    console.log(`[bandaro-backend] listening on http://localhost:${PORT}`);
});
