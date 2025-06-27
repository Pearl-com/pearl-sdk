"""Tests for signature utilities."""

import pytest
from pearl_sdk.utils.signature_utils import compute_webhook_signature, verify_webhook_signature


class TestSignatureUtils:
    """Test cases for signature utilities."""

    def setup_method(self):
        """Set up test fixtures."""
        self.test_secret = 'testsecret123456789012345678901234567890-1'
        self.test_payload = '{"id":"test1234","message":"hello"}'

    def test_compute_webhook_signature_returns_valid_signature(self):
        """Test that compute_webhook_signature returns a valid signature."""
        signature = compute_webhook_signature(self.test_secret, self.test_payload)
        assert signature is not None
        assert isinstance(signature, str)
        assert len(signature) == 28  # Base64 encoded SHA1 hash length

    def test_verify_webhook_signature_returns_true_for_valid_signature(self):
        """Test that verify_webhook_signature returns True for a valid signature."""
        computed_signature = compute_webhook_signature(self.test_secret, self.test_payload)
        is_valid = verify_webhook_signature(computed_signature, self.test_payload, self.test_secret)
        assert is_valid is True

    def test_verify_webhook_signature_returns_false_for_invalid_signature(self):
        """Test that verify_webhook_signature returns False for an invalid signature."""
        invalid_signature = 'invalid-signature-12345='
        is_valid = verify_webhook_signature(invalid_signature, self.test_payload, self.test_secret)
        assert is_valid is False

    def test_verify_webhook_signature_returns_false_for_tampered_payload(self):
        """Test that verify_webhook_signature returns False for a tampered payload."""
        computed_signature = compute_webhook_signature(self.test_secret, self.test_payload)
        tampered_payload = '{"id":"test1234","message":"hello_tampered"}'
        is_valid = verify_webhook_signature(computed_signature, tampered_payload, self.test_secret)
        assert is_valid is False

    def test_compute_webhook_signature_raises_error_for_empty_secret(self):
        """Test that compute_webhook_signature raises ValueError if secret is empty."""
        with pytest.raises(ValueError, match="Webhook secret cannot be empty"):
            compute_webhook_signature('', self.test_payload)

    def test_verify_webhook_signature_raises_error_for_missing_parameters(self):
        """Test that verify_webhook_signature raises ValueError if required parameters are missing."""
        with pytest.raises(ValueError, match="Missing required parameters"):
            verify_webhook_signature('', self.test_payload, self.test_secret)
        
        with pytest.raises(ValueError, match="Missing required parameters"):
            verify_webhook_signature('any-sig', '', self.test_secret)
        
        with pytest.raises(ValueError, match="Missing required parameters"):
            verify_webhook_signature('any-sig', self.test_payload, '')

    def test_verify_webhook_signature_handles_malformed_base64(self):
        """Test that verify_webhook_signature handles malformed base64 gracefully."""
        malformed_signature = 'not-valid-base64!'
        is_valid = verify_webhook_signature(malformed_signature, self.test_payload, self.test_secret)
        assert is_valid is False

    def test_signatures_are_consistent(self):
        """Test that the same inputs always produce the same signature."""
        signature1 = compute_webhook_signature(self.test_secret, self.test_payload)
        signature2 = compute_webhook_signature(self.test_secret, self.test_payload)
        assert signature1 == signature2

    def test_different_secrets_produce_different_signatures(self):
        """Test that different secrets produce different signatures."""
        secret1 = 'secret1'
        secret2 = 'secret2'
        
        signature1 = compute_webhook_signature(secret1, self.test_payload)
        signature2 = compute_webhook_signature(secret2, self.test_payload)
        
        assert signature1 != signature2

    def test_different_payloads_produce_different_signatures(self):
        """Test that different payloads produce different signatures."""
        payload1 = '{"message":"hello"}'
        payload2 = '{"message":"world"}'
        
        signature1 = compute_webhook_signature(self.test_secret, payload1)
        signature2 = compute_webhook_signature(self.test_secret, payload2)
        
        assert signature1 != signature2
