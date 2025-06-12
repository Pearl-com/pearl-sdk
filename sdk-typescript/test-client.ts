import { PearlClient } from './dist';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// --- Placeholder Data for Demonstration ---
const PLACEHOLDER_API_KEY = 'YOUR_PLACEHOLDER_API_KEY_FOR_CHAT_COMPLETIONS';

/**
 * Helper function to run the /chat/completions example.
 * This demonstrates sending a chat completion request and handling its response.
 * @param client The initialized PearlClient instance.
 */
async function runChatCompletionExample(client: PearlClient) {
  const sessionId = uuidv4(); // Generate a unique session ID for the request

  try {
    console.log("--- Chat Completion Example ---");

    // Making a chat completion request with custom headers
    const customHeaders = {
        'X-Custom-Header': 'MyCustomValue',
        'X-Request-ID': uuidv4()
    };

    const chatResponse = await client.chat.sendCompletion({
      model: "expert", // Specify the model to use
      messages: [
        {
          role: "user",
          content: "Explain artificial intelligence in simple terms." // The user's message
        }
      ],
      metadata: { sessionId: sessionId, source: "sdk-example" } // Attach custom metadata
    },
    {
      headers: customHeaders // Apply custom headers to the request
    });

    console.log("Assistant's message:", chatResponse.choices[0].message.content);
    console.log("Tokens used:", chatResponse.usage.total_tokens);

  } catch (error: any) {
    console.error("--- Chat Completion API Error ---");
    if (axios.isAxiosError(error)) {
        console.error("Error message:", error.message);
        if (error.response?.data?.Error) {
            // If the API returned structured error details (ProblemDetailsResponse)
            console.error("API Error Details:", JSON.stringify(error.response.data.Error, null, 2));
        } else if (error.response) {
            // If there's an Axios response but no structured error data
            console.error("Status:", error.response.status);
            console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            // The request was made but no response was received
            console.error("No response received from server. Request:", error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Request setup error:", error.message);
        }
    } else {
        console.error("An unexpected error occurred:", error);
    }
  } finally {
    console.log("\n--- End of Chat Completion Example ---");
  }
}

/**
 * Main function to run all SDK examples.
 */
async function main() {
  // Initialize client with comprehensive configuration for demonstration
  const client = new PearlClient({
    apiKey: PLACEHOLDER_API_KEY,
    timeout: 60000, // 60 seconds timeout
    retryPolicy: {
      enabled: true,
      maxRetries: 50,
      retryDelayMs: 100,
      maxRetryDelayMs: 60000
    }
  });

  await runChatCompletionExample(client);

  console.log("\n--- All examples completed ---");
}

main();