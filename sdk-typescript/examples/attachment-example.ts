// To run this example:
// 1. Ensure you have the SDK installed: npm install pearl-sdk
// 2. Set your API key and IMAGE_PATH below
// 3. Transpile and run:
//    npx ts-node examples/attachment-example.ts

import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import {
    PearlClient,
    CONVERSATION_MODES,
    FILE_PURPOSES,
    ChatMessage
} from 'pearl-sdk';

const API_KEY = 'YOUR_PEARL_API_KEY';
const IMAGE_PATH = 'image.png';

async function runAttachmentExample() {
    if (API_KEY === 'YOUR_PEARL_API_KEY') {
        console.warn("WARNING: Please replace 'YOUR_PEARL_API_KEY' with your actual API key.");
        return;
    }

    const sessionId = uuidv4();
    const client = new PearlClient(API_KEY);

    try {
        console.log('\n--- Uploading file ---');
        const uploaded = await client.files.create({
            file: readFileSync(IMAGE_PATH),
            sessionId,
            purpose: FILE_PURPOSES.ATTACHMENT,
            filename: IMAGE_PATH
        });
        console.log(`Uploaded file id: ${uploaded.id}`);

        console.log('\n--- Sending chat completion with attachment ---');
        const messages: ChatMessage[] = [
            {
                role: 'user',
                content: "What's on the image?",
                attachments: [uploaded.id]
            }
        ];

        const chatResponse = await client.chat.sendCompletion(
            messages,
            sessionId,
            CONVERSATION_MODES.PEARL_AI_EXPERT
        );

        console.log("Assistant's message:", chatResponse.choices[0].message.content);
    } catch (error: any) {
        console.error('\n--- Error ---');
        if (axios.isAxiosError(error)) {
            console.error('Error message:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', JSON.stringify(error.response.data, null, 2));
            }
        } else {
            console.error('An unexpected error occurred:', error);
        }
    } finally {
        console.log('\n--- End of Attachment Example ---');
    }
}

runAttachmentExample();
