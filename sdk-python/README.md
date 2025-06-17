# Pearl SDK for Python

A robust and easy-to-use SDK for interacting with the Pearl API, providing streamlined access to AI chat completions, webhook management, and secure signature verification utilities.

## ✨ Features

**Chat Completions**: Interact with Pearl's AI models for conversational and text generation tasks.

**Webhook Management**: Programmatically register and update webhook endpoints to receive real-time notifications from Pearl.

**Webhook Signature Verification**: Securely verify the authenticity and integrity of incoming webhook payloads.

**Built-in Retry Logic**: Automatic retries with exponential backoff and jitter for transient API errors, enhancing reliability.

**Configurable Client**: Customize API key, base URL, timeout, and retry policy.

## 📦 Installation

To install the Pearl SDK, use pip:

```bash
pip install pearl-sdk
```

## 🚀 Usage

### Initializing the Client

The `PearlClient` is your main entry point for interacting with the Pearl API. Initialize it with your `api_key`. You can also configure a custom `base_url`, `timeout`, and `retry_policy`.

```python
from pearl_sdk import PearlClient, RetryPolicyConfig

client = PearlClient(
    api_key='YOUR_PEARL_API_KEY',
    # Optional configurations:
    # base_url='https://api.pearl.com/api/v1',  # Defaults to 'https://api.pearl.com/api/v1'
    # timeout=30,  # Request timeout in seconds, defaults to 30
    # retry_policy=RetryPolicyConfig(
    #     enabled=True,         # Enable/disable retries (defaults to True)
    #     max_retries=30,       # Max retry attempts for specific errors (defaults to 30)
    #     retry_delay_ms=100,   # Initial delay for exponential backoff (defaults to 100ms)
    #     max_retry_delay_ms=30000  # Maximum delay for exponential backoff (defaults to 30 seconds)
    # )
)
```

### Chat Completions

Send messages to the Pearl API's chat completions endpoint.

```python
from pearl_sdk import PearlClient, ChatMessage, ConversationModes

client = PearlClient(api_key='YOUR_PEARL_API_KEY')

def get_chat_completion():
    messages = [
        ChatMessage(role="user", content="What is quantum computing?"),
        ChatMessage(role="assistant", content="Quantum computing is a new type of computing that uses quantum-mechanical phenomena."),
        ChatMessage(role="user", content="Can you simplify that for a 5-year-old?")
    ]

    try:
        response = client.chat.send_completion(
            messages=messages,                      # messages list
            session_id="user-session-123",          # session ID
            model="pearl-ai",                       # model (optional)
            mode=ConversationModes.PEARL_AI         # mode (optional)
        )
        print("Assistant's response:", response.choices[0].message.content)
    except Exception as error:
        print("Error getting chat completion:", error)

get_chat_completion()
```

### Conversation Modes

Pearl supports different conversation modes that control how the AI responds. The SDK provides constants for these modes:

```python
from pearl_sdk import ConversationModes

# Available conversation modes:
# ConversationModes.PEARL_AI - AI-only response mode
# ConversationModes.PEARL_AI_VERIFIED - AI with expert verification mode
# ConversationModes.PEARL_AI_EXPERT - AI with expert transition mode
# ConversationModes.EXPERT - Direct expert connection mode

response = client.chat.send_completion(
    messages=[ChatMessage(role="user", content="Hello!")],
    session_id="user-session-123",
    model="pearl-ai",
    mode=ConversationModes.PEARL_AI_EXPERT
)
```

For more information about conversation modes, see the [Pearl API documentation](https://www.pearl.com/api/docs/conversation-modes).

### Webhook Signature Verification

Verify incoming webhook requests from Pearl to ensure their authenticity. You'll need the raw request body and the signature from the `X-Pearl-API-Signature` header.

```python
from pearl_sdk import PearlClient
import json

client = PearlClient(api_key='YOUR_PEARL_API_KEY')  # The API key acts as the webhook secret

# In your webhook endpoint (e.g., Flask)
def handle_webhook():
    from flask import request
    
    received_signature = request.headers.get('X-Pearl-API-Signature')
    raw_payload = request.get_data(as_text=True)  # Get raw JSON string
    
    try:
        is_valid = client.webhooks.is_valid_signature(received_signature, raw_payload)
        
        if is_valid:
            print('Webhook signature is valid. Processing payload...')
            # Process request.json (your WebhookPayload)
            return 'OK', 200
        else:
            print('Webhook signature is invalid. Rejecting request.')
            return 'Unauthorized: Invalid signature', 401
    except Exception as error:
        print('Error verifying webhook signature:', error)
        return 'Internal Server Error', 500
```

### Webhook Endpoint Management

Register or update your webhook endpoint with Pearl.

```python
from pearl_sdk import PearlClient, WebhookEndpointRequest

client = PearlClient(api_key='YOUR_PEARL_API_KEY')

def register_webhook_endpoint():
    endpoint_url = 'https://your-app.com/api/pearl-webhooks'
    request = WebhookEndpointRequest(endpoint=endpoint_url)

    try:
        # Register a new webhook endpoint
        client.webhooks.register(request)
        print(f"Webhook endpoint registered: {endpoint_url}")

        # Update an existing webhook endpoint (if you change the URL)
        updated_endpoint_url = 'https://your-app.com/api/v2/pearl-webhooks'
        update_request = WebhookEndpointRequest(endpoint=updated_endpoint_url)
        client.webhooks.update(update_request)
        print(f"Webhook endpoint updated to: {updated_endpoint_url}")

    except Exception as error:
        print('Failed to manage webhook endpoint:', error)

register_webhook_endpoint()
```

## 🛠️ Development

To set up the development environment:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Pearl-com/pearl-sdk.git
   cd pearl-sdk/sdk-python
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install -e .  # Install in development mode
   ```

4. **Run tests:**
   ```bash
   pytest
   ```

5. **Run type checking (optional):**
   ```bash
   pip install mypy
   mypy pearl_sdk
   ```

## 🧪 Testing

The SDK includes comprehensive tests. Run them with:

```bash
pytest tests/ -v
```

To run tests with coverage:

```bash
pip install pytest-cov
pytest tests/ --cov=pearl_sdk --cov-report=html
```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

## 👤 Author

Created by Pearl.com
