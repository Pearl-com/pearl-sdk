export { PearlClient, PearlClientConfig } from './core/PearlClient';

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
    CompletionResponseUsage,
    ChatCompletionResponse,

    // Shared types
    ExpertInfo, // Used in both chat responses and webhooks

    // Error response types
    ProblemDetails,
    ProblemDetailsResponse,

    // Webhook-specific types
    WebhookPayload,
    WebhookEndpointRequest
} from './types';