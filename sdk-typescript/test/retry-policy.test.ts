import { RetryPolicy } from '../src/core/RetryPolicy';
import { RetryPolicyConfig } from '../src/types';

describe('RetryPolicy', () => {

  const originalMathRandom = Math.random;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  // --- Constructor Validation Tests ---

  test('should initialize with default values when no config is provided', () => {
    const policy = new RetryPolicy();
    expect(policy.enabled).toBe(true);
    expect(policy.maxRetries).toBe(30);
    expect(policy['retryDelayMs']).toBe(100);
    expect(policy['maxRetryDelayMs']).toBe(30000);
  });

  test('should initialize with provided custom config values', () => {
    const customConfig: RetryPolicyConfig = {
      enabled: false,
      maxRetries: 5,
      retryDelayMs: 200,
      maxRetryDelayMs: 5000,
    };
    const policy = new RetryPolicy(customConfig);
    expect(policy.enabled).toBe(false);
    expect(policy.maxRetries).toBe(5);
    expect(policy['retryDelayMs']).toBe(200);
    expect(policy['maxRetryDelayMs']).toBe(5000);
  });

  test('should throw error if maxRetries is negative', () => {
    const invalidConfig: RetryPolicyConfig = { maxRetries: -1 };
    expect(() => new RetryPolicy(invalidConfig)).toThrow("RetryPolicy: maxRetries must be a non-negative number if provided.");
  });

  test('should throw error if retryDelayMs is zero or negative', () => {
    expect(() => new RetryPolicy({ retryDelayMs: 0 })).toThrow("RetryPolicy: retryDelayMs must be a positive number if provided.");
    expect(() => new RetryPolicy({ retryDelayMs: -50 })).toThrow("RetryPolicy: retryDelayMs must be a positive number if provided.");
  });

  test('should throw error if maxRetryDelayMs is zero or negative', () => {
    expect(() => new RetryPolicy({ maxRetryDelayMs: 0 })).toThrow("RetryPolicy: maxRetryDelayMs must be a positive number if provided.");
    expect(() => new RetryPolicy({ maxRetryDelayMs: -500 })).toThrow("RetryPolicy: maxRetryDelayMs must be a positive number if provided.");
  });

  test('should throw error if retryDelayMs is greater than maxRetryDelayMs', () => {
    const invalidConfig: RetryPolicyConfig = { retryDelayMs: 1000, maxRetryDelayMs: 500 };
    expect(() => new RetryPolicy(invalidConfig)).toThrow("RetryPolicy: retryDelayMs cannot be greater than maxRetryDelayMs.");
  });

  // --- maxRetries Getter Test ---

  test('maxRetries getter should return the correct value', () => {
    const policy = new RetryPolicy({ maxRetries: 10 });
    expect(policy.maxRetries).toBe(10);
  });

  // --- shouldRetry Method Tests ---

  describe('shouldRetry', () => {
    let policy: RetryPolicy;

    beforeEach(() => {
      policy = new RetryPolicy({ maxRetries: 3 });
    });

    test('should return false if retry policy is disabled', () => {
      const disabledPolicy = new RetryPolicy({ enabled: false });
      expect(disabledPolicy.shouldRetry(0, 422)).toBe(false);
    });

    test('should return true for a retryable status code (422) within max retries', () => {
      expect(policy.shouldRetry(0, 422)).toBe(true);
      expect(policy.shouldRetry(1, 422)).toBe(true);
      expect(policy.shouldRetry(2, 422)).toBe(true);
    });

    test('should return false for a non-retryable status code (e.g., 200, 400, 500)', () => {
      expect(policy.shouldRetry(0, 200)).toBe(false); // OK
      expect(policy.shouldRetry(0, 400)).toBe(false); // Bad Request
      expect(policy.shouldRetry(0, 401)).toBe(false); // Unauthorized
      expect(policy.shouldRetry(0, 500)).toBe(false); // Internal Server Error (Note: current policy only retries 422)
    });

    test('should return false if currentRetryCount equals or exceeds maxRetries', () => {
      expect(policy.shouldRetry(3, 422)).toBe(false); // currentRetryCount equals maxRetries
      expect(policy.shouldRetry(4, 422)).toBe(false); // currentRetryCount exceeds maxRetries
    });
  });

  // --- calculateRetryDelay Method Tests ---

  describe('calculateRetryDelay', () => {
    let policy: RetryPolicy;

    beforeEach(() => {
      // Mock Math.random to return a predictable value for jitter (e.g., 0.5 for 5% jitter)
      // This allows for deterministic testing of the calculation.
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    test('should calculate exponential backoff delay with jitter', () => {
      policy = new RetryPolicy({ retryDelayMs: 100, maxRetryDelayMs: 10000 });

      // Retry 1: 100 * (2^0) + jitter = 100 + (0.05 * 100) = 100 + 5 = 105
      expect(policy.calculateRetryDelay(1)).toBe(105);

      // Retry 2: 100 * (2^1) + jitter = 200 + (0.05 * 200) = 200 + 10 = 210
      expect(policy.calculateRetryDelay(2)).toBe(210);

      // Retry 3: 100 * (2^2) + jitter = 400 + (0.05 * 400) = 400 + 20 = 420
      expect(policy.calculateRetryDelay(3)).toBe(420);

      // Retry 4: 100 * (2^3) + jitter = 800 + (0.05 * 800) = 800 + 40 = 840
      expect(policy.calculateRetryDelay(4)).toBe(840);
    });

    test('should cap delay at maxRetryDelayMs with jitter', () => {
      policy = new RetryPolicy({ retryDelayMs: 100, maxRetryDelayMs: 500 }); // Max delay of 500ms

      // Retry 1: 105 (calculated above, not capped)
      expect(policy.calculateRetryDelay(1)).toBe(105);

      // Retry 2: 210 (calculated above, not capped)
      expect(policy.calculateRetryDelay(2)).toBe(210);

      // Retry 3: 420 (calculated above, not capped)
      expect(policy.calculateRetryDelay(3)).toBe(420);

      // Retry 4: exponential 800. capped to 500. Jitter: 0.05 * 500 = 25. -> 500 + 25 = 525. Capped at maxRetryDelayMs
      expect(policy.calculateRetryDelay(4)).toBe(Math.floor(500 + (0.05 * 500)));
      expect(policy.calculateRetryDelay(4)).toBe(525);

      // Even higher retry counts should still cap at maxRetryDelayMs + jitter
      expect(policy.calculateRetryDelay(10)).toBe(525);
    });

    test('jitter factor should correctly influence the delay', () => {
      // Test with Math.random returning 0 (no jitter)
      jest.spyOn(Math, 'random').mockReturnValue(0);
      policy = new RetryPolicy({ retryDelayMs: 100, maxRetryDelayMs: 10000 });
      expect(policy.calculateRetryDelay(1)).toBe(100);
      expect(policy.calculateRetryDelay(2)).toBe(200);

      // Test with Math.random returning 0.999 (maximum jitter for 10% factor)
      jest.spyOn(Math, 'random').mockReturnValue(0.999);
      expect(policy.calculateRetryDelay(1)).toBe(Math.floor(100 + (0.0999 * 100))); // 100 + 9.99 = 109
      expect(policy.calculateRetryDelay(1)).toBe(109);
    });
  });
});
