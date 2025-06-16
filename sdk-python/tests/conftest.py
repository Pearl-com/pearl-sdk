"""Test configuration and fixtures."""

import pytest
from unittest.mock import Mock
from pearl_sdk import PearlClient, PearlClientConfig


@pytest.fixture
def mock_api_key():
    """Provide a mock API key for testing."""
    return "test_api_key_123"


@pytest.fixture
def mock_base_url():
    """Provide a mock base URL for testing."""
    return "https://api.test.com/api/v1"


@pytest.fixture
def basic_client_config(mock_api_key):
    """Provide a basic client configuration for testing."""
    return PearlClientConfig(api_key=mock_api_key)


@pytest.fixture
def mock_session():
    """Provide a mock requests session."""
    session = Mock()
    session.post.return_value.json.return_value = {}
    session.post.return_value.raise_for_status.return_value = None
    session.put.return_value.raise_for_status.return_value = None
    session.get.return_value.raise_for_status.return_value = None
    return session
