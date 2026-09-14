type JWTPayload = {
	exp: number;
	sub?: string;
	name?: string;
};

function decodeJWT(token: string): JWTPayload | null {
	try {
		// JWT format: Header.Payload.Signature
		const parts = token.split(".");
		if (parts.length !== 3) return null;

		const payloadBase64 = parts[1];
		return JSON.parse(atob(payloadBase64));
	} catch {
		return null;
	}
}

export function isTokenValid(token: string | null): boolean {
	if (!token) return false;

	const payload = decodeJWT(token);
	if (!payload) return false;

	const currentTime = Date.now() / 1000; // convert milliseconds to seconds
	return payload.exp > currentTime;
}

// milliseconds since epoch the token expires at, or null if it can't be decoded
export function getTokenExpiryMs(token: string | null): number | null {
	if (!token) return null;

	const payload = decodeJWT(token);
	if (!payload) return null;

	return payload.exp * 1000;
}
