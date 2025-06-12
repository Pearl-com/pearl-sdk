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
    logprobs: null;
    finish_reason: string;
}

/**
 * Usage statistics for a completion request.
 */
export interface CompletionResponseUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

/**
 * Full response structure for chat completions and general completions.
 */
export interface ChatCompletionResponse {
    id: string;
    choices: ChatCompletionChoice[];
    object: string;
    created: number;
    model: string;
    usage: CompletionResponseUsage;
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