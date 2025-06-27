// To run this example:
// 1. Ensure you have the SDK installed: npm install pearl-sdk
// 2. Transpile and run:
//    npx ts-node examples/webhook-signature-verification-example.ts

import { PearlClient } from 'pearl-sdk'; // Import from the installed package name
import axios from 'axios'; // Import axios for robust error handling

// --- IMPORTANT: Configure your API Key ---
// Replace 'YOUR_PEARL_API_KEY' with your actual Pearl API Key.
// This key will also serve as the base for the webhook secret derivation.
const API_KEY = 'YOUR_PEARL_API_KEY';

// An example webhook payload string to simulate an incoming webhook body.
const EXAMPLE_PAYLOAD_JSON_STRING = JSON.stringify({
  id: "example-webhook-event-id-123",
  sessionId: "example-session-abc-789",
  message: "This is a test message from a simulated webhook event.",
  messageDateTime: "2025-06-12T10:00:00.000Z",
  expert: {
    name: "Dr. Example",
    jobDescription: "Simulated Expert Role",
    avatarUrl: null
  }
});

async function runVerificationExample() {
  if (API_KEY === 'YOUR_PEARL_API_KEY') {
    console.warn("WARNING: Please replace 'YOUR_PEARL_API_KEY' with your actual API key.");
    console.log("Exiting example as API Key is a placeholder.");
    return;
  }

  console.log("\n--- Starting Webhook Signature Verification Example ---");

  // Initialize PearlClient with the API key.
  // The Webhooks resource will use this key internally as its webhook secret.
  const client = new PearlClient(API_KEY);

  try {
    // Step 1: Compute the expected signature for the example payload.
    // In a real scenario, Pearl's API would have computed this signature and sent it
    // in the 'X-Pearl-API-Signature' header of an incoming webhook.
    const expectedSignature = client.webhooks.computeSignature(EXAMPLE_PAYLOAD_JSON_STRING);

    console.log("Example Webhook Payload:", EXAMPLE_PAYLOAD_JSON_STRING);
    console.log("API Key (used as base for secret):", API_KEY);
    console.log("Computed Expected Signature:", expectedSignature);

    // Step 2: Verify the signature.
    // We use the `expectedSignature` as the `receivedSignature` to simulate a valid webhook.
    const isValid = client.webhooks.isValidSignature(
      expectedSignature,
      EXAMPLE_PAYLOAD_JSON_STRING
    );

    if (isValid) {
      console.log("\n✅ Signature is VALID! (This is expected as we're verifying a self-computed valid signature)");
    } else {
      console.log("\n❌ Signature is INVALID! (UNEXPECTED: Verification failed for a self-computed signature)");
    }

    // --- Optional: Demonstrate with an intentionally invalid signature ---
    console.log("\n--- Testing with an intentionally INVALID signature ---");
    const intentionallyInvalidSignature = 'invalid-signature-definitely-wrong-base64=';
    const isInvalid = client.webhooks.isValidSignature(
      intentionallyInvalidSignature,
      EXAMPLE_PAYLOAD_JSON_STRING
    );

    if (!isInvalid) {
      console.log("✅ Successfully identified an intentionally INVALID signature.");
    } else {
      console.log("❌ FAILED to identify an intentionally INVALID signature. (UNEXPECTED)");
    }

  } catch (error: any) {
    console.error("\nAn error occurred during the webhook verification example:");
    if (axios.isAxiosError(error)) {
      console.error("Error message:", error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      }
    } else {
      console.error("Unexpected error:", error);
    }
  } finally {
    console.log("\n--- End of Webhook Signature Verification Example ---");
  }
}

// Execute the example function
runVerificationExample();
