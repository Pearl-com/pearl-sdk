# Pearl SDK for TypeScript

A robust and easy-to-use SDK for interacting with the Pearl API, providing streamlined access to AI chat completions, webhook management, and secure signature verification utilities.

## ✨ Features
**Chat Completions**: Interact with Pearl's AI models for conversational and text generation tasks.

**Webhook Management**: Programmatically register and update webhook endpoints to receive real-time notifications from Pearl.

**Webhook Signature Verification**: Securely verify the authenticity and integrity of incoming webhook payloads.

**Built-in Retry Logic**: Automatic retries with exponential backoff and jitter for transient API errors, enhancing reliability.

**Configurable Client**: Customize API key, base URL, timeout, and retry policy.

## 📦 Installation
To install the Pearl SDK, use npm or yarn:

```bash
npm install pearl-sdk
```

## 🚀 Usage
Initializing the Client
The PearlClient is your main entry point for interacting with the Pearl API. Initialize it with your apiKey. You can also configure a custom baseUrl, timeout, and retryPolicy.

```ts
import { PearlClient } from 'pearl-sdk';

const client = new PearlClient({
  apiKey: 'YOUR_PEARL_API_KEY',
  // Optional configurations:
  // baseUrl: 'https://api.pearl.com/api/v1/', // Defaults to 'https://api.pearl.com/api/v1/'
  // timeout: 30000, // Request timeout in milliseconds, defaults to 30000 (30 seconds)
  // retryPolicy: {
  //   enabled: true,         // Enable/disable retries (defaults to true)
  //   maxRetries: 30,        // Max retry attempts for specific errors (defaults to 30)
  //   retryDelayMs: 100,     // Initial delay for exponential backoff (defaults to 100ms)
  //   maxRetryDelayMs: 30000 // Maximum delay for exponential backoff (defaults to 30 seconds)
  // }
});
```

Chat Completions
Send messages to the Pearl API's chat completions endpoint.

```ts
import { PearlClient, ChatCompletionRequest } from 'pearl-sdk';

const client = new PearlClient({ apiKey: 'YOUR_PEARL_API_KEY' });

async function getChatCompletion() {
  const chatRequest: ChatCompletionRequest = {
    model: "expert", // Or other available models like "pearl-ai"
    messages: [
      { role: "user", content: "What is quantum computing?" },
      { role: "assistant", content: "Quantum computing is a new type of computing that uses quantum-mechanical phenomena." },
      { role: "user", content: "Can you simplify that for a 5-year-old?" }
    ],
    metadata: {
      sessionId: "user-session-123"
    }
  };

  try {
    const response = await client.chat.sendCompletion(chatRequest);
    console.log("Assistant's response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error getting chat completion:", error);
  }
}

getChatCompletion();
```

Webhook Signature Verification
Verify incoming webhook requests from Pearl to ensure their authenticity. You'll need the raw request body and the signature from the X-Pearl-API-Signature header.

```ts
import { PearlClient } from 'pearl-sdk';

const client = new PearlClient({ apiKey: 'YOUR_PEARL_API_KEY' }); // The API key acts as the webhook secret

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
import { PearlClient, WebhookEndpointRequest } from 'pearl-sdk';

const client = new PearlClient({ apiKey: 'YOUR_PEARL_API_KEY' });

async function manageWebhookEndpoint() {
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

manageWebhookEndpoint();
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
Created by Your Name