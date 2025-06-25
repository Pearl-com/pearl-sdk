"""
Manages chat-related operations, structured under `client.chat`.
"""

from typing import Optional, Dict, Any, List
import requests
from pearl_sdk.types import ChatMessage, ChatCompletionResponse, ConversationModes, DEFAULT_MODEL


class Chat:
    """Manages chat-related operations, structured under `client.chat`."""

    def __init__(self, session: requests.Session):
        """
        Initialize the Chat resource.
        
        Args:
            session: The requests session configured for Pearl API communication.
        """
        self._session = session

    def send_completion(
        self,
        messages: List[ChatMessage],
        session_id: str,
        mode: str = ConversationModes.PEARL_AI,
        model: str = DEFAULT_MODEL,
        request_config: Optional[Dict[str, Any]] = None
    ) -> ChatCompletionResponse:
        """
        Sends a chat completion request to the Pearl API's /chat/completions endpoint.
        
        This method serves as the primary entry point for generating text completions,
        whether for conversational AI or general text generation tasks.
        
        Args:
            messages: Array of chat messages for the conversation.
            session_id: Unique identifier for the chat session.
            mode: The conversation mode (optional, defaults to PEARL_AI).
            model: The model to use (optional, defaults to "pearl-ai").
            request_config: Optional request configuration (e.g., custom headers, timeout override).
            
        Returns:
            The ChatCompletionResponse on success.
            
        Raises:
            requests.RequestException: If the API call fails or a network issue occurs.
        """
        # Construct the request object internally
        request_data = {
            "model": model,
            "messages": [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ],
            "metadata": {"mode": mode, "sessionId": session_id}
        }
        
        # Merge any additional request configuration
        kwargs = {}
        if request_config:
            kwargs.update(request_config)
        
        response = self._session.post('/chat/completions', json=request_data, **kwargs)
        response.raise_for_status()
        
        # Convert response to ChatCompletionResponse
        data = response.json()
        return self._parse_chat_completion_response(data)

    def _parse_chat_completion_response(self, data: Dict[str, Any]) -> ChatCompletionResponse:
        """
        Parse the API response into a ChatCompletionResponse object.
        
        Args:
            data: The raw JSON response data.
            
        Returns:
            A ChatCompletionResponse object.
        """
        from pearl_sdk.types import (
            ChatCompletionResponse, ChatCompletionChoice, ChatCompletionResponseMessage,
            ExpertInfo
        )
        
        # Parse choices
        choices = []
        for choice_data in data.get('choices', []):
            message_data = choice_data.get('message', {})
            expert_info_data = message_data.get('expertInfo') or message_data.get('expert_info')
            
            expert_info = None
            if expert_info_data:
                expert_info = ExpertInfo(
                    name=expert_info_data.get('name'),
                    job_description=expert_info_data.get('jobDescription') or expert_info_data.get('job_description'),
                    avatar_url=expert_info_data.get('avatarUrl') or expert_info_data.get('avatar_url')
                )
            
            message = ChatCompletionResponseMessage(
                is_human=message_data.get('isHuman', False) or message_data.get('is_human', False),
                expert_info=expert_info,
                role=message_data.get('role', 'assistant'),
                content=message_data.get('content')
            )
            
            choice = ChatCompletionChoice(
                index=choice_data.get('index', 0),
                message=message,
                finish_reason=choice_data.get('finish_reason', '')
            )
            choices.append(choice)
        
        return ChatCompletionResponse(
            id=data.get('id', ''),
            choices=choices,
            created=data.get('created', 0),
            question_id=data.get('questionId') or data.get('question_id'),
            user_id=data.get('userId') or data.get('user_id')
        )
