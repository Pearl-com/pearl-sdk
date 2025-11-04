import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ChatCompletionRequest, ChatCompletionResponse, ChatMessage, CONVERSATION_MODES, DEFAULT_MODEL } from '../types';

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
   * @param messages Array of chat messages for the conversation.
   * @param sessionId Unique identifier for the chat session.
   * @param mode The conversation mode (optional, defaults to PEARL_AI).
   * @param model The model to use (optional, defaults to "pearl-ai").
   * @param requestConfig Optional Axios request configuration.
   * @returns A Promise that resolves to the ChatCompletionResponse on success.
   * @throws AxiosError if the API call fails or a network issue occurs.
   */
  public async sendCompletion(
    messages: ChatMessage[],
    sessionId: string,
    mode: string = CONVERSATION_MODES.PEARL_AI,
    model: string = DEFAULT_MODEL,
    requestConfig?: AxiosRequestConfig,
    extraMetadata?: Record<string, string>
  ): Promise<ChatCompletionResponse> {
    // Construct the request object internally
    // Merge any extra metadata while ensuring explicit 'mode' and 'sessionId' take precedence.
    const metadata: Record<string, string> = {
      ...(extraMetadata || {}),
      mode,
      sessionId
    };

    const request: ChatCompletionRequest = {
      model,
      messages,
      metadata
    };

    // The Axios interceptors in PearlClient handle error logging, retries,
    // and ultimately resolve the promise with `response.data` or reject it with an error.
    const response = await this.apiClient.post<ChatCompletionResponse>(
      '/chat/completions',
      request,
      requestConfig
    );

    return response.data;
  }
}