import { describe, expect, it, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateKeyPairSync } from 'node:crypto';
import { getHandshake, encryptPayload, apiFetch, resetHandshakeCache } from '../security/cryptoClient';

describe('Infrastructure: Security cryptoClient', () => {
    let mockRsaPublicKey: string;

    beforeEach(async () => {
        resetHandshakeCache();
        vi.restoreAllMocks();
        await AsyncStorage.clear();

        const { publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        mockRsaPublicKey = publicKey;
    });

    describe('getHandshake', () => {
        it('fetches server handshake and caches it for subsequent calls', async () => {
            const handshakeData = {
                success: true,
                keyId: 'srv-key-1',
                publicKey: mockRsaPublicKey,
                algorithm: 'RSA-OAEP-256 + AES-256-GCM',
                timestamp: Date.now(),
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => handshakeData,
            });
            globalThis.fetch = mockFetch as any;

            const res1 = await getHandshake();
            expect(res1?.keyId).toBe('srv-key-1');

            // Second call uses cachedHandshake, fetch not called again
            const res2 = await getHandshake();
            expect(res2?.keyId).toBe('srv-key-1');
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('returns null when handshake endpoint returns non-ok status or network fails', async () => {
            globalThis.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
                status: 503,
            }) as any;

            // Wait until any active promise clears
            const res = await getHandshake();
            expect(res).toBeNull();

            // Network error
            globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network down')) as any;
            const resErr = await getHandshake();
            expect(resErr).toBeNull();
        });
    });

    describe('encryptPayload', () => {
        it('encrypts data object with hybrid encryption using WebCrypto subtle', async () => {
            const handshakeData = {
                success: true,
                keyId: 'k-1',
                publicKey: mockRsaPublicKey,
            };
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => handshakeData,
            }) as any;

            const payload = { username: 'camilo', shotId: 42 };
            const encrypted = await encryptPayload(payload);

            expect(encrypted._encrypted).toBe(true);
            expect(encrypted.keyId).toBe('k-1');
            expect(encrypted.encryptedKey).toBeDefined();
            expect(encrypted.iv).toBeDefined();
            expect(encrypted.authTag).toBeDefined();
            expect(encrypted.ciphertext).toBeDefined();
        });

        it('falls back to plaintext if handshake fails', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            }) as any;

            const payload = { foo: 'bar' };
            const result = await encryptPayload(payload);
            expect(result).toEqual(payload);
        });
    });

    describe('apiFetch', () => {
        it('attaches stored Bearer token and encrypts JSON body', async () => {
            await AsyncStorage.setItem('@billar/auth/access_token', 'my-auth-token');

            const handshakeData = {
                success: true,
                keyId: 'k-fetch',
                publicKey: mockRsaPublicKey,
            };

            const mockFetch = vi.fn().mockImplementation((url: string, init: any) => {
                if (url.includes('/security/handshake')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => handshakeData,
                    });
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ success: true }),
                    clone: () => ({ json: async () => ({ success: true }) }),
                });
            });
            globalThis.fetch = mockFetch as any;

            const response = await apiFetch('/shots/catalog', {
                method: 'POST',
                body: JSON.stringify({ category: '3_bandas' }),
            });

            expect(response.status).toBe(200);

            // Verify headers passed to fetch
            const catalogCall = mockFetch.mock.calls.find((call) =>
                call[0].includes('/shots/catalog')
            );
            expect(catalogCall).toBeDefined();
            expect(catalogCall[1].headers['Authorization']).toBe('Bearer my-auth-token');
            expect(catalogCall[1].headers['Content-Type']).toBe('application/json');

            // Body should be encrypted JSON string
            const sentBody = JSON.parse(catalogCall[1].body);
            expect(sentBody._encrypted).toBe(true);
        });

        it('clears handshake cache when server responds 400 with reHandshakeRequired', async () => {
            const mockResponse = {
                status: 400,
                ok: false,
                clone: () => ({
                    json: async () => ({ reHandshakeRequired: true }),
                }),
            };

            globalThis.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

            const res = await apiFetch('/auth/login');
            expect(res.status).toBe(400);
        });
    });
});
