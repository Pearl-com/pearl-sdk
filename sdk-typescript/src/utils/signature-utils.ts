import * as crypto from 'crypto';

/**
 * Derives the actual HMAC key from the provided secret using SHA256 hashing and string concatenation.
 *
 * @param initialSecret The initial secret.
 * @returns The SHA256-derived HMAC key as an uppercase hexadecimal string.
 */
function deriveHmacKey(initialSecret: string): string {
    const concatenatedString = `${initialSecret}:reference_token`;

    const hash = crypto.createHash('sha256')
                        .update(Buffer.from(concatenatedString, 'utf8'))
                        .digest();

    return hash.toString('hex').toUpperCase();
}

/**
 * Computes the HMAC-SHA1 signature for a given webhook payload and secret.
 *
 * @param secret The webhook secret (your `referenceToken`).
 * @param payload The raw JSON string of the webhook body.
 * @returns The Base64-encoded HMAC-SHA1 signature.
 */
export function computeWebhookSignature(secret: string, payload: string): string {
    if (!secret) {
        throw new Error("Webhook secret cannot be empty.");
    }
    const hmacKey = deriveHmacKey(secret);
    const hmac = crypto.createHmac('sha1', Buffer.from(hmacKey , 'utf8'));
    hmac.update(Buffer.from(payload, 'utf8'));
    return hmac.digest('base64');
}

/**
 * Verifies the authenticity of a Pearl webhook payload using its signature.
 *
 * @param receivedSignature The signature received in the 'X-Pearl-API-Signature' header.
 * @param webhookPayloadJsonString The raw JSON string of the webhook request body.
 * @param webhookSecret The shared secret.
 * @returns boolean indicating if the signature is valid.
 * @throws Error if the signature is invalid for security reasons (prevents silent failures),
 * or if required parameters are missing.
 */
export function verifyWebhookSignature(
    receivedSignature: string,
    webhookPayloadJsonString: string,
    webhookSecret: string
): boolean {
    if (!receivedSignature || !webhookPayloadJsonString || !webhookSecret) {
        throw new Error("Missing required parameters for webhook signature verification.");
    }

    const computedSignature = computeWebhookSignature(webhookSecret, webhookPayloadJsonString);

    const receivedSigBuffer = Buffer.from(receivedSignature, 'base64');
    const computedSigBuffer = Buffer.from(computedSignature, 'base64');

    if (receivedSigBuffer.length !== computedSigBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(receivedSigBuffer, computedSigBuffer);
}