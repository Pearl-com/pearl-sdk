import { HttpClient, PearlRequestOptions } from '../src/core/HttpClient';
import { Webhooks } from '../src/resources/webhooks';
import { WebhookEndpointRequest } from '../src/types';

jest.mock('../src/utils/signature-utils', () => ({
  verifyWebhookSignature: jest.fn(),
  computeWebhookSignature: jest.fn(),
}));

import { verifyWebhookSignature, computeWebhookSignature } from '../src/utils/signature-utils';

const mockedVerifyWebhookSignature = verifyWebhookSignature as jest.Mock;
const mockedComputeWebhookSignature = computeWebhookSignature as jest.Mock;

const mockHttpClient = { post: jest.fn(), put: jest.fn() } as unknown as jest.Mocked<HttpClient>;


describe('Webhooks', () => {
  const MOCK_WEBHOOK_SECRET = 'supersecretkey1234567890abcdef';

  let webhooks: Webhooks;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
    webhooks = new Webhooks(mockHttpClient, MOCK_WEBHOOK_SECRET);
  });

  // --- Constructor Tests ---
  test('constructor should initialize with apiClient and webhookSecret', () => {
    expect(webhooks['apiClient']).toBe(mockHttpClient);
    expect(webhooks['webhookSecret']).toBe(MOCK_WEBHOOK_SECRET);
  });

  test('constructor should throw an error if webhookSecret is missing', () => {
    // @ts-ignore - Intentionally testing invalid constructor input
    expect(() => new Webhooks(mockHttpClient, undefined)).toThrow("Webhook secret must be provided to Webhooks resource.");
    // @ts-ignore
    expect(() => new Webhooks(mockHttpClient, '')).toThrow("Webhook secret must be provided to Webhooks resource.");
    // @ts-ignore
    expect(() => new Webhooks(mockHttpClient, null)).toThrow("Webhook secret must be provided to Webhooks resource.");
  });

  // --- isValidSignature Tests ---
  describe('isValidSignature', () => {
    const receivedSignature = 'mocked_signature';
    const webhookPayloadJsonString = '{"event":"test"}';

    test('should return true if verifyWebhookSignature returns true', () => {
      mockedVerifyWebhookSignature.mockReturnValue(true);
      const isValid = webhooks.isValidSignature(receivedSignature, webhookPayloadJsonString);
      expect(isValid).toBe(true);
      expect(mockedVerifyWebhookSignature).toHaveBeenCalledWith(receivedSignature, webhookPayloadJsonString, MOCK_WEBHOOK_SECRET);
    });

    test('should return false if verifyWebhookSignature returns false', () => {
      mockedVerifyWebhookSignature.mockReturnValue(false);
      const isValid = webhooks.isValidSignature(receivedSignature, webhookPayloadJsonString);
      expect(isValid).toBe(false);
      expect(mockedVerifyWebhookSignature).toHaveBeenCalledWith(receivedSignature, webhookPayloadJsonString, MOCK_WEBHOOK_SECRET);
    });
  });

  // --- computeSignature Tests ---
  describe('computeSignature', () => {
    const payload = '{"data":"some_data"}';
    const computedSignature = 'mocked_computed_signature';

    test('should call computeWebhookSignature with correct payload and secret', () => {
      mockedComputeWebhookSignature.mockReturnValue(computedSignature);
      const signature = webhooks.computeSignature(payload);
      expect(signature).toBe(computedSignature);
      expect(mockedComputeWebhookSignature).toHaveBeenCalledWith(MOCK_WEBHOOK_SECRET, payload);
    });
  });

  // --- register Method Tests ---
  describe('register', () => {
    const registerRequest: WebhookEndpointRequest = { endpoint: 'https://example.com/webhook' };

    test('should call apiClient.post with correct endpoint and request', async () => {
      mockHttpClient.post.mockResolvedValueOnce({ data: undefined });
      await webhooks.register(registerRequest);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/webhook', registerRequest, undefined);
    });

    test('should call apiClient.post with requestConfig', async () => {
      const requestConfig: PearlRequestOptions = { headers: { 'X-Test': 'Header' } };
      mockHttpClient.post.mockResolvedValueOnce({ data: undefined });
      await webhooks.register(registerRequest, requestConfig);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/webhook', registerRequest, requestConfig);
    });

    test('should propagate errors from apiClient.post', async () => {
      const mockError = new Error('Registration failed');
      mockHttpClient.post.mockRejectedValueOnce(mockError);
      await expect(webhooks.register(registerRequest)).rejects.toBe(mockError);
    });
  });

  // --- update Method Tests ---
  describe('update', () => {
    const updateRequest: WebhookEndpointRequest = { endpoint: 'https://example.com/updated-webhook' };

    test('should call apiClient.put with correct endpoint and request', async () => {
      mockHttpClient.put.mockResolvedValueOnce({ data: undefined });
      await webhooks.update(updateRequest);
      expect(mockHttpClient.put).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.put).toHaveBeenCalledWith('/webhook', updateRequest, undefined);
    });

    test('should call apiClient.put with requestConfig', async () => {
      const requestConfig: PearlRequestOptions = { timeout: 5000 };
      mockHttpClient.put.mockResolvedValueOnce({ data: undefined });
      await webhooks.update(updateRequest, requestConfig);
      expect(mockHttpClient.put).toHaveBeenCalledWith('/webhook', updateRequest, requestConfig);
    });

    test('should propagate errors from apiClient.put', async () => {
      const mockError = new Error('Update failed');
      mockHttpClient.put.mockRejectedValueOnce(mockError);
      await expect(webhooks.update(updateRequest)).rejects.toBe(mockError);
    });
  });
});
