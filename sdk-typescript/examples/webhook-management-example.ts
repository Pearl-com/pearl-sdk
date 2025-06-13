// To run this example:
// 1. Ensure you have the SDK installed: npm install pearl-sdk
// 2. Transpile and run:
//    npx ts-node examples/webhook-management-example.ts

import { PearlClient, WebhookEndpointRequest } from 'pearl-sdk';
import axios from 'axios'; // Import axios for error checking

// --- IMPORTANT: Configure your API Key and Webhook URL ---
// Replace 'YOUR_PEARL_API_KEY' with your actual Pearl API Key.
// Replace 'YOUR_WEBHOOK_URL' with the actual URL of your webhook endpoint.
const API_KEY: string = 'YOUR_PEARL_API_KEY'; // Explicitly type as string
const YOUR_WEBHOOK_URL: string = 'https://your-app.com/api/pearl-webhooks'; // Explicitly type as string

async function runWebhookManagementExample() {
  if (API_KEY === 'YOUR_PEARL_API_KEY') {
    console.warn("WARNING: Please replace 'YOUR_PEARL_API_KEY' with your actual API key.");
    console.log("Exiting example as API Key is a placeholder.");
    return;
  }
  if (YOUR_WEBHOOK_URL === 'https://your-app.com/api/pearl-webhooks') {
    console.warn("WARNING: Please replace 'YOUR_WEBHOOK_URL' with your actual webhook endpoint URL.");
    console.log("Exiting example as Webhook URL is a placeholder.");
    return;
  }

  const client = new PearlClient({ apiKey: API_KEY });

  try {
    console.log("\n--- Starting Webhook Management Example ---");

    // --- Register Webhook Endpoint ---
    console.log(`Attempting to register webhook endpoint: ${YOUR_WEBHOOK_URL}`);
    const registerRequest: WebhookEndpointRequest = { endpoint: YOUR_WEBHOOK_URL };
    await client.webhooks.register(registerRequest);
    console.log(`Successfully registered webhook endpoint.`);

    // --- Update Webhook Endpoint (Example) ---
    // If your webhook URL changes, you can use the update method.
    // For this example, we'll simulate an update to a slightly different path.
    // By explicitly typing YOUR_WEBHOOK_URL as string, TypeScript won't narrow it to 'never'.
    const updatedWebhookUrl = `${YOUR_WEBHOOK_URL.replace('/pearl-webhooks', '/v2/pearl-webhooks')}`;
    console.log(`\nAttempting to update webhook endpoint to: ${updatedWebhookUrl}`);
    const updateRequest: WebhookEndpointRequest = { endpoint: updatedWebhookUrl };
    await client.webhooks.update(updateRequest);
    console.log(`Successfully updated webhook endpoint.`);

  } catch (error: any) {
    console.error("\n--- Webhook Management API Error ---");
    if (axios.isAxiosError(error)) {
      console.error("Error message:", error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      }
    } else {
      console.error("An unexpected error occurred:", error);
    }
  } finally {
    console.log("\n--- End of Webhook Management Example ---");
  }
}

// Run the example
runWebhookManagementExample();
