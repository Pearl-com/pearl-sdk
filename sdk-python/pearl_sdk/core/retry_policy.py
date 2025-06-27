"""
Encapsulates the retry logic for API requests, including exponential backoff with jitter.
"""

import math
import random
from typing import Optional
from pearl_sdk.types import RetryPolicyConfig


class RetryPolicy:
    """Encapsulates the retry logic for API requests, including exponential backoff with jitter."""

    def __init__(self, config: Optional[RetryPolicyConfig] = None):
        """
        Initializes a new instance of the RetryPolicy.
        
        Args:
            config: Optional configuration for the retry policy.
            
        Raises:
            ValueError: If configuration parameters are invalid.
        """
        if config is None:
            config = RetryPolicyConfig()
            
        self.enabled = config.enabled if config.enabled is not None else True
        self._max_retries = config.max_retries if config.max_retries is not None else 30
        self.retry_delay_ms = config.retry_delay_ms if config.retry_delay_ms is not None else 100
        self.max_retry_delay_ms = config.max_retry_delay_ms if config.max_retry_delay_ms is not None else 30000

        # Basic validation for retry parameters
        if not isinstance(self._max_retries, int) or self._max_retries < 0:
            raise ValueError("RetryPolicy: max_retries must be a non-negative number if provided.")
        
        if not isinstance(self.retry_delay_ms, int) or self.retry_delay_ms <= 0:
            raise ValueError("RetryPolicy: retry_delay_ms must be a positive number if provided.")
        
        if not isinstance(self.max_retry_delay_ms, int) or self.max_retry_delay_ms <= 0:
            raise ValueError("RetryPolicy: max_retry_delay_ms must be a positive number if provided.")
        
        if self.retry_delay_ms > self.max_retry_delay_ms:
            raise ValueError("RetryPolicy: retry_delay_ms cannot be greater than max_retry_delay_ms.")

    @property
    def max_retries(self) -> int:
        """Public getter to access the maximum number of retries."""
        return self._max_retries

    def should_retry(self, current_retry_count: int, status_code: Optional[int] = None) -> bool:
        """
        Determines if a request should be retried based on its current retry count and policy settings.
        
        Args:
            current_retry_count: The number of times the request has already been retried.
            status_code: The HTTP status code of the failed response.
            
        Returns:
            True if the request should be retried, false otherwise.
        """
        if not self.enabled:
            return False

        # Note: Current implementation only retries 422.
        is_retryable_status = status_code == 422
        return is_retryable_status and current_retry_count < self._max_retries

    def calculate_retry_delay(self, retry_count: int) -> int:
        """
        Calculates the exponential backoff delay with jitter.
        
        The formula used is: min(max_delay, initial_delay * (2 ^ (retry_count - 1))) + random_jitter_factor
        Jitter is a random component (e.g., up to 10% of the calculated delay) to prevent "thundering herd" problems.
        
        Args:
            retry_count: The current retry attempt number (1-indexed).
            
        Returns:
            The calculated delay in milliseconds.
        """
        exponential_delay = self.retry_delay_ms * math.pow(2, retry_count - 1)
        capped_delay = min(exponential_delay, self.max_retry_delay_ms)
        jitter = random.random() * capped_delay * 0.1  # Add up to 10% jitter
        return math.floor(capped_delay + jitter)
