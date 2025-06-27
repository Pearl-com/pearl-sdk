"""
Utilities for webhook signature computation and verification.
"""

import base64
import hashlib
import hmac


def _derive_hmac_key(initial_secret: str) -> str:
    """
    Derives the actual HMAC key from the provided secret using SHA256 hashing and string concatenation.
    
    Args:
        initial_secret: The initial secret.
        
    Returns:
        The SHA256-derived HMAC key as an uppercase hexadecimal string.
    """
    concatenated_string = f"{initial_secret}:reference_token"
    hash_bytes = hashlib.sha256(concatenated_string.encode('utf-8')).digest()
    return hash_bytes.hex().upper()


def compute_webhook_signature(secret: str, payload: str) -> str:
    """
    Computes the HMAC-SHA1 signature for a given webhook payload and secret.
    
    Args:
        secret: The webhook secret (your `referenceToken`).
        payload: The raw JSON string of the webhook body.
        
    Returns:
        The Base64-encoded HMAC-SHA1 signature.
        
    Raises:
        ValueError: If the webhook secret is empty.
    """
    if not secret:
        raise ValueError("Webhook secret cannot be empty.")
    
    hmac_key = _derive_hmac_key(secret)
    hmac_digest = hmac.new(
        hmac_key.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha1
    ).digest()
    
    return base64.b64encode(hmac_digest).decode('utf-8')


def verify_webhook_signature(
    received_signature: str,
    webhook_payload_json_string: str,
    webhook_secret: str
) -> bool:
    """
    Verifies the authenticity of a Pearl webhook payload using its signature.
    
    Args:
        received_signature: The signature received in the 'X-Pearl-API-Signature' header.
        webhook_payload_json_string: The raw JSON string of the webhook request body.
        webhook_secret: The shared secret.
        
    Returns:
        boolean indicating if the signature is valid.
        
    Raises:
        ValueError: If required parameters are missing.
    """
    if not received_signature or not webhook_payload_json_string or not webhook_secret:
        raise ValueError("Missing required parameters for webhook signature verification.")

    computed_signature = compute_webhook_signature(webhook_secret, webhook_payload_json_string)
    
    try:
        received_sig_bytes = base64.b64decode(received_signature)
        computed_sig_bytes = base64.b64decode(computed_signature)
    except Exception:
        return False
    
    if len(received_sig_bytes) != len(computed_sig_bytes):
        return False
    
    return hmac.compare_digest(received_sig_bytes, computed_sig_bytes)
