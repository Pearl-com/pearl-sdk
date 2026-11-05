export type PearlRequestErrorKind = 'http' | 'network' | 'timeout' | 'aborted';

/**
 * Error thrown when a Pearl API request fails. `kind` tells why it failed.
 * Invalid arguments, such as an out-of-range timeout, an invalid header or a malformed base URL,
 * throw a plain `Error` or `TypeError` before any request is sent.
 */
export class PearlRequestError extends Error {
    readonly name = 'PearlRequestError';
    /** HTTP status code. Set when `kind` is `'http'`. */
    readonly status?: number;
    /** Parsed or raw response body. Set when `kind` is `'http'`. */
    readonly data?: unknown;
    /** Response headers. Set when `kind` is `'http'`. */
    readonly headers?: Headers;
    /** The underlying error for `'network'`, or the abort reason for `'aborted'`. */
    readonly cause?: unknown;

    constructor(
        message: string,
        public readonly kind: PearlRequestErrorKind,
        details: { status?: number; data?: unknown; headers?: Headers; cause?: unknown } = {},
    ) {
        super(message);
        this.status = details.status;
        this.data = details.data;
        this.headers = details.headers;
        this.cause = details.cause;
    }
}
