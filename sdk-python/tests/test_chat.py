"""Tests for the Chat resource."""

import pytest
from unittest.mock import Mock, patch
import requests
from pearl_sdk.resources.chat import Chat
from pearl_sdk.types import (
    ChatMessage, ChatCompletionResponse,
    ChatCompletionChoice, ChatCompletionResponseMessage
)


class TestChat:
    """Test cases for the Chat class."""

    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.mock_session = Mock(spec=requests.Session)
        self.chat = Chat(self.mock_session)

    def test_constructor_initializes_with_session(self):
        """Test that the constructor initializes with the provided session."""
        assert self.chat._session is self.mock_session

    def test_send_completion_success(self):
        """Test successful chat completion request."""
        # Arrange
        test_messages = [ChatMessage(role="user", content="Test message")]
        test_session_id = "test-session-123"
        test_model = "test-model"
        test_mode = "test-mode"
        
        mock_response_data = {
            "id": "chatcmpl-test",
            "choices": [{
                "index": 0,
                "message": {
                    "score": None,
                    "isHuman": False,
                    "expertInfo": None,
                    "role": "assistant",
                    "content": "Mocked assistant response."
                },
                "logprobs": None,
                "finish_reason": "stop"
            }],
            "object": "chat.completion",
            "created": 1678886400,
            "model": "test-model",
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            },
            "questionId": None,
            "userId": None
        }

        mock_response = Mock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None
        self.mock_session.post.return_value = mock_response

        # Act
        result = self.chat.send_completion(test_messages, test_session_id, test_model, test_mode)

        # Assert
        self.mock_session.post.assert_called_once_with(
            '/chat/completions',
            json={
                "model": "test-model",
                "messages": [{"role": "user", "content": "Test message"}],
                "metadata": {"mode": "test-mode", "sessionId": "test-session-123"}
            }
        )
        
        assert isinstance(result, ChatCompletionResponse)
        assert result.id == "chatcmpl-test"
        assert len(result.choices) == 1
        assert result.choices[0].message.content == "Mocked assistant response."

    def test_send_completion_with_request_config(self):
        """Test chat completion request with additional request configuration."""
        # Arrange
        test_messages = [ChatMessage(role="user", content="Test message")]
        test_session_id = "test-session-123"
        test_model = "test-model"
        request_config = {"headers": {"X-Custom-Header": "test-value"}, "timeout": 30}
        
        mock_response_data = {
            "id": "chatcmpl-test",
            "choices": [],
            "object": "chat.completion",
            "created": 1678886400,
            "model": "test-model",
            "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
            "questionId": None,
            "userId": None
        }

        mock_response = Mock()
        mock_response.json.return_value = mock_response_data
        mock_response.raise_for_status.return_value = None
        self.mock_session.post.return_value = mock_response

        # Act
        result = self.chat.send_completion(test_messages, test_session_id, test_model, mode="PEARL_AI", request_config=request_config)

        # Assert
        self.mock_session.post.assert_called_once_with(
            '/chat/completions',
            json={
                "model": "test-model",
                "messages": [{"role": "user", "content": "Test message"}],
                "metadata": {"mode": "PEARL_AI", "sessionId": "test-session-123"}
            },
            headers={"X-Custom-Header": "test-value"},
            timeout=30
        )

    def test_send_completion_http_error(self):
        """Test that HTTP errors are properly raised."""
        # Arrange
        test_messages = [ChatMessage(role="user", content="Test message")]
        test_session_id = "test-session-123"
        test_model = "test-model"
        
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = requests.RequestException("API Error")
        self.mock_session.post.return_value = mock_response

        # Act & Assert
        with pytest.raises(requests.RequestException, match="API Error"):
            self.chat.send_completion(test_messages, test_session_id, test_model)

    def test_parse_chat_completion_response_with_expert_info(self):
        """Test parsing response with expert information."""
        # Arrange
        response_data = {
            "id": "chatcmpl-test",
            "choices": [{
                "index": 0,
                "message": {
                    "score": "0.95",
                    "isHuman": True,
                    "expertInfo": {
                        "name": "Dr. Smith",
                        "jobDescription": "AI Researcher",
                        "avatarUrl": "https://example.com/avatar.jpg"
                    },
                    "role": "assistant",
                    "content": "Expert response."
                },
                "logprobs": None,
                "finish_reason": "stop"
            }],
            "object": "chat.completion",
            "created": 1678886400,
            "model": "test-model",
            "usage": {
                "prompt_tokens": 15,
                "completion_tokens": 25,
                "total_tokens": 40
            },
            "questionId": "q123",
            "userId": "u456"
        }

        # Act
        result = self.chat._parse_chat_completion_response(response_data)

        # Assert
        assert result.id == "chatcmpl-test"
        assert len(result.choices) == 1
        
        choice = result.choices[0]
        assert choice.index == 0
        assert choice.finish_reason == "stop"
        
        message = choice.message
        assert message.score == "0.95"
        assert message.is_human is True
        assert message.content == "Expert response."
        
        expert_info = message.expert_info
        assert expert_info is not None
        assert expert_info.name == "Dr. Smith"
        assert expert_info.job_description == "AI Researcher"
        assert expert_info.avatar_url == "https://example.com/avatar.jpg"
        
        assert result.question_id == "q123"
        assert result.user_id == "u456"
