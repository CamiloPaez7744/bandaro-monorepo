import type { Request, Response, NextFunction } from 'express';
import { cryptoService } from '../services/cryptoService.js';

export function decryptPayloadMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.body && req.body._encrypted === true) {
        try {
            const decryptedBody = cryptoService.decryptPayload(req.body);
            req.body = decryptedBody;
        } catch (error) {
            res.status(400).json({
                error: 'Cifrado inválido o llave expirada',
                details: error instanceof Error ? error.message : 'Decryption error',
                reHandshakeRequired: true,
            });
            return;
        }
    }
    next();
}
