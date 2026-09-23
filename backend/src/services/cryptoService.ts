import {
    constants,
    createCipheriv,
    createDecipheriv,
    generateKeyPairSync,
    privateDecrypt,
    publicEncrypt,
    randomBytes,
    randomUUID,
} from 'node:crypto';

export interface HandshakeInfo {
    keyId: string;
    publicKey: string;
    algorithm: string;
    timestamp: number;
}

export interface EncryptedPayload {
    _encrypted: true;
    keyId: string;
    encryptedKey: string; // base64 (AES key encrypted with RSA-OAEP-256)
    iv: string;           // base64 (12-byte IV for AES-256-GCM)
    authTag: string;      // base64 (16-byte authentication tag)
    ciphertext: string;   // base64 (AES-256-GCM ciphertext)
}

class CryptoService {
    private keyId: string;
    private publicKeyPem: string;
    private privateKeyPem: string;

    constructor() {
        console.log('[crypto] Initializing new dynamic RSA-2048 keypair on startup...');
        this.keyId = randomUUID();
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });
        this.publicKeyPem = publicKey;
        this.privateKeyPem = privateKey;
        console.log(`[crypto] Keypair ready. Key ID: ${this.keyId}`);
    }

    /**
     * Handshake payload shared with frontend clients on startup
     */
    public getHandshakeInfo(): HandshakeInfo {
        return {
            keyId: this.keyId,
            publicKey: this.publicKeyPem,
            algorithm: 'RSA-OAEP-256 + AES-256-GCM',
            timestamp: Date.now(),
        };
    }

    /**
     * Decrypts an incoming hybrid-encrypted payload from frontend
     */
    public decryptPayload<T = any>(payload: any): T {
        if (!payload || payload._encrypted !== true) {
            return payload as T;
        }

        const encrypted = payload as EncryptedPayload;

        if (encrypted.keyId !== this.keyId) {
            console.warn(
                `[crypto] Warning: Payload keyId (${encrypted.keyId}) does not match current server keyId (${this.keyId}). Client may need to re-handshake.`
            );
        }

        try {
            // 1. Decrypt AES-256 key using server's RSA Private Key (RSA-OAEP with SHA-256)
            const encryptedKeyBuffer = Buffer.from(encrypted.encryptedKey, 'base64');
            const aesKeyBuffer = privateDecrypt(
                {
                    key: this.privateKeyPem,
                    padding: constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256',
                },
                encryptedKeyBuffer
            );

            // 2. Decrypt ciphertext using AES-256-GCM
            const iv = Buffer.from(encrypted.iv, 'base64');
            const authTag = Buffer.from(encrypted.authTag, 'base64');
            const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

            const decipher = createDecipheriv('aes-256-gcm', aesKeyBuffer, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]).toString('utf8');

            return JSON.parse(decrypted) as T;
        } catch (error) {
            console.error('[crypto] Failed to decrypt incoming payload:', error);
            throw new Error('Payload decryption failed: Invalid key, corrupted payload or authentication tag mismatch');
        }
    }

    /**
     * Encrypts a response payload using AES-256-GCM if requested
     */
    public encryptPayload(data: any): EncryptedPayload {
        const jsonStr = JSON.stringify(data);
        const aesKey = randomBytes(32);
        const iv = randomBytes(12);

        const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
        const ciphertext = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        const encryptedKey = publicEncrypt(
            {
                key: this.publicKeyPem,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            aesKey
        );

        return {
            _encrypted: true,
            keyId: this.keyId,
            encryptedKey: encryptedKey.toString('base64'),
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            ciphertext: ciphertext.toString('base64'),
        };
    }
}

export const cryptoService = new CryptoService();
