import { computeWebhookSignature, verifyWebhookSignature } from '../src/utils/signature-utils';

describe('Signature Utilities', () => {
  const testSecret = 'testsecret123456789012345678901234567890-1';
  const testPayload = '{"id":"test1234","message":"hello"}';

  test('computeWebhookSignature should return a valid HMAC-SHA1 signature', () => {
    const signature = computeWebhookSignature(testSecret, testPayload);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(28);
  });

  test('verifyWebhookSignature should return true for a valid signature', () => {
    const computedSignature = computeWebhookSignature(testSecret, testPayload);
    const isValid = verifyWebhookSignature(computedSignature, testPayload, testSecret);
    expect(isValid).toBe(true);
  });

  test('verifyWebhookSignature should return false for an invalid signature', () => {
    const invalidSignature = 'invalid-signature-12345=';
    const isValid = verifyWebhookSignature(invalidSignature, testPayload, testSecret);
    expect(isValid).toBe(false);
  });

  test('verifyWebhookSignature should return false for a tampered payload', () => {
    const computedSignature = computeWebhookSignature(testSecret, testPayload);
    const tamperedPayload = '{"id":"test1234","message":"hello_tampered"}';
    const isValid = verifyWebhookSignature(computedSignature, tamperedPayload, testSecret);
    expect(isValid).toBe(false);
  });

  test('computeWebhookSignature should throw error if secret is missing', () => {
    expect(() => computeWebhookSignature('', testPayload)).toThrow("Webhook secret cannot be empty.");
  });

  test('verifyWebhookSignature should throw error if secret is missing', () => {
    expect(() => verifyWebhookSignature('any-sig', testPayload, '')).toThrow("Missing required parameters for webhook signature verification.");
  });
});