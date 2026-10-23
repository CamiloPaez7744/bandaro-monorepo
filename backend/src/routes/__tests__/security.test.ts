import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { securityRouter } from '../security.js';

describe('GET /security/handshake', () => {
    const app = express();
    app.use('/security', securityRouter);

    it('returns handshake info with publicKey, keyId, and algorithm', async () => {
        const response = await request(app).get('/security/handshake');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.keyId).toBeDefined();
        expect(response.body.publicKey).toContain('BEGIN PUBLIC KEY');
        expect(response.body.algorithm).toBe('RSA-OAEP-256 + AES-256-GCM');
        expect(response.body.timestamp).toBeGreaterThan(0);
    });
});
