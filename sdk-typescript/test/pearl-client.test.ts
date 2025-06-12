import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse, InternalAxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { PearlClient, PearlClientConfig } from '../src/index';
import { Chat } from '../src/resources/chat';
import { Webhooks } from '../src/resources/webhooks';
import { RetryPolicy } from '../src/core/RetryPolicy';
import { ProblemDetailsResponse } from '../src/types';

interface TestAxiosRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

type MockedAxiosInstanceCallable = jest.Mock & AxiosInstance;

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../src/core/RetryPolicy', () => {
  return {
    RetryPolicy: jest.fn().mockImplementation((config) => {
      return {
        enabled: config?.enabled ?? true,
        maxRetries: config?.maxRetries ?? 30,
        retryDelayMs: config?.retryDelayMs ?? 100,
        maxRetryDelayMs: config?.maxRetryDelayMs ?? 30000,
        shouldRetry: jest.fn(),
        calculateRetryDelay: jest.fn(() => 0),
      };
    }),
  };
});
const MockedRetryPolicy = RetryPolicy as jest.MockedClass<typeof RetryPolicy>;


describe('PearlClient', () => {
  const MOCK_API_KEY = 'test_api_key_123';
  const MOCK_BASE_URL = 'https://api.test.com/api/v1/';

  beforeEach(() => {
    jest.clearAllMocks();

    const mockAxiosInstanceCallable: MockedAxiosInstanceCallable = jest.fn() as unknown as MockedAxiosInstanceCallable;
    Object.assign(mockAxiosInstanceCallable, {
      defaults: {},
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      head: jest.fn(),
      options: jest.fn(),
      patch: jest.fn(),
      isAxiosError: jest.fn(),
      Axios: jest.fn(),
      getUri: jest.fn(),
    });
    
    mockedAxios.create.mockReturnValue(mockAxiosInstanceCallable);
  });

  // --- Constructor Validation Tests ---

  test('should throw an error if apiKey is missing', () => {
    // @ts-ignore - Intentionally test invalid config
    expect(() => new PearlClient({})).toThrow("PearlClient configuration must include an apiKey.");
    // @ts-ignore - Intentionally test invalid config
    expect(() => new PearlClient({ apiKey: undefined })).toThrow("PearlClient configuration must include an apiKey.");
    // @ts-ignore - Intentionally test invalid config
    expect(() => new PearlClient({ apiKey: null })).toThrow("PearlClient configuration must include an apiKey.");
  });

  test('should throw an error if timeout is not a positive number', () => {
    const commonConfig = { apiKey: MOCK_API_KEY };
    // @ts-ignore - Intentionally test invalid config
    expect(() => new PearlClient({ ...commonConfig, timeout: 0 })).toThrow("Timeout must be a positive number if provided.");
    // @ts-ignore - Intentionally test invalid config
    expect(() => new PearlClient({ ...commonConfig, timeout: -100 })).toThrow("Timeout must be a positive number if provided.");
    // @ts-ignore - Intentionally test invalid config
    expect(() => new PearlClient({ ...commonConfig, timeout: 'abc' })).toThrow("Timeout must be a positive number if provided.");
  });

  // --- Constructor Initialization Tests ---

  test('should initialize with provided config and default values', () => {
    const client = new PearlClient({ apiKey: MOCK_API_KEY });

    expect(client['apiKey']).toBe(MOCK_API_KEY);
    expect(client['baseUrl']).toBe('https://api.pearl.com/api/v1/');
    expect(client['apiClient']).toBeDefined();
    expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://api.pearl.com/api/v1/',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_API_KEY}`,
      },
      timeout: 30000,
    }));
    expect(client.chat).toBeInstanceOf(Chat);
    expect(client.webhooks).toBeInstanceOf(Webhooks);
    expect(MockedRetryPolicy).toHaveBeenCalledWith(undefined);
  });

  test('should initialize with custom baseUrl and timeout', () => {
    const customConfig: PearlClientConfig = {
      apiKey: MOCK_API_KEY,
      baseUrl: MOCK_BASE_URL,
      timeout: 5000,
      retryPolicy: { enabled: false, maxRetries: 5 }
    };
    const client = new PearlClient(customConfig);

    expect(client['apiKey']).toBe(MOCK_API_KEY);
    expect(client['baseUrl']).toBe(MOCK_BASE_URL);
    expect(client['apiClient']).toBeDefined();
    expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: MOCK_BASE_URL,
      timeout: 5000,
    }));
    expect(client.chat).toBeInstanceOf(Chat);
    expect(client.webhooks).toBeInstanceOf(Webhooks);
    expect(MockedRetryPolicy).toHaveBeenCalledWith(customConfig.retryPolicy);
  });

  // --- Axios Interceptor Tests ---

  describe('Axios Interceptors', () => {
    let mockRequestInterceptor: jest.Mock;
    let mockResponseInterceptor: jest.Mock;
    let client: PearlClient;
    let mockedAxiosInstance: MockedAxiosInstanceCallable;

    beforeEach(() => {
      jest.clearAllMocks();

      const mockAxiosInstanceCallable: MockedAxiosInstanceCallable = jest.fn() as unknown as MockedAxiosInstanceCallable;
      Object.assign(mockAxiosInstanceCallable, {
        defaults: {},
        interceptors: {
          request: { use: jest.fn(), eject: jest.fn() },
          response: { use: jest.fn(), eject: jest.fn() },
        },
        get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(),
        request: jest.fn(),
        head: jest.fn(),
        options: jest.fn(),
        patch: jest.fn(),
        isAxiosError: jest.fn(),
        Axios: jest.fn(),
        getUri: jest.fn(),
      });
      mockedAxios.create.mockReturnValue(mockAxiosInstanceCallable);
      mockedAxiosInstance = mockAxiosInstanceCallable;

      client = new PearlClient({ apiKey: MOCK_API_KEY });

      const requestUseCall = (mockedAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0];
      mockRequestInterceptor = requestUseCall ? requestUseCall[0] : jest.fn();

      const responseUseCall = (mockedAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0];
      mockResponseInterceptor = responseUseCall ? responseUseCall[0] : jest.fn();

      const retryPolicyInstance = MockedRetryPolicy.mock.results[0]?.value;
      if (retryPolicyInstance) {
        retryPolicyInstance.shouldRetry.mockClear();
        retryPolicyInstance.calculateRetryDelay.mockClear();
      }
    });

    test('request interceptor should initialize __retryCount', async () => {
      const initialConfig: TestAxiosRequestConfig = { url: '/test', method: 'get', headers: {} as AxiosRequestHeaders };
      const modifiedConfig = mockRequestInterceptor(initialConfig);

      expect(modifiedConfig.__retryCount).toBe(0);
    });

    test('response interceptor should retry on retryable status code if shouldRetry is true', async () => {
      const mockErrorResponse: AxiosError<ProblemDetailsResponse> = {
        config: { url: '/test', method: 'get', headers: {} as AxiosRequestHeaders, __retryCount: 0 } as TestAxiosRequestConfig,
        response: { status: 422, data: { Error: { message: 'Retryable error' } } } as AxiosResponse<ProblemDetailsResponse>,
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 422',
        toJSON: jest.fn(),
      };

      const retryPolicyInstance = MockedRetryPolicy.mock.results[0].value;
      retryPolicyInstance.shouldRetry.mockReturnValueOnce(true).mockReturnValueOnce(false);
      retryPolicyInstance.calculateRetryDelay.mockReturnValueOnce(10);

      mockedAxiosInstance.mockResolvedValueOnce({ data: 'retried data' });

      const responseErrorInterceptor = (mockedAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];
      await expect(responseErrorInterceptor(mockErrorResponse)).resolves.toEqual({ data: 'retried data' });

      expect(retryPolicyInstance.shouldRetry).toHaveBeenCalledTimes(1);
      expect(retryPolicyInstance.shouldRetry).toHaveBeenCalledWith(0, 422);

      expect(retryPolicyInstance.calculateRetryDelay).toHaveBeenCalledTimes(1);
      expect(retryPolicyInstance.calculateRetryDelay).toHaveBeenCalledWith(1);

      expect(mockedAxiosInstance).toHaveBeenCalledTimes(1);
      expect(mockedAxiosInstance).toHaveBeenCalledWith(expect.objectContaining({ __retryCount: 1 }));
    });


    test('response interceptor should reject on non-retryable status code', async () => {
      const mockErrorResponse: AxiosError<ProblemDetailsResponse> = {
        config: { url: '/test', method: 'get', headers: {} as AxiosRequestHeaders, __retryCount: 0 } as TestAxiosRequestConfig,
        response: { status: 400, data: { Error: { message: 'Bad request' } } } as AxiosResponse<ProblemDetailsResponse>,
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
        toJSON: jest.fn(),
      };

      const retryPolicyInstance = MockedRetryPolicy.mock.results[0].value;
      retryPolicyInstance.shouldRetry.mockReturnValue(false);

      const responseErrorInterceptor = (mockedAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];
      await expect(responseErrorInterceptor(mockErrorResponse)).rejects.toBe(mockErrorResponse);

      expect(retryPolicyInstance.shouldRetry).toHaveBeenCalledTimes(1);
      expect(retryPolicyInstance.shouldRetry).toHaveBeenCalledWith(0, 400);
      expect(retryPolicyInstance.calculateRetryDelay).not.toHaveBeenCalled();
      expect(mockedAxiosInstance).not.toHaveBeenCalled();
    });

    test('response interceptor should reject if max retries reached', async () => {
      const mockErrorResponse: AxiosError<ProblemDetailsResponse> = {
        config: { url: '/test', method: 'get', __retryCount: 5, headers: {} as AxiosRequestHeaders } as TestAxiosRequestConfig,
        response: { status: 422, data: { Error: { message: 'Too many retries' } } } as AxiosResponse<ProblemDetailsResponse>,
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 422',
        toJSON: jest.fn(),
      };

      const retryPolicyInstance = MockedRetryPolicy.mock.results[0].value;
      retryPolicyInstance.shouldRetry.mockReturnValue(false);

      const responseErrorInterceptor = (mockedAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];
      await expect(responseErrorInterceptor(mockErrorResponse)).rejects.toBe(mockErrorResponse);

      expect(retryPolicyInstance.shouldRetry).toHaveBeenCalledTimes(1);
      expect(retryPolicyInstance.shouldRetry).toHaveBeenCalledWith(5, 422);
      expect(retryPolicyInstance.calculateRetryDelay).not.toHaveBeenCalled();
      expect(mockedAxiosInstance).not.toHaveBeenCalled();
    });

    test('response interceptor should pass through successful responses', async () => {
      const mockResponse: AxiosResponse = {
        data: { some: 'data' },
        status: 200,
        statusText: 'OK',
        headers: {} as AxiosRequestHeaders,
        config: { url: '/test', method: 'get', headers: {} as AxiosRequestHeaders }
      };

      const result = mockResponseInterceptor(mockResponse);

      expect(result).toBe(mockResponse);
    });

    test('request interceptor should pass through request errors', async () => {
        const mockError = new Error('Request setup error');
        const requestErrorInterceptor = (mockedAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0][1];

        await expect(requestErrorInterceptor(mockError)).rejects.toBe(mockError);
    });
  });
});
