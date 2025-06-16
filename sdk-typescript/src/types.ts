/**
 * Conversation mode constants for Pearl API.
 */
export const CONVERSATION_MODES = {
    /** AI-only response mode */
    PEARL_AI: 'pearl-ai',
    /** AI with expert verification mode */
    PEARL_AI_VERIFIED: 'pearl-ai-verified',
    /** AI with expert transition mode */
    PEARL_AI_EXPERT: 'pearl-ai-expert',
    /** Direct expert connection mode */
    EXPERT: 'expert'
} as const;

/**
 * Type for conversation mode values
 */
export type ConversationMode = typeof CONVERSATION_MODES[keyof typeof CONVERSATION_MODES];

/**
 * Configuration options for the retry policy.
 */
export interface RetryPolicyConfig {
    enabled?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
    maxRetryDelayMs?: number;
}

/**
 * Base properties for request models with common fields.
 */
export interface BaseRequest {
    model: string;
    metadata: Record<string, string>;
}

/**
 * Represents a single message in a chat conversation.
 */
export interface ChatMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

/**
 * Request payload for chat completions.
 */
export interface ChatCompletionRequest extends BaseRequest {
    messages: ChatMessage[];
}

/**
 * Represents information about the expert.
 */
export interface ExpertInfo {
    name: string | null;
    jobDescription: string | null;
    avatarUrl: string | null;
}

/**
 * Represents a message from the assistant in a chat completion response.
 */
export interface ChatCompletionResponseMessage {
    score: string | null;
    isHuman: boolean;
    expertInfo: ExpertInfo | null;
    role: 'assistant';
    content: string | null;
}

/**
 * Represents a single choice (generated response) in a chat completion.
 */
export interface ChatCompletionChoice {
    index: number;
    message: ChatCompletionResponseMessage;
    finish_reason: string;
}

/**
 * Full response structure for chat completions and general completions.
 */
export interface ChatCompletionResponse {
    id: string;
    choices: ChatCompletionChoice[];
    created: number;
    questionId: string | null;
    userId: string | null;
}

/**
* Represents the detailed problem information.
*/
export interface ProblemDetails {
    message: string;
    code?: string;
    type?: string;
    param?: string;
    [key: string]: any; // Allows for any additional, unforeseen properties.
}

/**
 * Represents the full error response from the API, wrapping a ProblemDetails object.
 */
export interface ProblemDetailsResponse {
    Error: ProblemDetails;
}

/**
 * Represents the structure of a webhook payload from Pearl.
 */
export interface WebhookPayload {
    id: string;
    sessionId: string;
    message: string;
    messageDateTime: string;
    expert: ExpertInfo;
}

/**
 * Request payload for registering or updating a webhook endpoint.
 */
export interface WebhookEndpointRequest {
    endpoint: string;
}