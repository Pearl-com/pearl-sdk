// To run this example:
// 1. Ensure you have the SDK installed: npm install pearl-sdk
// 2. Transpile and run:
//    npx ts-node examples/chat-completion-example.ts

import { PearlClient, CONVERSATION_MODES, ChatMessage } from 'pearl-sdk';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed: npm install uuid
import axios from 'axios';

// --- IMPORTANT: Configure your API Key ---
// Replace 'YOUR_PEARL_API_KEY' with your actual Pearl API Key.
// For demonstration purposes, you can use a placeholder, but a real key is needed for live calls.
const API_KEY = 'YOUR_PEARL_API_KEY';

async function runChatCompletionExample() {
  if (API_KEY === 'YOUR_PEARL_API_KEY') {
    console.warn("WARNING: Please replace 'YOUR_PEARL_API_KEY' with your actual API key to make live API calls.");
    console.log("Exiting example as API Key is a placeholder.");
    return;
  }
  const sessionId = uuidv4();
  // Initialize client with comprehensive configuration for demonstration
  const client = new PearlClient(API_KEY, {
    timeout: 60000, // 60 seconds timeout
    retryPolicy: {
      enabled: true,
      maxRetries: 50,
      retryDelayMs: 100,
      maxRetryDelayMs: 60000
    }
  });

  try {
    console.log("\n--- Starting Chat Completion Example ---");

    const messages = [
      {
        role: "user",
        content: "Explain large language models in simple terms." // The user's message
      }
    ] as ChatMessage[];
    console.log("Sending chat completion request...");
    const chatResponse = await client.chat.sendCompletion(
      messages,
      sessionId,
      CONVERSATION_MODES.PEARL_AI // mode (optional, defaults to PEARL_AI)
    );

    console.log("\n--- Chat Completion API Response ---");
    console.log("Assistant's message:", chatResponse.choices[0].message.content);

  } catch (error: any) {
    console.error("\n--- Chat Completion API Error ---");
    // Axios errors are handled by PearlClient's interceptors, but this catch
    // demonstrates how to handle final rejections from the SDK call.
    if (axios.isAxiosError(error)) {
      console.error("Error message:", error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error("No response received from server.");
      } else {
        console.error("Error setting up request.");
      }
    } else {
      console.error("An unexpected error occurred:", error);
    }
  } finally {
    console.log("\n--- End of Chat Completion Example ---");
  }
}

// Run the example
runChatCompletionExample();