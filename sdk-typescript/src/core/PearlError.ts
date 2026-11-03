export type PearlErrorKind = 'http' | 'network' | 'timeout' | 'aborted';

/** Error thrown by every Pearl API call. `kind` tells why the call failed. */
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
