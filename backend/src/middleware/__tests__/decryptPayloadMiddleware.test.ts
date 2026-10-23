import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { decryptPayloadMiddleware } from '../decryptPayloadMiddleware.js';
import { cryptoService } from '../../services/cryptoService.js';

describe('decryptPayloadMiddleware', () => {
    it('passes through when req.body is undefined or not encrypted', () => {
        const req = { body: undefined } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn() as unknown as NextFunction;

        decryptPayloadMiddleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        const reqPlain = { body: { user: 'camilo' } } as unknown as Request;
        decryptPayloadMiddleware(reqPlain, res, next);
        expect(next).toHaveBeenCalledTimes(2);
        expect(reqPlain.body).toEqual({ user: 'camilo' });
    });

    it('decrypts encrypted payload and replaces req.body', () => {
        const originalData = { command: 'start_training', level: 3 };
        const encrypted = cryptoService.encryptPayload(originalData);

        const req = { body: encrypted } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn() as unknown as NextFunction;

        decryptPayloadMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body).toEqual(originalData);
    });

    it('returns 400 when decryption fails', () => {
        const corruptedEncrypted = {
            _encrypted: true,
            keyId: 'wrong',
            encryptedKey: 'bad',
            iv: 'bad',
            authTag: 'bad',
            ciphertext: 'bad',
        };

        const req = { body: corruptedEncrypted } as unknown as Request;
        const jsonMock = vi.fn();
        const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
        const res = { status: statusMock } as unknown as Response;
        const next = vi.fn() as unknown as NextFunction;

        decryptPayloadMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                error: 'Cifrado inválido o llave expirada',
                reHandshakeRequired: true,
            })
        );
    });

    it('handles non-Error thrown during decryption gracefully', () => {
        const decryptSpy = vi.spyOn(cryptoService, 'decryptPayload').mockImplementationOnce(() => {
            throw 'string error';
        });

        const req = { body: { _encrypted: true } } as unknown as Request;
        const jsonMock = vi.fn();
        const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
        const res = { status: statusMock } as unknown as Response;
        const next = vi.fn() as unknown as NextFunction;

        decryptPayloadMiddleware(req, res, next);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                details: 'Decryption error',
                reHandshakeRequired: true,
            })
        );
        decryptSpy.mockRestore();
    });
});
