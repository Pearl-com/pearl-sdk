# Changelog

## 2.0.0

- Replace Axios with native fetch; remove Axios and its exclusive dependencies.
- Breaking: replace Axios request configuration with PearlRequestOptions
  (headers, timeout, signal) and Axios errors with PearlRequestError.
- When a request is cancelled with an `AbortSignal`, the error's `cause` holds the
  reason passed to `abort()`.
- Parse response bodies as JSON only when the `Content-Type` is JSON; other
  bodies are returned as text.
- Preserve resource payloads and HTTP 422 retry behavior. Timeouts now cover
  response body reading; caller cancellation also interrupts retry waits.
- Generate multipart boundaries through native FormData.

See README.md for migration examples.
