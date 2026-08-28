type JWTPayload = {
	exp: number;
	sub?: string;
	name?: string;
};

export function isTokenValid(token: string | null): boolean {
	if (!token) return false;

	try {
		// JWT format: Header.Payload.Signature
		const parts = token.split(".");
		if (parts.length !== 3) return false;

		// Decode the base64 payload safely
		const payloadBase64 = parts[1];
		const decodedPayload: JWTPayload = JSON.parse(atob(payloadBase64));

		const currentTime = Date.now() / 1000; // Convert milliseconds to seconds

		return decodedPayload.exp > currentTime;
	} catch (error) {
		return false; // Structurally invalid or corrupted token
	}
}
