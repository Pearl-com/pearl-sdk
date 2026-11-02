import { HttpClient, validateTimeout } from './HttpClient';
import { Chat } from '../resources/chat';
import { Files } from '../resources/files';
import { Webhooks } from '../resources/webhooks';
import type { RetryPolicyConfig } from '../types';
import { RetryPolicy } from './RetryPolicy';

export interface PearlClientOptions {
  /** Base URL. Defaults to https://api.pearl.com/api/v1/. */
  baseUrl?: string;
  /** Timeout per attempt, including reading the response body. Defaults to 30000 ms. */
  timeout?: number;
  /** Retry settings. By default, retries HTTP 422 responses up to 30 times. */
  retryPolicy?: RetryPolicyConfig;
}

/** Entry point for the Pearl API. All resources share one HTTP transport. */
export class PearlClient {
  /** Chat completions. */
  public chat: Chat;
  /** File uploads for chat attachments. */
  public files: Files;
  /** Webhook registration and signature verification. */
  public webhooks: Webhooks;

  /** Throws if the API key is missing or timeout/retry settings are invalid. */
  constructor(apiKey: string, options?: PearlClientOptions) {
    if (!apiKey) {
      throw new Error('PearlClient must include an apiKey.');
    }

    const { baseUrl, timeout, retryPolicy } = options ?? {};
    const requestTimeout = timeout ?? 30000;
    validateTimeout(requestTimeout);

    const apiClient = new HttpClient(
      baseUrl || 'https://api.pearl.com/api/v1/',
      apiKey,
      requestTimeout,
      new RetryPolicy(retryPolicy),
    );

    this.chat = new Chat(apiClient);
    this.files = new Files(apiClient);
    this.webhooks = new Webhooks(apiClient, apiKey);
  }
}
