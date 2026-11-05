import { PearlRequestError } from './PearlRequestError';
import { RetryPolicy } from './RetryPolicy';

export interface PearlRequestOptions {
    /** Headers that override the defaults. Names are case-insensitive. */
    headers?: Headers | Record<string, string> | [string, string][];
    /** Timeout per attempt, including reading the response body, in milliseconds. */
    timeout?: number;
    /** Cancels the request, including any wait before a retry. */
    signal?: AbortSignal;
}

/** The longest timeout accepted: 10 minutes. */
const MAX_TIMEOUT_MS = 10 * 60 * 1000;

/** Throws unless the timeout is greater than 0 and no larger than MAX_TIMEOUT_MS. */
export function validateTimeout(timeout: number): void {
    if (!Number.isFinite(timeout) || timeout <= 0 || timeout > MAX_TIMEOUT_MS) {
        throw new Error(`Timeout must be greater than 0 and at most ${MAX_TIMEOUT_MS} milliseconds.`);
    }
}

function isAbsoluteHttpUrl(value: string): boolean {
    try {
        const { protocol } = new URL(value);
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
}

/** Throws unless the base URL is an absolute http or https URL. */
export function validateBaseUrl(baseUrl: string): void {
    if (!isAbsoluteHttpUrl(baseUrl)) {
        throw new Error('baseUrl must be an absolute http or https URL.');
    }
}

/** Builds the error for a request cancelled by the caller. The signal's reason becomes the cause. */
function abortedError(signal: AbortSignal): PearlRequestError {
    return new PearlRequestError('Request aborted.', 'aborted', { cause: signal.reason });
}

function isJsonContentType(contentType: string | null): boolean {
    const mediaType = (contentType ?? '').split(';')[0].trim().toLowerCase();
    return mediaType === 'application/json' || mediaType.endsWith('+json');
}

/** Parses the body when the response is declared as JSON. Otherwise, or if parsing fails, returns the raw text. */
function parseBody(text: string, contentType: string | null): unknown {
    if (!text) return undefined;
    if (!isJsonContentType(contentType)) return text;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/** Resolves after `delay` milliseconds, or rejects as soon as the signal aborts. */
function wait(delay: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!signal) {
            setTimeout(resolve, delay);
            return;
        }
        if (signal.aborted) {
            reject(abortedError(signal));
            return;
        }
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortedError(signal));
        };
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, delay);
        signal.addEventListener('abort', onAbort, { once: true });
    });
}

interface PreparedRequest {
    method: string;
    url: string;
    headers: Headers;
    body: string | FormData;
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

    /** Sends the request and retries the failures the retry policy allows. */
    private async request<T>(
        method: string,
        path: string,
        body: unknown,
        options: PearlRequestOptions = {},
    ): Promise<T> {
        const { signal } = options;
        const timeout = options.timeout ?? this.timeout;
        validateTimeout(timeout);
        const prepared = this.prepare(method, path, body, options.headers);

        for (let retries = 0; ; retries++) {
            if (signal?.aborted) throw abortedError(signal);

            try {
                return await this.attempt<T>(prepared, timeout, signal);
            } catch (error) {
                const canRetry =
                    error instanceof PearlRequestError &&
                    error.kind === 'http' &&
                    this.retryPolicy.shouldRetry(retries, error.status);
                if (!canRetry) throw error;
            }

            await wait(this.retryPolicy.calculateRetryDelay(retries + 1), signal);
        }
    }

    /** Builds the URL, headers and body once. Retries send the same values again. */
    private prepare(
        method: string,
        path: string,
        body: unknown,
        customHeaders: PearlRequestOptions['headers'],
    ): PreparedRequest {
        const url = this.baseUrl.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
        const headers = new Headers({ Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' });
        new Headers(customHeaders).forEach((value, key) => headers.set(key, value));

        // fetch sets the multipart Content-Type, including the boundary.
        if (body instanceof FormData) {
            headers.delete('Content-Type');
            return { method, url, headers, body };
        }
        return { method, url, headers, body: JSON.stringify(body) };
    }

    /**
     * Sends the request once. Returns the parsed body on success and throws a PearlRequestError
     * of kind 'http', 'network', 'timeout' or 'aborted' on failure.
     */
    private async attempt<T>(
        { method, url, headers, body }: PreparedRequest,
        timeout: number,
        signal?: AbortSignal,
    ): Promise<T> {
        // Each attempt has its own controller, so the timeout and the caller's signal cancel only this attempt.
        const controller = new AbortController();
        const forwardAbort = () => controller.abort(abortedError(signal as AbortSignal));
        signal?.addEventListener('abort', forwardAbort, { once: true });
        const timeoutTimer = setTimeout(() => {
            controller.abort(new PearlRequestError('Request timed out.', 'timeout'));
        }, timeout);

        let response: Response;
        let text: string;
        try {
            response = await fetch(url, { method, headers, body, signal: controller.signal });
            text = await response.text();
        } catch (cause) {
            // The abort reason is already a PearlRequestError of kind 'timeout' or 'aborted'.
            if (controller.signal.aborted) throw controller.signal.reason;
            throw new PearlRequestError('Network request failed.', 'network', { cause });
        } finally {
            clearTimeout(timeoutTimer);
            signal?.removeEventListener('abort', forwardAbort);
        }

        const data = parseBody(text, response.headers.get('content-type'));
        if (response.ok) return data as T;
        throw new PearlRequestError(`Request failed with status ${response.status}.`, 'http', {
            status: response.status,
            data,
            headers: response.headers,
        });
    }
}
