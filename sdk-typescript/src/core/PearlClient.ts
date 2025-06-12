import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { Chat } from '../resources/chat';
import { Webhooks } from '../resources/webhooks';
import { ProblemDetailsResponse, RetryPolicyConfig } from '../types';
import { RetryPolicy } from './RetryPolicy';

/**
 * Configuration options for the Pearl SDK client.
 */
export interface PearlClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryPolicy?: RetryPolicyConfig;
}

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
   * @param config Configuration options for the client.
   * @throws Error if `apiKey` is missing or `timeout` is invalid.
   */
  constructor(config: PearlClientConfig) {
    if (!config || !config.apiKey) {
      throw new Error("PearlClient configuration must include an apiKey.");
    }
    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new Error("Timeout must be a positive number if provided.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.pearl.com/api/v1/';
    this.retryPolicy = new RetryPolicy(config.retryPolicy);

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: config.timeout ?? 30000,
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