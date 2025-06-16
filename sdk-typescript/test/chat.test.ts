import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { Chat } from '../src/resources/chat';
import { ChatCompletionRequest, ChatCompletionResponse } from '../src/types';

const mockAxiosInstance: jest.Mocked<AxiosInstance> = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
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


describe('Chat', () => {
  let chat: Chat;

  beforeEach(() => {
    jest.clearAllMocks();
    chat = new Chat(mockAxiosInstance);
  });

  // --- Constructor Test ---
  test('constructor should initialize with the provided apiClient', () => {
    // Access private property to verify initialization
    expect(chat['apiClient']).toBe(mockAxiosInstance);
  });

  // --- sendCompletion Method Tests ---
  describe('sendCompletion', () => {
    const mockRequest: ChatCompletionRequest = {
      model: "test-model",
      messages: [{ role: "user", content: "Test message" }],
      metadata: { source: "test" }
    };

    const testSessionId = "test-session-123";

    const mockResponseData: ChatCompletionResponse = {
      id: "chatcmpl-test",
      choices: [{
        index: 0,
        message: {
          score: null,
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
      // Mock the successful response from axios.post
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponseData });

      const response = await chat.sendCompletion(mockRequest, testSessionId);

      // Expect apiClient.post to have been called once
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      // Expect it to be called with the correct endpoint and request payload including sessionId
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        ...mockRequest,
        metadata: { ...mockRequest.metadata, sessionId: testSessionId }
      }, undefined);

      // Expect the method to return the data part of the Axios response
      expect(response).toEqual(mockResponseData);
    });

    test('should call apiClient.post with correct endpoint, payload, and requestConfig', async () => {
      const mockRequestConfig: AxiosRequestConfig = {
        headers: { 'X-Custom-Header': 'test-value' },
        timeout: 1000,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponseData });

      const response = await chat.sendCompletion(mockRequest, testSessionId, mockRequestConfig);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        ...mockRequest,
        metadata: { ...mockRequest.metadata, sessionId: testSessionId }
      }, mockRequestConfig);
      expect(response).toEqual(mockResponseData);
    });

    test('should propagate errors from apiClient.post', async () => {
      const mockError = new Error('Network error');
      mockAxiosInstance.post.mockRejectedValueOnce(mockError);

      await expect(chat.sendCompletion(mockRequest, testSessionId)).rejects.toBe(mockError);
    });
  });
});
