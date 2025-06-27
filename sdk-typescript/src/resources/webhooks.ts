import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { verifyWebhookSignature, computeWebhookSignature } from '../utils/signature-utils';
import { WebhookEndpointRequest } from '../types';

/**
 * Provides utilities for handling Pearl webhooks, including signature verification
 * and managing webhook endpoints (register/update).
 */
export class Webhooks {
    private apiClient: AxiosInstance;
    private readonly webhookSecret: string;

    /**
     * Initializes a new instance of the Webhooks resource.
     * @param apiClient The Axios instance configured for Pearl API communication.
     * @param webhookSecret The secret used to sign and verify webhooks.
     * @throws Error if the webhook secret is not provided.
     */
    constructor(apiClient: AxiosInstance, webhookSecret: string) {
        if (!webhookSecret) {
            throw new Error("Webhook secret must be provided to Webhooks resource.");
        }
        this.apiClient = apiClient;
        this.webhookSecret = webhookSecret;
    }

    /**
     * Verifies the authenticity of a Pearl webhook payload using its signature.
     * This is the primary method for checking if an incoming webhook request is valid.
     * It ensures the webhook originated from your Pearl API and has not been tampered with.
     *
     * @param receivedSignature The signature received in the 'X-Pearl-API-Signature' header.
     * @param webhookPayloadJsonString The raw, unparsed JSON string of the webhook request body.
     * @returns `true` if the signature is valid, indicating an authentic and untampered webhook; `false` otherwise.
     */
    public isValidSignature(
        receivedSignature: string,
        webhookPayloadJsonString: string
    ): boolean {
        return verifyWebhookSignature(receivedSignature, webhookPayloadJsonString, this.webhookSecret);
    }

    /**
     * Utility to compute a signature for a given payload.
     * This method is primarily intended for advanced use cases like testing your webhook endpoint
     * or if your SDK needs to sign outgoing webhook payloads in very specific scenarios.
     * It is not typically used when simply verifying incoming webhooks.
     * The webhook secret is derived from the PearlClient's API key.
     *
     * @param payload The raw JSON string of the body to be signed.
     * @returns The Base64-encoded HMAC-SHA1 signature.
     */
    public computeSignature(payload: string): string {
        return computeWebhookSignature(this.webhookSecret, payload);
    }

    /**
     * Registers a new webhook endpoint for message notifications.
     * Corresponds to the POST /webhook API endpoint.
     *
     * @param request The WebhookEndpointRequest containing the webhook endpoint URL.
     * @param requestConfig Optional Axios request configuration (e.g., custom headers, timeout override).
     * @returns A Promise that resolves on successful registration (HTTP 200).
     * @throws AxiosError on API errors (e.g., 400, 401, 500), which are logged and propagated by PearlClient's interceptors.
     */
    public async register(
        request: WebhookEndpointRequest,
        requestConfig?: AxiosRequestConfig
    ): Promise<void> {
        await this.apiClient.post('/webhook', request, requestConfig);
    }

    /**
     * Updates an existing webhook endpoint.
     * Corresponds to the PUT /webhook API endpoint.
     *
     * @param request The WebhookEndpointRequest containing the updated webhook endpoint URL.
     * @param requestConfig Optional Axios request configuration (e.g., custom headers, timeout override).
     * @returns A Promise that resolves on successful update (HTTP 200).
     * @throws AxiosError on API errors (e.g., 400, 401, 500), which are logged and propagated by PearlClient's interceptors.
     */
    public async update(
        request: WebhookEndpointRequest,
        requestConfig?: AxiosRequestConfig
    ): Promise<void> {
        await this.apiClient.put('/webhook', request, requestConfig);
    }
}