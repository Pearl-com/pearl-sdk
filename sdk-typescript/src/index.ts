export { PearlClient, PearlClientOptions } from './core/PearlClient';
export { CONVERSATION_MODES, DEFAULT_MODEL, FILE_PURPOSES } from './types';
export { FileCreateParams, FileInput } from './resources/files';

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

    // File-related types
    FileObject,
    FilePurpose,

    // Shared types
    ExpertInfo, // Used in both chat responses and webhooks

    // Error response types
    ProblemDetails,
    ProblemDetailsResponse,

    // Webhook-specific types
    WebhookPayload,
    WebhookEndpointRequest
} from './types';

export { PearlError } from './core/HttpClient';
export type { PearlRequestOptions } from './core/HttpClient';
