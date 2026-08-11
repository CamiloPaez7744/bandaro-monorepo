import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { visionRouter } from './routes/vision.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 8181;

app.use(cors({ origin: ['http://localhost:8081', 'http://localhost:19006'] }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/vision', visionRouter);

app.listen(PORT, () => {
    console.log(`[bandaro-backend] listening on http://localhost:${PORT}`);
});
