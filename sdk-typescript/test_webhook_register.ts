import { PearlClient, WebhookEndpointRequest } from './dist'; // Adjust path if your build output is different

// --- Placeholder Data for Demonstration ---
const PLACEHOLDER_API_KEY = 'YOUR_PLACEHOLDER_API_KEY_FOR_WEBHOOK_MANAGEMENT';

// --- Webhook Management Example ---

/**
 * Demonstrates how to register and update webhook endpoints using the Pearl SDK.
 * This example uses placeholder API keys and URLs. In a real application,
 * you would use your actual API key and your application's public webhook endpoint.
 */
async function manageWebhooksExample() {
    console.log("--- Webhook Management Example ---");

    const client = new PearlClient({
        apiKey: PLACEHOLDER_API_KEY
    });

    // Example webhook endpoint URL for registration
    const registerEndpointUrl = 'https://my-app.com/api/webhooks/pearl-notifications';
    const registerRequest: WebhookEndpointRequest = {
        endpoint: registerEndpointUrl
    };

    try {
        // Step 1: Register a new webhook endpoint
        console.log(`Attempting to register webhook endpoint: ${registerEndpointUrl}`);
        await client.webhooks.register(registerRequest);
        console.log('Webhook registered successfully!');

        // Step 2: Update the existing webhook endpoint
        // Example: Changing the URL or other configuration details
        const updateEndpointUrl = 'https://my-app.com/api/webhooks/pearl-notifications-updated';
        const updateRequest: WebhookEndpointRequest = {
            endpoint: updateEndpointUrl
        };
        console.log(`Attempting to update webhook endpoint to: ${updateEndpointUrl}`);
        await client.webhooks.update(updateRequest);
        console.log('Webhook updated successfully!');

    } catch (error: any) {
        // Centralized error handling as per PearlClient's interceptors
        console.error('Failed to manage webhook:', error.message);
        if (error.response) {
            console.error('API Response Status:', error.response.status);
            console.error('API Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    } finally {
        console.log("\n--- End of Webhook Management Example ---");
    }
}

// Execute the example function
manageWebhooksExample();