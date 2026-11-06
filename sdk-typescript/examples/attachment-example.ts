// Attachment Example
//
// Demonstrates uploading a file via the /files endpoint and then attaching
// it to a chat completion request.
//
// IMPORTANT: Files cannot be uploaded on the very first message of a chat
// session. The session must already exist on the server before a file can
// be associated with it, so you must send at least one chat completion
// with the same sessionId before calling client.files.create.
//
// To run this example:
// 1. Install the SDK and uuid in your project: npm install @pearl.com/pearl-api-client-sdk uuid
// 2. Set your API key and IMAGE_PATH below
// 3. Transpile and run:
//    npx ts-node examples/attachment-example.ts

import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
    PearlClient,
    PearlRequestError,
    CONVERSATION_MODES,
    FILE_PURPOSES,
    ChatMessage
} from '@pearl.com/pearl-api-client-sdk';

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
        // Step 1: Initialize the session by sending an initial chat completion.
        // Files can only be uploaded against an existing session, so this
        // first round-trip is required before /files will accept our upload.
        console.log('\n--- Initializing session with an initial message ---');
        const messages: ChatMessage[] = [
            { role: 'user', content: 'Hello' }
        ];
        const firstResponse = await client.chat.sendCompletion(
            messages,
            sessionId,
            CONVERSATION_MODES.PEARL_AI_EXPERT
        );
        console.log("Assistant's message:", firstResponse.choices[0].message.content);
        messages.push({
            role: 'assistant',
            content: firstResponse.choices[0].message.content ?? ''
        });

        // Step 2: Upload the file, referencing the now-initialized sessionId.
        console.log('\n--- Uploading file ---');
        const uploaded = await client.files.create({
            file: readFileSync(IMAGE_PATH),
            sessionId,
            purpose: FILE_PURPOSES.ATTACHMENT,
            filename: IMAGE_PATH
        });
        console.log(`Uploaded file id: ${uploaded.id}`);

        // Step 3: Send a follow-up message that references the uploaded file.
        console.log('\n--- Sending chat completion with attachment ---');
        messages.push({
            role: 'user',
            content: "What's on the image?",
            attachments: [uploaded.id]
        });

        const chatResponse = await client.chat.sendCompletion(
            messages,
            sessionId,
            CONVERSATION_MODES.PEARL_AI_EXPERT
        );

        console.log("Assistant's message:", chatResponse.choices[0].message.content);
    } catch (error) {
        console.error('\n--- Error ---');
        if (error instanceof PearlRequestError) {
            console.error('Error message:', error.message);
            if (error.kind === 'http') {
                console.error('Status:', error.status);
                console.error('Data:', JSON.stringify(error.data, null, 2));
            } else if (error.kind === 'network') {
                console.error('No response received from server.');
            } else {
                console.error('Request stopped:', error.kind);
            }
        } else {
            console.error('An unexpected error occurred:', error);
        }
    } finally {
        console.log('\n--- End of Attachment Example ---');
    }
}

runAttachmentExample();
