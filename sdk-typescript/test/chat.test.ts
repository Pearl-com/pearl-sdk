import { HttpClient, PearlRequestOptions } from '../src/core/HttpClient';
import { Chat } from '../src/resources/chat';
import { ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from '../src/types';

const mockHttpClient = { post: jest.fn(), put: jest.fn() } as unknown as jest.Mocked<HttpClient>;


describe('Chat', () => {
  let chat: Chat;

  beforeEach(() => {
    jest.clearAllMocks();
    chat = new Chat(mockHttpClient);
  });

  // --- Constructor Test ---
  test('constructor should initialize with the provided apiClient', () => {
    // Access private property to verify initialization
    expect(chat['apiClient']).toBe(mockHttpClient);
  });

  // --- sendCompletion Method Tests ---
  describe('sendCompletion', () => {
    const testMessages: ChatMessage[] = [{ role: "user", content: "Test message" }];
    const testSessionId = "test-session-123";
    const testModel = "test-model";
    const testMode = "test-mode";

    const mockResponseData: ChatCompletionResponse = {
      id: "chatcmpl-test",
      choices: [{
        index: 0,
        message: {
          isHuman: false,
          expertInfo: null,
          role: "assistant",
          content: "Mocked assistant response."
        },
        finish_reason: "stop"
      }],
      created: 1678886400,
      questionId: null,
      userId: null
    };

    test('should call apiClient.post with correct endpoint and payload', async () => {
      // Mock the successful response from HTTP post
      mockHttpClient.post.mockResolvedValueOnce(mockResponseData);

      const response = await chat.sendCompletion(testMessages, testSessionId, testMode, testModel);

      // Expect apiClient.post to have been called once
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      // Expect it to be called with the correct endpoint and request payload
      expect(mockHttpClient.post).toHaveBeenCalledWith('/chat/completions', {
        model: testModel,
        messages: testMessages,
        metadata: { mode: testMode, sessionId: testSessionId }
      }, undefined);

      // Expect the method to return the data part of the HTTP response
      expect(response).toEqual(mockResponseData);
    });

    test('should call apiClient.post with correct endpoint, payload, and options', async () => {
      const mockOptions: PearlRequestOptions = {
        headers: { 'X-Custom-Header': 'test-value' },
        timeout: 1000,
      };

      mockHttpClient.post.mockResolvedValueOnce(mockResponseData);

      const response = await chat.sendCompletion(testMessages, testSessionId, testMode, testModel, mockOptions);

      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/chat/completions', {
        model: testModel,
        messages: testMessages,
        metadata: { mode: testMode, sessionId: testSessionId }
      }, mockOptions);
      expect(response).toEqual(mockResponseData);
    });

    test('should include attachments on messages when provided', async () => {
      mockHttpClient.post.mockResolvedValueOnce(mockResponseData);

      const messagesWithAttachments: ChatMessage[] = [
        { role: 'user', content: "What's on the image?", attachments: ['file-123', 'file-456'] }
      ];

      await chat.sendCompletion(messagesWithAttachments, testSessionId, testMode, testModel);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/chat/completions', {
        model: testModel,
        messages: messagesWithAttachments,
        metadata: { mode: testMode, sessionId: testSessionId }
      }, undefined);
    });

    test('should propagate errors from apiClient.post', async () => {
      const mockError = new Error('Network error');
      mockHttpClient.post.mockRejectedValueOnce(mockError);

      await expect(chat.sendCompletion(testMessages, testSessionId, testMode, testModel)).rejects.toBe(mockError);
    });

    test('should merge extra metadata and preserve mode/sessionId precedence', async () => {
      mockHttpClient.post.mockResolvedValueOnce(mockResponseData);

      const extra = { custom: 'value', mode: 'override-mode', sessionId: 'override-session' };
      await chat.sendCompletion(testMessages, testSessionId, testMode, testModel, undefined, extra);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/chat/completions', {
        model: testModel,
        messages: testMessages,
        metadata: { custom: 'value', mode: testMode, sessionId: testSessionId }
      }, undefined);
    });

    test('should send both options and extra metadata', async () => {
      mockHttpClient.post.mockResolvedValueOnce(mockResponseData);
      const mockOptions: PearlRequestOptions = { timeout: 500 };
      const extra = { traceId: 'abc123' };

      await chat.sendCompletion(testMessages, testSessionId, testMode, testModel, mockOptions, extra);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/chat/completions', {
        model: testModel,
        messages: testMessages,
        metadata: { traceId: 'abc123', mode: testMode, sessionId: testSessionId }
      }, mockOptions);
    });
  });
});
