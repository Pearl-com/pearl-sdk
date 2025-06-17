# Pearl SDK

Official SDKs for the Pearl API, providing robust and easy-to-use libraries for interacting with Pearl's AI services.

## 📦 Available SDKs

### TypeScript/JavaScript SDK
- **Location**: `sdk-typescript/`
- **Language**: TypeScript/JavaScript
- **Runtime**: Node.js
- **Package**: `pearl-sdk`

### Python SDK  
- **Location**: `sdk-python/`
- **Language**: Python
- **Runtime**: Python 3.7+
- **Package**: `pearl-sdk`

## ✨ Features

Both SDKs provide identical functionality:

- **Chat Completions**: Interact with Pearl's AI models for conversational and text generation tasks
- **Conversation Modes**: Control AI behavior with different modes (pearl-ai, pearl-ai-verified, pearl-ai-expert)
- **Webhook Management**: Programmatically register and update webhook endpoints
- **Webhook Signature Verification**: Securely verify the authenticity and integrity of incoming webhook payloads
- **Built-in Retry Logic**: Automatic retries with exponential backoff and jitter for enhanced reliability
- **Configurable Client**: Customize API key, base URL, timeout, and retry policy

## 🚀 Quick Start

### TypeScript/JavaScript
```bash
npm install pearl-sdk
```

```typescript
import { PearlClient, CONVERSATION_MODES } from 'pearl-sdk';

const client = new PearlClient('YOUR_API_KEY');
const response = await client.chat.sendCompletion(
  [{ role: "user", content: "Hello!" }],  // messages
  "user-session-123",                     // sessionId
  "pearl-ai",                             // model (optional)
  CONVERSATION_MODES.PEARL_AI             // mode (optional)
);
```

### Python
```bash
pip install pearl-sdk
```

```python
from pearl_sdk import PearlClient, ChatMessage, ConversationModes

client = PearlClient(api_key='YOUR_API_KEY')
response = client.chat.send_completion(
    messages=[ChatMessage(role="user", content="Hello!")],
    session_id="user-session-123",
    model="pearl-ai",                     # optional
    mode=ConversationModes.PEARL_AI       # optional
)
```

## 🎯 Conversation Modes

Pearl supports different conversation modes that control how the AI responds. Use the built-in constants for better maintainability:

### Available Modes

- **`PEARL_AI`** / **`pearl-ai`**: AI-only response mode
- **`PEARL_AI_VERIFIED`** / **`pearl-ai-verified`**: AI with expert verification mode  
- **`PEARL_AI_EXPERT`** / **`pearl-ai-expert`**: AI with expert transition mode
- **`EXPERT`** / **`expert`**: Direct expert connection mode

### Usage Examples

**TypeScript:**
```typescript
import { CONVERSATION_MODES } from 'pearl-sdk';

// Using constants (recommended)
metadata: { mode: CONVERSATION_MODES.EXPERT }

// Using string values directly
metadata: { mode: "expert" }
```

**Python:**
```python
from pearl_sdk import ConversationModes

# Using constants (recommended)
metadata={"mode": ConversationModes.EXPERT}

# Using string values directly  
metadata={"mode": "expert"}
```

For more details about conversation modes, see the [Pearl API Documentation](https://www.pearl.com/api/docs/conversation-modes).

## 📚 Documentation

- **TypeScript SDK**: See `sdk-typescript/README.md`
- **Python SDK**: See `sdk-python/README.md`
- **API Comparison**: See `TYPESCRIPT_PYTHON_COMPARISON.md`

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.