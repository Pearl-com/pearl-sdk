"""Tests for the RetryPolicy class."""

import pytest
from pearl_sdk.core.retry_policy import RetryPolicy
from pearl_sdk.types import RetryPolicyConfig


class TestRetryPolicy:
    """Test cases for RetryPolicy."""

    def test_initialization_with_default_values(self):
        """Test initialization with default values when no config is provided."""
        policy = RetryPolicy()
        assert policy.enabled is True
        assert policy.max_retries == 30
        assert policy.retry_delay_ms == 100
        assert policy.max_retry_delay_ms == 30000

    def test_initialization_with_custom_config(self):
        """Test initialization with provided custom config values."""
        custom_config = RetryPolicyConfig(
            enabled=False,
            max_retries=5,
            retry_delay_ms=200,
            max_retry_delay_ms=5000
        )
        policy = RetryPolicy(custom_config)
        assert policy.enabled is False
        assert policy.max_retries == 5
        assert policy.retry_delay_ms == 200
        assert policy.max_retry_delay_ms == 5000

    def test_invalid_max_retries_raises_error(self):
        """Test that negative max_retries raises ValueError."""
        invalid_config = RetryPolicyConfig(max_retries=-1)
        with pytest.raises(ValueError, match="max_retries must be a non-negative number"):
            RetryPolicy(invalid_config)

    def test_invalid_retry_delay_ms_raises_error(self):
        """Test that zero or negative retry_delay_ms raises ValueError."""
        with pytest.raises(ValueError, match="retry_delay_ms must be a positive number"):
            RetryPolicy(RetryPolicyConfig(retry_delay_ms=0))
        
        with pytest.raises(ValueError, match="retry_delay_ms must be a positive number"):
            RetryPolicy(RetryPolicyConfig(retry_delay_ms=-50))

    def test_invalid_max_retry_delay_ms_raises_error(self):
        """Test that zero or negative max_retry_delay_ms raises ValueError."""
        with pytest.raises(ValueError, match="max_retry_delay_ms must be a positive number"):
            RetryPolicy(RetryPolicyConfig(max_retry_delay_ms=0))
        
        with pytest.raises(ValueError, match="max_retry_delay_ms must be a positive number"):
            RetryPolicy(RetryPolicyConfig(max_retry_delay_ms=-500))

    def test_retry_delay_greater_than_max_raises_error(self):
        """Test that retry_delay_ms greater than max_retry_delay_ms raises ValueError."""
        invalid_config = RetryPolicyConfig(retry_delay_ms=1000, max_retry_delay_ms=500)
        with pytest.raises(ValueError, match="retry_delay_ms cannot be greater than max_retry_delay_ms"):
            RetryPolicy(invalid_config)

    def test_max_retries_getter(self):
        """Test the max_retries getter."""
        policy = RetryPolicy(RetryPolicyConfig(max_retries=10))
        assert policy.max_retries == 10

    def test_should_retry_disabled_policy(self):
        """Test should_retry returns False if retry policy is disabled."""
        disabled_policy = RetryPolicy(RetryPolicyConfig(enabled=False))
        assert disabled_policy.should_retry(0, 422) is False

    def test_should_retry_retryable_status_within_limits(self):
        """Test should_retry returns True for retryable status code (422) within max retries."""
        policy = RetryPolicy(RetryPolicyConfig(max_retries=3))
        assert policy.should_retry(0, 422) is True
        assert policy.should_retry(1, 422) is True
        assert policy.should_retry(2, 422) is True

    def test_should_retry_non_retryable_status_codes(self):
        """Test should_retry returns False for non-retryable status codes."""
        policy = RetryPolicy(RetryPolicyConfig(max_retries=3))
        assert policy.should_retry(0, 200) is False  # OK
        assert policy.should_retry(0, 400) is False  # Bad Request
        assert policy.should_retry(0, 401) is False  # Unauthorized
        assert policy.should_retry(0, 500) is False  # Internal Server Error

    def test_should_retry_exceeds_max_retries(self):
        """Test should_retry returns False if currentRetryCount equals or exceeds maxRetries."""
        policy = RetryPolicy(RetryPolicyConfig(max_retries=3))
        assert policy.should_retry(3, 422) is False  # equals maxRetries
        assert policy.should_retry(4, 422) is False  # exceeds maxRetries

    def test_calculate_retry_delay_exponential_backoff(self):
        """Test exponential backoff delay calculation with jitter."""
        policy = RetryPolicy(RetryPolicyConfig(retry_delay_ms=100, max_retry_delay_ms=10000))
        
        # Test multiple retry counts
        delay1 = policy.calculate_retry_delay(1)
        delay2 = policy.calculate_retry_delay(2)
        delay3 = policy.calculate_retry_delay(3)
        
        # Delays should generally increase (allowing for jitter)
        # Base delays: 100, 200, 400 (before jitter)
        assert 90 <= delay1 <= 110  # 100 ± 10% jitter
        assert 180 <= delay2 <= 220  # 200 ± 10% jitter
        assert 360 <= delay3 <= 440  # 400 ± 10% jitter

    def test_calculate_retry_delay_caps_at_max(self):
        """Test that delay is capped at max_retry_delay_ms."""
        policy = RetryPolicy(RetryPolicyConfig(retry_delay_ms=100, max_retry_delay_ms=500))
        
        # High retry count should be capped
        delay = policy.calculate_retry_delay(10)  # Would be 100 * 2^9 = 51200 without cap
        assert delay <= 550  # 500 + 10% jitter

    def test_calculate_retry_delay_includes_jitter(self):
        """Test that jitter is applied to delay calculation."""
        policy = RetryPolicy(RetryPolicyConfig(retry_delay_ms=100, max_retry_delay_ms=10000))
        
        # Run multiple times to check for variation due to jitter
        delays = [policy.calculate_retry_delay(1) for _ in range(10)]
        
        # All delays should be different due to jitter (very high probability)
        assert len(set(delays)) > 1  # At least some variation
        
        # All delays should be within expected range
        for delay in delays:
            assert 90 <= delay <= 110  # 100 ± 10% jitter
