# Changelog

## 2.0.0

- Replace Axios with native fetch; remove Axios and its exclusive dependencies.
- Breaking: replace Axios request configuration with PearlRequestOptions
  (headers, timeout, signal) and Axios errors with PearlRequestError.
- Breaking: require Node.js 20 or later.
- Aborted requests keep the caller's abort reason in `PearlRequestError.cause`.
- Parse response bodies as JSON only when they hold an object or array; other
  bodies are returned as text.
- Preserve resource payloads and HTTP 422 retry behavior. Timeouts now cover
  response body reading; caller cancellation also interrupts retry waits.
- Generate multipart boundaries through native FormData.

See README.md for migration examples and RELEASING.md for release instructions.
