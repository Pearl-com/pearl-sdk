import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ChatCompletionRequest, ChatCompletionResponse } from '../types';

/**
 * Manages chat-related operations, structured under `client.chat`.
 */
export class Chat {
  private apiClient: AxiosInstance;

  constructor(apiClient: AxiosInstance) {
    this.apiClient = apiClient;
  }

  /**
   * Sends a chat completion request to the Pearl API's /chat/completions endpoint.
   * This method serves as the primary entry point for generating text completions,
   * whether for conversational AI or general text generation tasks.
   * @param request The chat completion request payload.
   * @param sessionId The session ID to associate with this request.
   * @param requestConfig Optional Axios request configuration (e.g., custom headers, timeout override).
   * @returns A Promise that resolves to the ChatCompletionResponse on success.
   * @throws AxiosError (or a wrapped custom error if you choose to reintroduce PearlError classes)
   * if the API call fails or a network issue occurs. Errors are handled and logged by the
   * Axios interceptors in `PearlClient`.
   */
  public async sendCompletion(request: ChatCompletionRequest, sessionId: string, requestConfig?: AxiosRequestConfig): Promise<ChatCompletionResponse> {
    // Add sessionId to metadata
    const requestWithSession = {
      ...request,
      metadata: {
        ...request.metadata,
        sessionId
      }
    };

    // The Axios interceptors in PearlClient handle error logging, retries,
    // and ultimately resolve the promise with `response.data` or reject it with an error.
    const response = await this.apiClient.post<ChatCompletionResponse>(
      '/chat/completions',
      requestWithSession,
      requestConfig
    );

    return response.data;
  }
}