import { PearlError } from './PearlError';
import { RetryPolicy } from './RetryPolicy';

export interface PearlRequestOptions {
  /** Headers that override the defaults. Names are case-insensitive. */
  headers?: Headers | Record<string, string> | [string, string][];
  /** Timeout per attempt, including reading the response body, in milliseconds. */
  timeout?: number;
  signal?: AbortSignal;
}

export function validateTimeout(timeout: number): void {
  // Larger values overflow Node's timer and fire almost immediately.
  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 2_147_483_647) {
    throw new Error('Timeout must be greater than 0 and at most 2147483647 milliseconds.');
  }
}

/** Keeps the caller's abort reason (for example from AbortSignal.timeout) as the cause. */
function aborted(signal: AbortSignal): PearlError {
  return new PearlError('Request aborted.', 'aborted', { cause: signal.reason });
}

/** Returns the parsed value for a JSON object or array, and the raw text for anything else. */
function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null ? parsed : text;
  } catch {
    return text;
  }
}

function wait(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!signal) {
      setTimeout(resolve, delay);
      return;
    }
    if (signal.aborted) {
      reject(aborted(signal));
      return;
    }
    const cancel = () => {
      clearTimeout(timer);
      reject(aborted(signal));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, delay);
    signal.addEventListener('abort', cancel, { once: true });
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

  post<T>(path: string, body: unknown, options?: PearlRequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }
  put<T>(path: string, body: unknown, options?: PearlRequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  private async request<T>(method: string, path: string, body: unknown, options: PearlRequestOptions = {}): Promise<T> {
    const { signal } = options;
    const timeout = options.timeout ?? this.timeout;
    validateTimeout(timeout);

    const url = this.baseUrl.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
    // A malformed URL is a caller error, not a network failure.
    new URL(url);
    const headers = new Headers({ Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' });
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));

    const multipart = body instanceof FormData;
    if (multipart) headers.delete('Content-Type');
    const payload = multipart ? body : JSON.stringify(body);

    for (let retries = 0; ; retries++) {
      if (signal?.aborted) throw aborted(signal);

      const controller = new AbortController();
      const cancel = () => controller.abort(aborted(signal as AbortSignal));
      signal?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(() => {
        controller.abort(new PearlError('Request timed out.', 'timeout'));
      }, timeout);

      let failure: PearlError;
      try {
        const response = await fetch(url, { method, headers, body: payload, signal: controller.signal });
        const text = await response.text();
        const data = parseBody(text);
        if (response.ok) return data as T;
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
