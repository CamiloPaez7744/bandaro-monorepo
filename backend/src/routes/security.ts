import { Router, Request, Response } from 'express';
import { cryptoService } from '../services/cryptoService.js';

export const securityRouter: Router = Router();

securityRouter.get('/handshake', (_req: Request, res: Response) => {
    const handshakeInfo = cryptoService.getHandshakeInfo();
    res.json({
        success: true,
        ...handshakeInfo,
    });
});
