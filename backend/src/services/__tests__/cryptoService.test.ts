import { describe, expect, it, vi } from 'vitest';
import { cryptoService } from '../cryptoService.js';

describe('CryptoService', () => {
    it('returns valid handshake info with RSA public key', () => {
        const info = cryptoService.getHandshakeInfo();
        expect(info).toBeDefined();
        expect(info.keyId).toBeDefined();
        expect(typeof info.keyId).toBe('string');
        expect(info.publicKey).toContain('BEGIN PUBLIC KEY');
        expect(info.algorithm).toBe('RSA-OAEP-256 + AES-256-GCM');
        expect(info.timestamp).toBeGreaterThan(0);
    });

    it('returns unencrypted payload as is when _encrypted is false or missing', () => {
        const plainData = { foo: 'bar', count: 42 };
        const result = cryptoService.decryptPayload(plainData);
        expect(result).toEqual(plainData);

        expect(cryptoService.decryptPayload(null)).toBeNull();
        expect(cryptoService.decryptPayload(undefined)).toBeUndefined();
    });

    it('encrypts and decrypts complex JSON payloads successfully (round-trip)', () => {
        const secretData = {
            userId: 'usr-1234',
            email: 'player@bandaro.com',
            scores: [10, 15, 8],
            nested: { valid: true },
        };

        const encrypted = cryptoService.encryptPayload(secretData);
        expect(encrypted._encrypted).toBe(true);
        expect(encrypted.keyId).toBeDefined();
        expect(encrypted.encryptedKey).toBeDefined();
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.authTag).toBeDefined();
        expect(encrypted.ciphertext).toBeDefined();

        const decrypted = cryptoService.decryptPayload<typeof secretData>(encrypted);
        expect(decrypted).toEqual(secretData);
    });

    it('handles mismatched keyId with warning but still attempts decryption', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const secretData = { action: 'test' };
        const encrypted = cryptoService.encryptPayload(secretData);

        const tamperedPayload = {
            ...encrypted,
            keyId: 'different-client-key-id',
        };

        const decrypted = cryptoService.decryptPayload(tamperedPayload);
        expect(decrypted).toEqual(secretData);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Warning: Payload keyId')
        );
        consoleWarnSpy.mockRestore();
    });

    it('throws error when ciphertext is corrupted or tag mismatch', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const encrypted = cryptoService.encryptPayload({ secret: 'billiards' });

        const corruptedPayload = {
            ...encrypted,
            ciphertext: Buffer.from('corrupted-data').toString('base64'),
        };

        expect(() => cryptoService.decryptPayload(corruptedPayload)).toThrow(
            'Payload decryption failed'
        );
        consoleErrorSpy.mockRestore();
    });

    it('throws error when encryptedKey is invalid', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const encrypted = cryptoService.encryptPayload({ secret: 'billiards' });

        const corruptedKeyPayload = {
            ...encrypted,
            encryptedKey: Buffer.from('invalid-key-bytes').toString('base64'),
        };

        expect(() => cryptoService.decryptPayload(corruptedKeyPayload)).toThrow(
            'Payload decryption failed'
        );
        consoleErrorSpy.mockRestore();
    });
});
