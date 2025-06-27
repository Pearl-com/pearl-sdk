"""
Provides utilities for handling Pearl webhooks, including signature verification
and managing webhook endpoints (register/update).
"""

from typing import Optional, Dict, Any
import requests
from pearl_sdk.utils.signature_utils import verify_webhook_signature, compute_webhook_signature
from pearl_sdk.types import WebhookEndpointRequest


class Webhooks:
    """
    Provides utilities for handling Pearl webhooks, including signature verification
    and managing webhook endpoints (register/update).
    """

    def __init__(self, session: requests.Session, webhook_secret: str):
        """
        Initializes a new instance of the Webhooks resource.
        
        Args:
            session: The requests session configured for Pearl API communication.
            webhook_secret: The secret used to sign and verify webhooks.
            
        Raises:
            ValueError: If the webhook secret is not provided.
        """
        if not webhook_secret:
            raise ValueError("Webhook secret must be provided to Webhooks resource.")
        
        self._session = session
        self._webhook_secret = webhook_secret

    def is_valid_signature(
        self,
        received_signature: str,
        webhook_payload_json_string: str
    ) -> bool:
        """
        Verifies the authenticity of a Pearl webhook payload using its signature.
        
        This is the primary method for checking if an incoming webhook request is valid.
        It ensures the webhook originated from your Pearl API and has not been tampered with.
        
        Args:
            received_signature: The signature received in the 'X-Pearl-API-Signature' header.
            webhook_payload_json_string: The raw, unparsed JSON string of the webhook request body.
            
        Returns:
            `True` if the signature is valid, indicating an authentic and untampered webhook; `False` otherwise.
        """
        return verify_webhook_signature(
            received_signature,
            webhook_payload_json_string,
            self._webhook_secret
        )

    def compute_signature(self, payload: str) -> str:
        """
        Utility to compute a signature for a given payload.
        
        This method is primarily intended for advanced use cases like testing your webhook endpoint
        or if your SDK needs to sign outgoing webhook payloads in very specific scenarios.
        It is not typically used when simply verifying incoming webhooks.
        The webhook secret is derived from the PearlClient's API key.
        
        Args:
            payload: The raw JSON string of the body to be signed.
            
        Returns:
            The Base64-encoded HMAC-SHA1 signature.
        """
        return compute_webhook_signature(self._webhook_secret, payload)

    def register(
        self,
        request: WebhookEndpointRequest,
        request_config: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Registers a new webhook endpoint for message notifications.
        Corresponds to the POST /webhook API endpoint.
        
        Args:
            request: The WebhookEndpointRequest containing the webhook endpoint URL.
            request_config: Optional request configuration (e.g., custom headers, timeout override).
            
        Raises:
            requests.RequestException: On API errors (e.g., 400, 401, 500).
        """
        request_data = {"endpoint": request.endpoint}
        
        kwargs = {}
        if request_config:
            kwargs.update(request_config)
        
        response = self._session.post('/webhook', json=request_data, **kwargs)
        response.raise_for_status()

    def update(
        self,
        request: WebhookEndpointRequest,
        request_config: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Updates an existing webhook endpoint.
        Corresponds to the PUT /webhook API endpoint.
        
        Args:
            request: The WebhookEndpointRequest containing the updated webhook endpoint URL.
            request_config: Optional request configuration (e.g., custom headers, timeout override).
            
        Raises:
            requests.RequestException: On API errors (e.g., 400, 401, 500).
        """
        request_data = {"endpoint": request.endpoint}
        
        kwargs = {}
        if request_config:
            kwargs.update(request_config)
        
        response = self._session.put('/webhook', json=request_data, **kwargs)
        response.raise_for_status()
