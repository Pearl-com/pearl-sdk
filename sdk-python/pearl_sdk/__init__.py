"""
Pearl SDK for Python

A robust and easy-to-use SDK for interacting with the Pearl API, providing streamlined access 
to AI chat completions, webhook management, and secure signature verification utilities.
"""

from .client import PearlClient
from .types import (
    # Configuration types
    RetryPolicyConfig,
    
    # Conversation mode constants
    ConversationModes,
    
    # Base request types
    BaseRequest,
    
    # Chat-related types
    ChatMessage,
    ChatCompletionRequest,
    ChatCompletionResponseMessage,
    ChatCompletionChoice,
    ChatCompletionResponse,
    
    # Shared types
    ExpertInfo,  # Used in both chat responses and webhooks
    
    # Error response types
    ProblemDetails,
    ProblemDetailsResponse,
    
    # Webhook-specific types
    WebhookPayload,
    WebhookEndpointRequest
)

__version__ = "0.1.0"
__author__ = "Pearl.com"
__email__ = "support@pearl.com"

__all__ = [
    'PearlClient',
    'RetryPolicyConfig',
    'ConversationModes',
    'BaseRequest',
    'ChatMessage',
    'ChatCompletionRequest',
    'ChatCompletionResponseMessage',
    'ChatCompletionChoice',
    'ChatCompletionResponse',
    'ExpertInfo',
    'ProblemDetails',
    'ProblemDetailsResponse',
    'WebhookPayload',
    'WebhookEndpointRequest'
]
