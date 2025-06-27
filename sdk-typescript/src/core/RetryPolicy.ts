import { RetryPolicyConfig } from '../types';

/**
 * Encapsulates the retry logic for API requests, including exponential backoff with jitter.
 */
export class RetryPolicy {
    public readonly enabled: boolean;
    private readonly _maxRetries: number;
    private readonly retryDelayMs: number;
    private readonly maxRetryDelayMs: number;

    /**
     * Initializes a new instance of the RetryPolicy.
     * @param config Optional configuration for the retry policy.
     * @throws Error if configuration parameters are invalid.
     */
    constructor(config?: RetryPolicyConfig) {
        this.enabled = config?.enabled ?? true;
        this._maxRetries = config?.maxRetries ?? 30;
        this.retryDelayMs = config?.retryDelayMs ?? 100;
        this.maxRetryDelayMs = config?.maxRetryDelayMs ?? 30000;

        // Basic validation for retry parameters
        if (typeof this._maxRetries !== 'number' || this._maxRetries < 0) {
            throw new Error("RetryPolicy: maxRetries must be a non-negative number if provided.");
        }
        if (typeof this.retryDelayMs !== 'number' || this.retryDelayMs <= 0) {
            throw new Error("RetryPolicy: retryDelayMs must be a positive number if provided.");
        }
        if (typeof this.maxRetryDelayMs !== 'number' || this.maxRetryDelayMs <= 0) {
            throw new Error("RetryPolicy: maxRetryDelayMs must be a positive number if provided.");
        }
        if (this.retryDelayMs > this.maxRetryDelayMs) {
            throw new Error("RetryPolicy: retryDelayMs cannot be greater than maxRetryDelayMs.");
        }
    }

    /**
     * Public getter to access the maximum number of retries.
     */
    public get maxRetries(): number {
        return this._maxRetries;
    }

    /**
     * Determines if a request should be retried based on its current retry count and policy settings.
     * @param currentRetryCount The number of times the request has already been retried.
     * @param statusCode The HTTP status code of the failed response.
     * @returns True if the request should be retried, false otherwise.
     */
    public shouldRetry(currentRetryCount: number, statusCode?: number): boolean {
        if (!this.enabled) {
            return false;
        }

        const isRetryableStatus = statusCode === 422; // Note: Current implementation only retries 422.
        return isRetryableStatus && currentRetryCount < this._maxRetries;
    }

    /**
     * Calculates the exponential backoff delay with jitter.
     * The formula used is: min(max_delay, initial_delay * (2 ^ (retry_count - 1))) + random_jitter_factor
     * Jitter is a random component (e.g., up to 10% of the calculated delay) to prevent "thundering herd" problems.
     * @param retryCount The current retry attempt number (1-indexed).
     * @returns The calculated delay in milliseconds.
     */
    public calculateRetryDelay(retryCount: number): number {
        const exponentialDelay = this.retryDelayMs * Math.pow(2, retryCount - 1);
        const cappedDelay = Math.min(exponentialDelay, this.maxRetryDelayMs);
        const jitter = Math.random() * cappedDelay * 0.1; // Add up to 10% jitter
        return Math.floor(cappedDelay + jitter);
    }
}