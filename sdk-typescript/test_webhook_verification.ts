import { PearlClient } from './dist';

// --- Placeholder Data for Demonstration ---
// Use a placeholder API key that will also serve as the base for the webhook secret.
const PLACEHOLDER_API_KEY = 'YOUR_PLACEHOLDER_PEARL_API_KEY_1234567890ABCDEF';

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

// --- Webhook Signature Verification Example ---

/**
 * Runs a demonstration of webhook signature verification using placeholder data.
 * This script initializes the PearlClient with a placeholder API key,
 * computes an expected signature for an example payload, and then
 * verifies if the example signature matches the computed one.
 */
async function runVerificationExample() {
    console.log("--- Webhook Signature Verification Example ---");

    // Initialize PearlClient with the placeholder API key.
    // The Webhooks resource will derive its secret from this.
    const client = new PearlClient({ apiKey: PLACEHOLDER_API_KEY });

    try {
        // Step 1: Compute the expected signature for the example payload.
        // In a real scenario, Pearl's API would have computed this signature.
        const expectedSignature = client.webhooks.computeSignature(EXAMPLE_PAYLOAD_JSON_STRING);

        console.log("Example Webhook Payload:", EXAMPLE_PAYLOAD_JSON_STRING);
        console.log("Placeholder API Key (used as base for secret):", PLACEHOLDER_API_KEY);
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
        console.error("\nAn error occurred during the webhook verification example:", error.message);
        if (error instanceof Error) {
            console.error("Stack trace:", error.stack);
        }
    } finally {
        console.log("\n--- End of Webhook Signature Verification Example ---");
    }
}

// Execute the example function
runVerificationExample();