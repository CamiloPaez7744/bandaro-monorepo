const ONE_SECOND_MS = 1000;

function base64UrlEncode(value: string): string {
    return encodeURIComponent(value).replaceAll('.', '%2E').replaceAll('%', '_');
}

function base64UrlDecode(value: string): string {
    return decodeURIComponent(value.replaceAll('_', '%'));
}

export function createJwt(payload: Record<string, unknown>, expiresInSeconds: number): { token: string; exp: number } {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / ONE_SECOND_MS) + expiresInSeconds;
    const completePayload = { ...payload, exp };

    const headerPart = base64UrlEncode(JSON.stringify(header));
    const payloadPart = base64UrlEncode(JSON.stringify(completePayload));
    const signaturePart = base64UrlEncode(`${headerPart}.${payloadPart}.local-signature`);

    return {
        token: `${headerPart}.${payloadPart}.${signaturePart}`,
        exp: exp * ONE_SECOND_MS,
    };
}

export function readJwtExpiration(token: string): number {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('JWT invalido');
    }

    const payloadRaw = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadRaw) as { exp?: number };
    if (!payload.exp) {
        throw new Error('JWT sin expiracion');
    }

    return payload.exp * ONE_SECOND_MS;
}
