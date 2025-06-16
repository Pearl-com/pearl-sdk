#!/usr/bin/env python3
"""
Webhook Signature Verification Example

This example demonstrates how to use the Pearl SDK to verify webhook signatures.

To run this example:
1. Install the SDK: pip install pearl-sdk
2. Set your API key in the API_KEY variable below
3. Run: python examples/webhook_signature_verification_example.py
"""

import json
from pearl_sdk import PearlClient, PearlClientConfig

# --- IMPORTANT: Configure your API Key ---
# Replace 'YOUR_PEARL_API_KEY' with your actual Pearl API Key.
# This key will also serve as the base for the webhook secret derivation.
API_KEY = 'YOUR_PEARL_API_KEY'

# An example webhook payload to simulate an incoming webhook body.
EXAMPLE_PAYLOAD = {
    "id": "example-webhook-event-id-123",
    "sessionId": "example-session-abc-789",
    "message": "This is a test message from a simulated webhook event.",
    "messageDateTime": "2025-06-12T10:00:00.000Z",
    "expert": {
        "name": "Dr. Example",
        "jobDescription": "Simulated Expert Role",
        "avatarUrl": None
    }
}

EXAMPLE_PAYLOAD_JSON_STRING = json.dumps(EXAMPLE_PAYLOAD, separators=(',', ':'))


def run_verification_example():
    """Run the webhook signature verification example."""
    if API_KEY == 'YOUR_PEARL_API_KEY':
        print("WARNING: Please replace 'YOUR_PEARL_API_KEY' with your actual API key.")
        print("Exiting example as API Key is a placeholder.")
        return

    print("\n--- Starting Webhook Signature Verification Example ---")

    # Initialize PearlClient with the API key.
    # The Webhooks resource will use this key internally as its webhook secret.
    client = PearlClient(PearlClientConfig(api_key=API_KEY))

    try:
        # Step 1: Compute the expected signature for the example payload.
        # In a real scenario, Pearl's API would have computed this signature and sent it
        # in the 'X-Pearl-API-Signature' header of an incoming webhook.
        expected_signature = client.webhooks.compute_signature(EXAMPLE_PAYLOAD_JSON_STRING)

        print("Example Webhook Payload:", EXAMPLE_PAYLOAD_JSON_STRING)
        print("API Key (used as base for secret):", API_KEY)
        print("Computed Expected Signature:", expected_signature)

        # Step 2: Verify the signature.
        # We use the `expected_signature` as the `received_signature` to simulate a valid webhook.
        is_valid = client.webhooks.is_valid_signature(
            expected_signature,
            EXAMPLE_PAYLOAD_JSON_STRING
        )

        if is_valid:
            print("\n✅ Signature is VALID! (This is expected as we're verifying a self-computed valid signature)")
        else:
            print("\n❌ Signature is INVALID! (UNEXPECTED: Verification failed for a self-computed signature)")

        # --- Optional: Demonstrate with an intentionally invalid signature ---
        print("\n--- Testing with an intentionally INVALID signature ---")
        intentionally_invalid_signature = 'invalid-signature-definitely-wrong-base64='
        is_invalid = client.webhooks.is_valid_signature(
            intentionally_invalid_signature,
            EXAMPLE_PAYLOAD_JSON_STRING
        )

        if not is_invalid:
            print("✅ Successfully identified an intentionally INVALID signature.")
        else:
            print("❌ FAILED to identify an intentionally INVALID signature. (UNEXPECTED)")

    except Exception as error:
        print(f"\nAn error occurred during the webhook verification example: {error}")

    finally:
        print("\n--- End of Webhook Signature Verification Example ---")


if __name__ == "__main__":
    run_verification_example()
