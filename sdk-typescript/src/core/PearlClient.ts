import { HttpClient, validateBaseUrl, validateTimeout } from './HttpClient';
import { Chat } from '../resources/chat';
import { Files } from '../resources/files';
import { Webhooks } from '../resources/webhooks';
import { RetryPolicyConfig } from '../types';
import { RetryPolicy } from './RetryPolicy';

/**
 * Configuration options for initializing the PearlClient.
 */
export interface PearlClientOptions {
  /** Absolute http or https base URL for the Pearl API (optional, defaults to https://api.pearl.com/api/v1/). */
  baseUrl?: string;
  /** Timeout per attempt in milliseconds, including reading the response body (optional, defaults to 30000). */
  timeout?: number;
  /** Retry policy configuration (optional). */
  retryPolicy?: RetryPolicyConfig;
}

/**
 * Main client for interacting with the Pearl API.
 */
export class PearlClient {
  /**
   * Provides access to Chat API operations.
   */
  public chat: Chat;
  /**
   * Provides access to Files API operations (upload files for attachments).
   */
  public files: Files;
  /**
   * Provides access to Webhooks API operations.
   */
  public webhooks: Webhooks;

  /**
   * Initializes a new instance of the PearlClient.
   * @param apiKey Your Pearl API key.
   * @param options Configuration options for the client (optional).
   * @throws Error if `apiKey` is missing or configuration is invalid.
   */
  constructor(apiKey: string, options?: PearlClientOptions) {
    if (!apiKey) {
      throw new Error("PearlClient must include an apiKey.");
    }

    const { baseUrl, timeout, retryPolicy } = options || {};
    const requestTimeout = timeout ?? 30000;
    validateTimeout(requestTimeout);
    const resolvedBaseUrl = baseUrl || 'https://api.pearl.com/api/v1/';
    validateBaseUrl(resolvedBaseUrl);

    const apiClient = new HttpClient(resolvedBaseUrl, apiKey, requestTimeout, new RetryPolicy(retryPolicy));

    this.chat = new Chat(apiClient);
    this.files = new Files(apiClient);
    this.webhooks = new Webhooks(apiClient, apiKey);
  }
}
