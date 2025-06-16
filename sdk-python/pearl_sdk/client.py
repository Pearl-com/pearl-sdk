"""
Main client for interacting with the Pearl API.
"""

import time
from typing import Optional, Dict, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .types import PearlClientConfig
from .core.retry_policy import RetryPolicy
from .resources.chat import Chat
from .resources.webhooks import Webhooks


class PearlClient:
    """Main client for interacting with the Pearl API."""

    def __init__(self, config: PearlClientConfig):
        """
        Initializes a new instance of the PearlClient.
        
        Args:
            config: Configuration options for the client.
            
        Raises:
            ValueError: If `api_key` is missing or `timeout` is invalid.
        """
        if not config or not config.api_key:
            raise ValueError("PearlClient configuration must include an api_key.")
        
        if config.timeout is not None and (not isinstance(config.timeout, (int, float)) or config.timeout <= 0):
            raise ValueError("Timeout must be a positive number if provided.")

        self._api_key = config.api_key
        self._base_url = config.base_url or 'https://api.pearl.com/api/v1'
        self._retry_policy = RetryPolicy(config.retry_policy)
        
        # Configure the requests session
        self._session = requests.Session()
        self._session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self._api_key}',
        })
        
        # Set timeout
        timeout = config.timeout if config.timeout is not None else 30
        
        # Configure retry adapter with custom retry logic
        retry_adapter = RetryHTTPAdapter(
            retry_policy=self._retry_policy,
            timeout=timeout
        )
        
        self._session.mount('http://', retry_adapter)
        self._session.mount('https://', retry_adapter)
        
        # Set base URL for all requests
        self._session.request = self._create_request_wrapper(self._session.request)

        # Initialize resources
        self.chat = Chat(self._session)
        self.webhooks = Webhooks(self._session, self._api_key)

    def _create_request_wrapper(self, original_request):
        """Create a wrapper for the session request method to handle base URL."""
        def request_wrapper(method, url, **kwargs):
            # Prepend base URL if url doesn't start with http
            if not url.startswith('http'):
                url = self._base_url.rstrip('/') + '/' + url.lstrip('/')
            return original_request(method, url, **kwargs)
        return request_wrapper


class RetryHTTPAdapter(HTTPAdapter):
    """Custom HTTP adapter that implements Pearl SDK retry logic."""
    
    def __init__(self, retry_policy: RetryPolicy, timeout: float, *args, **kwargs):
        """
        Initialize the retry adapter.
        
        Args:
            retry_policy: The retry policy to use.
            timeout: Default timeout for requests.
        """
        self.retry_policy = retry_policy
        self.timeout = timeout
        super().__init__(*args, **kwargs)
    
    def send(self, request, **kwargs):
        """
        Send a request with custom retry logic.
        
        Args:
            request: The request to send.
            **kwargs: Additional keyword arguments.
            
        Returns:
            The response.
        """
        # Set timeout if not provided
        if 'timeout' not in kwargs:
            kwargs['timeout'] = self.timeout
        
        retry_count = 0
        
        while True:
            try:
                response = super().send(request, **kwargs)
                
                # If we get here, the request succeeded
                return response
                
            except requests.RequestException as e:
                # Extract status code if available
                status_code = None
                if hasattr(e, 'response') and e.response is not None:
                    status_code = e.response.status_code
                
                # Check if we should retry
                if self.retry_policy.should_retry(retry_count, status_code):
                    retry_count += 1
                    delay_ms = self.retry_policy.calculate_retry_delay(retry_count)
                    time.sleep(delay_ms / 1000.0)  # Convert to seconds
                    continue
                else:
                    # No more retries, re-raise the exception
                    raise
