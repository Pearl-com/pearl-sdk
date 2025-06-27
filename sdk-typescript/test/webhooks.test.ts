import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Webhooks } from '../src/resources/webhooks';
import { WebhookEndpointRequest } from '../src/types';

jest.mock('../src/utils/signature-utils', () => ({
  verifyWebhookSignature: jest.fn(),
  computeWebhookSignature: jest.fn(),
}));

import { verifyWebhookSignature, computeWebhookSignature } from '../src/utils/signature-utils';

const mockedVerifyWebhookSignature = verifyWebhookSignature as jest.Mock;
const mockedComputeWebhookSignature = computeWebhookSignature as jest.Mock;

const mockAxiosInstance: jest.Mocked<AxiosInstance> = {
  post: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
  head: jest.fn(),
  options: jest.fn(),
  patch: jest.fn(),
  isAxiosError: jest.fn(),
  Axios: jest.fn(),
  getUri: jest.fn(),
  defaults: {},
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
} as unknown as jest.Mocked<AxiosInstance>;


describe('Webhooks', () => {
  const MOCK_WEBHOOK_SECRET = 'supersecretkey1234567890abcdef';

  let webhooks: Webhooks;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
    webhooks = new Webhooks(mockAxiosInstance, MOCK_WEBHOOK_SECRET);
  });

  // --- Constructor Tests ---
  test('constructor should initialize with apiClient and webhookSecret', () => {
    expect(webhooks['apiClient']).toBe(mockAxiosInstance);
    expect(webhooks['webhookSecret']).toBe(MOCK_WEBHOOK_SECRET);
  });

  test('constructor should throw an error if webhookSecret is missing', () => {
    // @ts-ignore - Intentionally testing invalid constructor input
    expect(() => new Webhooks(mockAxiosInstance, undefined)).toThrow("Webhook secret must be provided to Webhooks resource.");
    // @ts-ignore
    expect(() => new Webhooks(mockAxiosInstance, '')).toThrow("Webhook secret must be provided to Webhooks resource.");
    // @ts-ignore
    expect(() => new Webhooks(mockAxiosInstance, null)).toThrow("Webhook secret must be provided to Webhooks resource.");
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
      mockAxiosInstance.post.mockResolvedValueOnce({});
      await webhooks.register(registerRequest);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/webhook', registerRequest, undefined);
    });

    test('should call apiClient.post with requestConfig', async () => {
      const requestConfig: AxiosRequestConfig = { headers: { 'X-Test': 'Header' } };
      mockAxiosInstance.post.mockResolvedValueOnce({});
      await webhooks.register(registerRequest, requestConfig);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/webhook', registerRequest, requestConfig);
    });

    test('should propagate errors from apiClient.post', async () => {
      const mockError = new Error('Registration failed');
      mockAxiosInstance.post.mockRejectedValueOnce(mockError);
      await expect(webhooks.register(registerRequest)).rejects.toBe(mockError);
    });
  });

  // --- update Method Tests ---
  describe('update', () => {
    const updateRequest: WebhookEndpointRequest = { endpoint: 'https://example.com/updated-webhook' };

    test('should call apiClient.put with correct endpoint and request', async () => {
      mockAxiosInstance.put.mockResolvedValueOnce({});
      await webhooks.update(updateRequest);
      expect(mockAxiosInstance.put).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/webhook', updateRequest, undefined);
    });

    test('should call apiClient.put with requestConfig', async () => {
      const requestConfig: AxiosRequestConfig = { timeout: 5000 };
      mockAxiosInstance.put.mockResolvedValueOnce({});
      await webhooks.update(updateRequest, requestConfig);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/webhook', updateRequest, requestConfig);
    });

    test('should propagate errors from apiClient.put', async () => {
      const mockError = new Error('Update failed');
      mockAxiosInstance.put.mockRejectedValueOnce(mockError);
      await expect(webhooks.update(updateRequest)).rejects.toBe(mockError);
    });
  });
});
