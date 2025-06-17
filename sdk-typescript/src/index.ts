export { PearlClient } from './core/PearlClient';
export { CONVERSATION_MODES } from './types';

export type {
    // Configuration types
    RetryPolicyConfig,

    // Base request types
    BaseRequest,
      // Chat-related types
    ChatMessage,
    ChatCompletionRequest,
    ChatCompletionResponseMessage,
    ChatCompletionChoice,
    ChatCompletionResponse,
    ConversationMode,

    // Shared types
    ExpertInfo, // Used in both chat responses and webhooks

    // Error response types
    ProblemDetails,
    ProblemDetailsResponse,

    // Webhook-specific types
    WebhookPayload,
    WebhookEndpointRequest
} from './types';