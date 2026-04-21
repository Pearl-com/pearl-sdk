#!/usr/bin/env python3
"""
Attachment Example

Demonstrates uploading a file via the /files endpoint and then attaching
it to a chat completion request.

IMPORTANT: Files cannot be uploaded on the very first message of a chat
session. The session must already exist on the server before a file can
be associated with it, so you must send at least one chat completion
with the same session_id before calling client.files.create.

To run this example:
1. Install the SDK: pip install pearl-sdk
2. Set your API key in the API_KEY variable below
3. Set IMAGE_PATH to a local file (image or document)
4. Run: python examples/attachment_example.py
"""

import uuid
from pearl_sdk import (
    PearlClient,
    ChatMessage,
    ConversationModes,
    FilePurposes,
)

API_KEY = 'YOUR_PEARL_API_KEY'
IMAGE_PATH = 'image.png'


def run_attachment_example():
    if API_KEY == 'YOUR_PEARL_API_KEY':
        print("WARNING: Please replace 'YOUR_PEARL_API_KEY' with your actual API key.")
        return

    session_id = str(uuid.uuid4())
    client = PearlClient(api_key=API_KEY)

    try:
        # Step 1: Initialize the session by sending an initial chat completion.
        # Files can only be uploaded against an existing session, so this
        # first round-trip is required before /files will accept our upload.
        print("\n--- Initializing session with an initial message ---")
        messages = [
            ChatMessage(role="user", content="Hello"),
        ]
        first_response = client.chat.send_completion(
            messages=messages,
            session_id=session_id,
            mode=ConversationModes.PEARL_AI_EXPERT,
        )
        messages.append(ChatMessage(
            role="assistant",
            content=first_response.choices[0].message.content,
        ))

        # Step 2: Upload the file, referencing the now-initialized session_id.
        print("\n--- Uploading file ---")
        with open(IMAGE_PATH, 'rb') as image_file:
            uploaded = client.files.create(
                file=image_file,
                session_id=session_id,
                purpose=FilePurposes.ATTACHMENT,
            )
        print(f"Uploaded file id: {uploaded.id}")

        # Step 3: Send a follow-up message that references the uploaded file.
        print("\n--- Sending chat completion with attachment ---")
        messages.append(ChatMessage(
            role="user",
            content="What's on the image?",
            attachments=[uploaded.id],
        ))

        chat_response = client.chat.send_completion(
            messages=messages,
            session_id=session_id,
            mode=ConversationModes.PEARL_AI_EXPERT,
        )

        print("Assistant's message:", chat_response.choices[0].message.content)

    except Exception as error:
        print("\n--- Error ---")
        print(f"An error occurred: {error}")
        if hasattr(error, 'response') and error.response is not None:
            print(f"Status code: {error.response.status_code}")
            print(f"Response: {error.response.text}")

    finally:
        print("\n--- End of Attachment Example ---")


if __name__ == "__main__":
    run_attachment_example()
