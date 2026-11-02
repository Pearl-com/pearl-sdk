import { RetryPolicy } from './RetryPolicy';

export interface PearlRequestOptions {
  headers?: HeadersInit;
  /** Timeout per attempt, including reading the response body, in milliseconds. */
  timeout?: number;
  signal?: AbortSignal;
}

export class PearlError extends Error {
  readonly name = 'PearlError';
  readonly status?: number;
  readonly data?: unknown;
  readonly headers?: Headers;
  readonly cause?: unknown;

  constructor(
    message: string,
    public readonly kind: 'http' | 'network' | 'timeout' | 'aborted',
    details: { status?: number; data?: unknown; headers?: Headers; cause?: unknown } = {},
  ) {
    super(message);
    this.status = details.status;
    this.data = details.data;
    this.headers = details.headers;
    this.cause = details.cause;
  }
}

export function validateTimeout(timeout: number): void {
  // Larger values overflow Node's timer and fire almost immediately.
  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 2_147_483_647) {
    throw new Error('Timeout must be greater than 0 and at most 2147483647 milliseconds.');
  }
}

function aborted(): PearlError {
  return new PearlError('Request aborted.', 'aborted');
}

function wait(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(aborted());
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(aborted());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, delay);
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

/** Internal transport shared by the resources. */
export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly timeout: number,
    private readonly retryPolicy: RetryPolicy,
  ) {}

  post<T>(path: string, body: unknown, options?: PearlRequestOptions): Promise<{ data: T }> {
    return this.request<T>('POST', path, body, options);
  }
  put<T>(path: string, body: unknown, options?: PearlRequestOptions): Promise<{ data: T }> {
    return this.request<T>('PUT', path, body, options);
  }

  private async request<T>(method: string, path: string, body: unknown, options: PearlRequestOptions = {}): Promise<{ data: T }> {
    const { signal } = options;
    const timeout = options.timeout ?? this.timeout;
    validateTimeout(timeout);

    const url = this.baseUrl.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
    const headers = new Headers({ Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' });
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));

    const multipart = body instanceof FormData;
    if (multipart) headers.delete('Content-Type');
    const payload = multipart ? body : JSON.stringify(body);

    for (let retries = 0; ; retries++) {
      if (signal?.aborted) throw aborted();

      const controller = new AbortController();
      const cancel = () => controller.abort(aborted());
      signal?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(() => {
        controller.abort(new PearlError('Request timed out.', 'timeout'));
      }, timeout);

      let failure: PearlError;
      try {
        const response = await fetch(url, { method, headers, body: payload, signal: controller.signal });
        const text = await response.text();
        let data: unknown = text || undefined;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            // Keep plain-text and malformed JSON responses as text.
          }
        }
        if (response.ok) return { data: data as T };
        failure = new PearlError(`Request failed with status ${response.status}.`, 'http', {
          status: response.status,
          data,
          headers: response.headers,
        });
      } catch (cause) {
        if (controller.signal.aborted) throw controller.signal.reason;
        throw new PearlError('Network request failed.', 'network', { cause });
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
      }

      if (!this.retryPolicy.shouldRetry(retries, failure.status)) throw failure;
      await wait(this.retryPolicy.calculateRetryDelay(retries + 1), signal);
    }
  }
}
