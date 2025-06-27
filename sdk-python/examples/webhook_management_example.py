#!/usr/bin/env python3
"""
Webhook Management Example

This example demonstrates how to use the Pearl SDK to register and update webhook endpoints.

To run this example:
1. Install the SDK: pip install pearl-sdk
2. Set your API key and webhook URL in the variables below
3. Run: python examples/webhook_management_example.py
"""

from pearl_sdk import PearlClient, WebhookEndpointRequest

# --- IMPORTANT: Configure your API Key and Webhook URL ---
# Replace 'YOUR_PEARL_API_KEY' with your actual Pearl API Key.
# Replace 'YOUR_WEBHOOK_URL' with the actual URL of your webhook endpoint.
API_KEY = 'YOUR_PEARL_API_KEY'
YOUR_WEBHOOK_URL = 'https://your-app.com/api/pearl-webhooks'


def run_webhook_management_example():
    """Run the webhook management example."""
    if API_KEY == 'YOUR_PEARL_API_KEY':
        print("WARNING: Please replace 'YOUR_PEARL_API_KEY' with your actual API key.")
        print("Exiting example as API Key is a placeholder.")
        return
    
    if YOUR_WEBHOOK_URL == 'https://your-app.com/api/pearl-webhooks':
        print("WARNING: Please replace 'YOUR_WEBHOOK_URL' with your actual webhook endpoint URL.")
        print("Exiting example as Webhook URL is a placeholder.")
        return

    client = PearlClient(api_key=API_KEY)

    try:
        print("\n--- Starting Webhook Management Example ---")

        # --- Register Webhook Endpoint ---
        print(f"Attempting to register webhook endpoint: {YOUR_WEBHOOK_URL}")
        register_request = WebhookEndpointRequest(endpoint=YOUR_WEBHOOK_URL)
        client.webhooks.register(register_request)
        print("Successfully registered webhook endpoint.")

        # --- Update Webhook Endpoint (Example) ---
        # If your webhook URL changes, you can use the update method.
        # For this example, we'll simulate an update to a slightly different path.
        updated_webhook_url = YOUR_WEBHOOK_URL.replace('/pearl-webhooks', '/v2/pearl-webhooks')
        print(f"\nAttempting to update webhook endpoint to: {updated_webhook_url}")
        update_request = WebhookEndpointRequest(endpoint=updated_webhook_url)
        client.webhooks.update(update_request)
        print("Successfully updated webhook endpoint.")

    except Exception as error:
        print("\n--- Webhook Management API Error ---")
        print(f"An error occurred: {error}")
        
        # Additional error handling for requests exceptions
        if hasattr(error, 'response'):
            print(f"Status code: {error.response.status_code}")
            print(f"Response: {error.response.text}")

    finally:
        print("\n--- End of Webhook Management Example ---")


if __name__ == "__main__":
    run_webhook_management_example()
