#!/usr/bin/env python3
"""
Chat Completion Example

This example demonstrates how to use the Pearl SDK to send chat completion requests.

To run this example:
1. Install the SDK: pip install pearl-sdk
2. Set your API key in the API_KEY variable below
3. Run: python examples/chat_completion_example.py
"""

import uuid
from pearl_sdk import PearlClient, ChatMessage, RetryPolicyConfig, ConversationModes

# --- IMPORTANT: Configure your API Key ---
# Replace 'YOUR_PEARL_API_KEY' with your actual Pearl API Key.
API_KEY = 'YOUR_PEARL_API_KEY'


def run_chat_completion_example():
    """Run the chat completion example."""
    if API_KEY == 'YOUR_PEARL_API_KEY':
        print("WARNING: Please replace 'YOUR_PEARL_API_KEY' with your actual API key to make live API calls.")
        print("Exiting example as API Key is a placeholder.")
        return

    session_id = str(uuid.uuid4())
    # Initialize client with comprehensive configuration for demonstration
    client = PearlClient(
        api_key=API_KEY,
        # base_url='https://api.pearl.com/api/v1',  # Uncomment and change if using a custom base URL
        timeout=60,  # 60 seconds timeout
        retry_policy=RetryPolicyConfig(
            enabled=True,
            max_retries=50,
            retry_delay_ms=100,
            max_retry_delay_ms=60000        )
    )

    try:
        print("\n--- Starting Chat Completion Example ---")

        messages = [
            ChatMessage(
                role="user",
                content="Explain large language models in simple terms."  # The user's message
            )
        ]

        print("Sending chat completion request...")
        chat_response = client.chat.send_completion(
            messages=messages,
            session_id=session_id,
            mode=ConversationModes.PEARL_AI  # optional, defaults to PEARL_AI
        )

        print("\n--- Chat Completion API Response ---")
        print("Assistant's message:", chat_response.choices[0].message.content)

    except Exception as error:
        print("\n--- Chat Completion API Error ---")
        print(f"An error occurred: {error}")
        
        # Additional error handling for requests exceptions
        if hasattr(error, 'response'):
            print(f"Status code: {error.response.status_code}")
            print(f"Response: {error.response.text}")

    finally:
        print("\n--- End of Chat Completion Example ---")


if __name__ == "__main__":
    run_chat_completion_example()
