# Pearl API Client SDK for TypeScript

A robust and easy-to-use SDK for interacting with the Pearl API, providing streamlined access to AI chat completions, webhook management, and secure signature verification utilities.

## ✨ Features

**Chat Completions**: Interact with Pearl's AI models for conversational and text generation tasks.

**Webhook Management**: Programmatically register and update webhook endpoints to receive real-time notifications from Pearl.

**Webhook Signature Verification**: Securely verify the authenticity and integrity of incoming webhook payloads.

**Built-in Retry Logic**: Automatically retry HTTP 422 responses with exponential backoff and jitter.

**Configurable Client**: Customize API key, base URL, timeout, and retry policy.

## 📦 Installation

Requires Node.js 20 or later. Install with npm:

```bash
npm install @pearl.com/pearl-api-client-sdk
```

## 🚀 Usage

### Initializing the Client

The PearlClient is your main entry point for interacting with the Pearl API. You can initialize it with just your API key, or specify only the options you need.

```ts
import { PearlClient } from '@pearl.com/pearl-api-client-sdk';

// Simple initialization with just the API key
const client = new PearlClient('YOUR_PEARL_API_KEY');

// Or create a client with custom options
const customClient = new PearlClient('YOUR_PEARL_API_KEY', {
  timeout: 60000,        // 60 seconds timeout
  retryPolicy: {
    enabled: true,
    maxRetries: 50,
    retryDelayMs: 100,
    maxRetryDelayMs: 60000
  }
});
```

### Chat Completions

Send messages to the Pearl API's chat completions endpoint.

```ts
import { PearlClient, CONVERSATION_MODES } from '@pearl.com/pearl-api-client-sdk';

const client = new PearlClient('YOUR_PEARL_API_KEY');

async function getChatCompletion() {
  const messages = [
    { role: "user", content: "What is quantum computing?" },
    { role: "assistant", content: "Quantum computing is a new type of computing that uses quantum-mechanical phenomena." },
    { role: "user", content: "Can you simplify that for a 5-year-old?" }
  ];

  try {
    const response = await client.chat.sendCompletion(
      messages,                           // messages array
      "user-session-123",                 // sessionId
      CONVERSATION_MODES.PEARL_AI_EXPERT  // mode (optional)
    );
    console.log("Assistant's response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error getting chat completion:", error);
  }
}

getChatCompletion();
```

### Conversation Modes

Pearl supports different conversation modes that control how the AI responds. The SDK provides constants for these modes:

```ts
import { CONVERSATION_MODES } from '@pearl.com/pearl-api-client-sdk';

// Available conversation modes:
// CONVERSATION_MODES.PEARL_AI_VERIFIED - AI with expert verification mode
// CONVERSATION_MODES.PEARL_AI_EXPERT - AI with expert transition mode
// CONVERSATION_MODES.EXPERT - Direct expert connection mode

const response = await client.chat.sendCompletion(
  [{ role: "user", content: "Hello!" }],
  "user-session-123",
  CONVERSATION_MODES.PEARL_AI_VERIFIED
);
```

