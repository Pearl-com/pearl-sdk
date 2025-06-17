import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { Chat } from '../resources/chat';
import { Webhooks } from '../resources/webhooks';
import { ProblemDetailsResponse, RetryPolicyConfig } from '../types';
import { RetryPolicy } from './RetryPolicy';

/**
 * Main client for interacting with the Pearl API.
 */
export class PearlClient {
  private readonly apiKey: string;
  private readonly apiClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly retryPolicy: RetryPolicy;

  /**
   * Provides access to Chat API operations.
   */
  public chat: Chat;
  /**
   * Provides access to Webhooks API operations.
   */
  public webhooks: Webhooks;

  /**
   * Initializes a new instance of the PearlClient.
   * @param apiKey Your Pearl API key.
   * @param baseUrl Base URL for the Pearl API (optional, defaults to https://api.pearl.com/api/v1/).
   * @param timeout Request timeout in milliseconds (optional, defaults to 30000).
   * @param retryPolicy Retry policy configuration (optional).
   * @throws Error if `apiKey` is missing or `timeout` is invalid.
   */
  constructor(
    apiKey: string,
    baseUrl?: string,
    timeout?: number,
    retryPolicy?: RetryPolicyConfig
  ) {
    if (!apiKey) {
      throw new Error("PearlClient must include an apiKey.");
    }
    if (timeout !== undefined && (typeof timeout !== 'number' || timeout <= 0)) {
      throw new Error("Timeout must be a positive number if provided.");
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.pearl.com/api/v1/';
    this.retryPolicy = new RetryPolicy(retryPolicy);

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: timeout ?? 30000,
    });

    this.apiClient.interceptors.request.use(
      (requestConfig: InternalAxiosRequestConfig) => {
        // Attach a retry counter to the request config to track attempts
        (requestConfig as any).__retryCount = (requestConfig as any).__retryCount || 0;
        return requestConfig;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError<ProblemDetailsResponse>) => {
        const config = error.config as InternalAxiosRequestConfig & { __retryCount: number };
        const currentRetryCount = config.__retryCount;
        const statusCode = error.response?.status;

        if (this.retryPolicy.shouldRetry(currentRetryCount, statusCode)) {
          config.__retryCount += 1;
          const delay = this.retryPolicy.calculateRetryDelay(config.__retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.apiClient(config);
        }

        return Promise.reject(error);
      }
    );

    this.chat = new Chat(this.apiClient);
    this.webhooks = new Webhooks(this.apiClient, this.apiKey);
  }
}