"""Type definitions for the Pearl SDK."""

from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass


class ConversationModes:
    """Conversation mode constants for Pearl API."""
    # AI-only response mode
    PEARL_AI = 'pearl-ai'
    # AI with expert verification mode
    PEARL_AI_VERIFIED = 'pearl-ai-verified'
    # AI with expert transition mode
    PEARL_AI_EXPERT = 'pearl-ai-expert'
    # Direct expert connection mode
    EXPERT = 'expert'


# Default model for Pearl API requests
DEFAULT_MODEL = 'pearl-ai'


@dataclass
class RetryPolicyConfig:
    """Configuration options for the retry policy."""
    enabled: Optional[bool] = None
    max_retries: Optional[int] = None
    retry_delay_ms: Optional[int] = None
    max_retry_delay_ms: Optional[int] = None


@dataclass
class BaseRequest:
    """Base properties for request models with common fields."""
    model: str
    metadata: Dict[str, str]


@dataclass
class ChatMessage:
    """Represents a single message in a chat conversation."""
    role: str  # 'user', 'system', or 'assistant'
    content: str


@dataclass
class ChatCompletionRequest(BaseRequest):
    """Request payload for chat completions."""
    messages: List[ChatMessage]


@dataclass
class ExpertInfo:
    """Represents information about the expert."""
    name: Optional[str]
    job_description: Optional[str]
    avatar_url: Optional[str]


@dataclass
class ChatCompletionResponseMessage:
    """Represents a message from the assistant in a chat completion response."""
    is_human: bool
    expert_info: Optional[ExpertInfo]
    role: str  # 'assistant'
    content: Optional[str]


@dataclass
class ChatCompletionChoice:
    """Represents a single choice (generated response) in a chat completion."""
    index: int
    message: ChatCompletionResponseMessage
    finish_reason: str


@dataclass
class ChatCompletionResponse:
    """Full response structure for chat completions and general completions."""
    id: str
    choices: List[ChatCompletionChoice]
    created: int
    question_id: Optional[str]
    user_id: Optional[str]


@dataclass
class ProblemDetails:
    """Represents the detailed problem information."""
    message: str
    code: Optional[str] = None
    type: Optional[str] = None
    param: Optional[str] = None
    additional_properties: Optional[Dict[str, Any]] = None


@dataclass
class ProblemDetailsResponse:
    """Represents the full error response from the API, wrapping a ProblemDetails object."""
    error: ProblemDetails


@dataclass
class WebhookPayload:
    """Represents the structure of a webhook payload from Pearl."""
    id: str
    session_id: str
    message: str
    message_date_time: str
    expert: ExpertInfo


@dataclass
class WebhookEndpointRequest:
    """Request payload for registering or updating a webhook endpoint."""
    endpoint: str