For more information about conversation modes, see the [Pearl API documentation](https://www.pearl.com/api/docs/conversation-modes).

### Attachments

Upload files (images or documents) with the Files resource and attach them to chat messages by referencing the returned file id.

> **Important:** Files cannot be uploaded on the very first message of a chat session. The session must already exist on the server before a file can be associated with it, so you must send at least one chat completion with the same `sessionId` before calling `client.files.create`.

The recommended flow is:

1. Send an initial chat completion to create the session.
2. Upload the file with the same `sessionId`.
3. Send a follow-up chat completion that references the uploaded file id via `attachments`.

```ts
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
    PearlClient,
    CONVERSATION_MODES,
    FILE_PURPOSES,
    ChatMessage
} from '@pearl.com/pearl-api-client-sdk';

const client = new PearlClient('YOUR_PEARL_API_KEY');
const sessionId = uuidv4();

// 1. Initialize the session with any first message.
const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
const first = await client.chat.sendCompletion(
    messages,
    sessionId,
    CONVERSATION_MODES.PEARL_AI_EXPERT
);
messages.push({ role: 'assistant', content: first.choices[0].message.content ?? '' });

// 2. Upload the file against the now-initialized session.
const uploaded = await client.files.create({
    file: readFileSync('image.png'),
    sessionId,
    purpose: FILE_PURPOSES.ATTACHMENT, // optional, defaults to "attachment"
    filename: 'image.png'
});

// 3. Send a follow-up message that references the uploaded file id.
messages.push({
    role: 'user',
    content: "What's on the image?",
    attachments: [uploaded.id]
});
const response = await client.chat.sendCompletion(
    messages,
    sessionId,
    CONVERSATION_MODES.PEARL_AI_EXPERT
);
console.log(response.choices[0].message.content);
```

`client.files.create` accepts a `Buffer`, `Uint8Array`, `ArrayBuffer`, or `Blob`.

### Webhook Signature Verification

Verify incoming webhook requests from Pearl to ensure their authenticity. You'll need the raw request body and the signature from the X-Pearl-API-Signature header.

```ts
import { PearlClient } from '@pearl.com/pearl-api-client-sdk';

const client = new PearlClient('YOUR_PEARL_API_KEY'); // The API key acts as the webhook secret

// In your webhook endpoint
function handleWebhook(req: any, res: any) {
  const receivedSignature = req.headers['x-pearl-api-signature'];
  const rawPayload = JSON.stringify(req.body); // Ensure you get the raw JSON string of the payload

  try {
    const isValid = client.webhooks.isValidSignature(receivedSignature, rawPayload);

    if (isValid) {
      console.log('Webhook signature is valid. Processing payload...');
      // Process req.body (your WebhookPayload type)
      res.status(200).send('OK');
    } else {
      console.warn('Webhook signature is invalid. Rejecting request.');
      res.status(401).send('Unauthorized: Invalid signature');
    }
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    res.status(500).send('Internal Server Error');
  }
}
```

### Webhook Endpoint Management

Register or update your webhook endpoint with Pearl.

```ts
import { PearlClient, WebhookEndpointRequest } from '@pearl.com/pearl-api-client-sdk';

const client = new PearlClient('YOUR_PEARL_API_KEY');

async function registerWebhookEndpoint() {
  const endpointUrl = 'https://your-app.com/api/pearl-webhooks';
  const request: WebhookEndpointRequest = { endpoint: endpointUrl };

  try {
    // Register a new webhook endpoint
    await client.webhooks.register(request);
    console.log(`Webhook endpoint registered: ${endpointUrl}`);

    // Update an existing webhook endpoint (if you change the URL)
    const updatedEndpointUrl = 'https://your-app.com/api/v2/pearl-webhooks';
    const updateRequest: WebhookEndpointRequest = { endpoint: updatedEndpointUrl };
    await client.webhooks.update(updateRequest);
    console.log(`Webhook endpoint updated to: ${updatedEndpointUrl}`);

  } catch (error) {
    console.error('Failed to manage webhook endpoint:', error);
  }
}

registerWebhookEndpoint();
```

## Migrating from version 1 to version 2

Version 2 replaces Axios with native `fetch`. Chat, file upload, and webhook methods keep the same argument order and response payloads. The breaking changes are the request options and error types.

### Request options

Replace `AxiosRequestConfig` with the exported `PearlRequestOptions` type. Pass it in the same place you passed the Axios config: the fifth argument of `chat.sendCompletion` (after `model`), or the last argument of `files.create`, `webhooks.register` and `webhooks.update`. The supported options are:

| Option | Purpose |
| --- | --- |
| `headers` | Custom headers, supplied as a plain object, a `Headers` instance, or an array of name/value pairs. They override default headers. |
| `timeout` | Timeout per attempt in milliseconds, including reading the response body. Defaults to 30,000; must be finite, greater than 0, and at most 2,147,483,647. |
| `signal` | An `AbortSignal` for cancelling the request, including any wait before a retry. |

File uploads set their own multipart content type and boundary. Do not set the `Content-Type` header for uploads.

Axios-specific options such as adapters, interceptors, transforms, agents, and proxy settings are no longer supported. Proxy behavior follows the runtime's native `fetch`, so existing Axios proxy configurations need to be reviewed.

### Error handling

Replace `axios.isAxiosError(error)` with `error instanceof PearlError`. HTTP errors now expose `status`, `data`, and `headers` directly, instead of through `error.response`.

```ts
import { PearlClient, PearlError } from '@pearl.com/pearl-api-client-sdk';
import type { PearlRequestOptions } from '@pearl.com/pearl-api-client-sdk';

const client = new PearlClient('YOUR_PEARL_API_KEY');
const options: PearlRequestOptions = { timeout: 5000 };

async function registerWebhook() {
  try {
    await client.webhooks.register(
      { endpoint: 'https://example.com/webhook' },
      options
    );
  } catch (error) {
    if (!(error instanceof PearlError)) {
      throw error;
    }

    if (error.kind === 'http') {
      console.error('API error:', error.status, error.data);
    } else {
      console.error('Request failed:', error.kind, error.message);
    }
  }
}

registerWebhook();
```

The error kinds are `http`, `network`, `timeout`, and `aborted`. Network errors include the underlying error in `cause`, and aborted requests include the reason passed to `AbortController.abort()`.

### Response and retry behavior

Response bodies that contain a JSON object or array are parsed. Other bodies, including plain text and bare JSON values such as `123` or `true`, are returned as text, and empty bodies return `undefined`. Webhook registration and update methods return `void`.

Only HTTP 422 responses are retried, using the client's retry policy. Network failures, timeouts, and cancelled requests are not retried.

Invalid arguments, such as a bad timeout, header, or base URL, throw a plain `Error` or `TypeError` before any request is sent. They are not `PearlError`s.

## 🛠️ Development

Clone the repository and open the TypeScript SDK directory:

```bash
git clone https://github.com/Pearl-com/pearl-sdk.git
cd pearl-sdk/sdk-typescript
```

Install dependencies:

```bash
npm ci
```

Build the SDK to generate JavaScript and TypeScript declarations in `dist/`:

```bash
npm run build
```

Run the tests:

```bash
npm test
```

For publishing steps, see the [release guide](https://github.com/Pearl-com/pearl-sdk/blob/main/sdk-typescript/RELEASING.md).

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/Pearl-com/pearl-sdk/blob/main/LICENSE) file in the repository root for details.

## 👤 Author

Created by Pearl.com
