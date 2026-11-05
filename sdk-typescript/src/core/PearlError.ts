export type PearlErrorKind = 'http' | 'network' | 'timeout' | 'aborted';

/**
 * Error thrown when a Pearl API request fails. `kind` tells why it failed.
 * Invalid arguments, such as an out-of-range timeout, an invalid header or a malformed base URL, throw a plain `Error` or `TypeError` before any request is sent.
 */
export class PearlError extends Error {
  readonly name = 'PearlError';
  readonly status?: number;
  readonly data?: unknown;
  readonly headers?: Headers;
  readonly cause?: unknown;

  constructor(
    message: string,
    public readonly kind: PearlErrorKind,
    details: { status?: number; data?: unknown; headers?: Headers; cause?: unknown } = {},
  ) {
    super(message);
    this.status = details.status;
    this.data = details.data;
    this.headers = details.headers;
    this.cause = details.cause;
  }
}
