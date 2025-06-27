"""Tests for the Webhooks resource."""

import pytest
from unittest.mock import Mock, patch
from pearl_sdk.resources.webhooks import Webhooks
from pearl_sdk.types import WebhookEndpointRequest


class TestWebhooks:
    """Test cases for Webhooks resource."""

    def setup_method(self):
        """Set up test fixtures."""
        self.mock_webhook_secret = 'supersecretkey1234567890abcdef'
        self.mock_session = Mock()
        self.webhooks = Webhooks(self.mock_session, self.mock_webhook_secret)

    def test_constructor_initializes_correctly(self):
        """Test constructor initializes with apiClient and webhookSecret."""
        assert self.webhooks._session == self.mock_session
        assert self.webhooks._webhook_secret == self.mock_webhook_secret

    def test_constructor_raises_error_for_missing_secret(self):
        """Test constructor raises error if webhookSecret is missing."""
        with pytest.raises(ValueError, match="Webhook secret must be provided"):
            Webhooks(self.mock_session, "")
        
        with pytest.raises(ValueError, match="Webhook secret must be provided"):
            Webhooks(self.mock_session, None)

    @patch('pearl_sdk.resources.webhooks.verify_webhook_signature')
    def test_is_valid_signature_returns_true_for_valid_signature(self, mock_verify):
        """Test is_valid_signature returns True when verification succeeds."""
        mock_verify.return_value = True
        
        received_signature = 'mocked_signature'
        webhook_payload_json_string = '{"event":"test"}'
        
        result = self.webhooks.is_valid_signature(received_signature, webhook_payload_json_string)
        
        assert result is True
        mock_verify.assert_called_once_with(
            received_signature, 
            webhook_payload_json_string, 
            self.mock_webhook_secret
        )

    @patch('pearl_sdk.resources.webhooks.verify_webhook_signature')
    def test_is_valid_signature_returns_false_for_invalid_signature(self, mock_verify):
        """Test is_valid_signature returns False when verification fails."""
        mock_verify.return_value = False
        
        received_signature = 'mocked_signature'
        webhook_payload_json_string = '{"event":"test"}'
        
        result = self.webhooks.is_valid_signature(received_signature, webhook_payload_json_string)
        
        assert result is False
        mock_verify.assert_called_once_with(
            received_signature, 
            webhook_payload_json_string, 
            self.mock_webhook_secret
        )

    @patch('pearl_sdk.resources.webhooks.compute_webhook_signature')
    def test_compute_signature_calls_utility_function(self, mock_compute):
        """Test compute_signature calls the utility function with correct parameters."""
        payload = '{"data":"some_data"}'
        computed_signature = 'mocked_computed_signature'
        mock_compute.return_value = computed_signature
        
        result = self.webhooks.compute_signature(payload)
        
        assert result == computed_signature
        mock_compute.assert_called_once_with(self.mock_webhook_secret, payload)

    def test_register_calls_session_post_with_correct_parameters(self):
        """Test register method calls session.post with correct endpoint and request."""
        register_request = WebhookEndpointRequest(endpoint='https://example.com/webhook')
        
        self.webhooks.register(register_request)
        
        self.mock_session.post.assert_called_once_with(
            '/webhook', 
            json={'endpoint': 'https://example.com/webhook'}
        )
        self.mock_session.post.return_value.raise_for_status.assert_called_once()

    def test_register_calls_session_post_with_request_config(self):
        """Test register method calls session.post with request_config."""
        register_request = WebhookEndpointRequest(endpoint='https://example.com/webhook')
        request_config = {'headers': {'X-Test': 'Header'}}
        
        self.webhooks.register(register_request, request_config)
        
        self.mock_session.post.assert_called_once_with(
            '/webhook', 
            json={'endpoint': 'https://example.com/webhook'},
            headers={'X-Test': 'Header'}
        )

    def test_register_propagates_errors_from_session(self):
        """Test register method propagates errors from session.post."""
        register_request = WebhookEndpointRequest(endpoint='https://example.com/webhook')
        mock_error = Exception('Registration failed')
        self.mock_session.post.side_effect = mock_error
        
        with pytest.raises(Exception, match='Registration failed'):
            self.webhooks.register(register_request)

    def test_update_calls_session_put_with_correct_parameters(self):
        """Test update method calls session.put with correct endpoint and request."""
        update_request = WebhookEndpointRequest(endpoint='https://example.com/updated-webhook')
        
        self.webhooks.update(update_request)
        
        self.mock_session.put.assert_called_once_with(
            '/webhook', 
            json={'endpoint': 'https://example.com/updated-webhook'}
        )
        self.mock_session.put.return_value.raise_for_status.assert_called_once()

    def test_update_calls_session_put_with_request_config(self):
        """Test update method calls session.put with request_config."""
        update_request = WebhookEndpointRequest(endpoint='https://example.com/updated-webhook')
        request_config = {'timeout': 5}
        
        self.webhooks.update(update_request, request_config)
        
        self.mock_session.put.assert_called_once_with(
            '/webhook', 
            json={'endpoint': 'https://example.com/updated-webhook'},
            timeout=5
        )

    def test_update_propagates_errors_from_session(self):
        """Test update method propagates errors from session.put."""
        update_request = WebhookEndpointRequest(endpoint='https://example.com/updated-webhook')
        mock_error = Exception('Update failed')
        self.mock_session.put.side_effect = mock_error
        
        with pytest.raises(Exception, match='Update failed'):
            self.webhooks.update(update_request)
