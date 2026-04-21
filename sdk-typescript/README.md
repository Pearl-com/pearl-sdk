# Pearl API Client SDK for TypeScript

A robust and easy-to-use SDK for interacting with the Pearl API, providing streamlined access to AI chat completions, webhook management, and secure signature verification utilities.

## ✨ Features
**Chat Completions**: Interact with Pearl's AI models for conversational and text generation tasks.

**Webhook Management**: Programmatically register and update webhook endpoints to receive real-time notifications from Pearl.

**Webhook Signature Verification**: Securely verify the authenticity and integrity of incoming webhook payloads.

**Built-in Retry Logic**: Automatic retries with exponential backoff and jitter for transient API errors, enhancing reliability.

**Configurable Client**: Customize API key, base URL, timeout, and retry policy.

## 📦 Installation
To install the Pearl API Client SDK, use npm or yarn:

```bash
npm install @pearl-api/pearl-api-client-sdk
```

## 🚀 Usage
### Initializing the Client
The PearlClient is your main entry point for interacting with the Pearl API. You can initialize it with just your API key, or specify only the options you need.

```ts
import { PearlClient } from '@pearl-api/pearl-api-client-sdk';

// Simple initialization with just the API key
const client = new PearlClient('YOUR_PEARL_API_KEY');

// Or with custom options (specify only what you need)
const client = new PearlClient('YOUR_PEARL_API_KEY', {
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
import { PearlClient, CONVERSATION_MODES } from '@pearl-api/pearl-api-client-sdk';

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
import { CONVERSATION_MODES } from '@pearl-api/pearl-api-client-sdk';

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
} from '@pearl-api/pearl-api-client-sdk';

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

Webhook Signature Verification
Verify incoming webhook requests from Pearl to ensure their authenticity. You'll need the raw request body and the signature from the X-Pearl-API-Signature header.

```ts
import { PearlClient } from '@pearl-api/pearl-api-client-sdk';

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

Webhook Endpoint Management
Register or update your webhook endpoint with Pearl.

```ts
import { PearlClient, WebhookEndpointRequest } from '@pearl-api/pearl-api-client-sdk';

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

## 🛠️ Development
To build and test the SDK locally:

Clone the repository:

```bash
git clone https://github.com/Pearl-com/pearl-sdk.git
cd pearl-sdk
```

Install dependencies:

```bash
npm install
```

Build the SDK:
This compiles the TypeScript source files into JavaScript and generates type declaration files (.d.ts) in the dist/ directory.

```bash
npm run build
```
Run Tests:
Execute the unit tests to ensure all components are functioning as expected.

```bash
npm test
```

## 📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

## 👤 Author
Created by Pearl.com