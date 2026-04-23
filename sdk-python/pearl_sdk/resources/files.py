"""
Manages file-related operations, structured under `client.files`.

Supports uploading files (such as images or documents) that can be attached
to chat conversations for use by the Assistant or Expert.
"""

import os
from typing import Optional, Dict, Any, Union, IO, Tuple
import requests

from pearl_sdk.types import FileObject, FilePurposes


# A file input accepted by Files.create.
# Can be:
#   - a file-like object opened in binary mode
#   - a path-like string pointing to a file on disk
#   - a tuple of (filename, file_content)
#   - a tuple of (filename, file_content, content_type)
FileInput = Union[
    IO[bytes],
    str,
    Tuple[str, Union[bytes, IO[bytes]]],
    Tuple[str, Union[bytes, IO[bytes]], str],
]


class Files:
    """Manages file-related operations, structured under `client.files`."""

    def __init__(self, session: requests.Session):
        """
        Initialize the Files resource.

        Args:
            session: The requests session configured for Pearl API communication.
        """
        self._session = session

    def create(
        self,
        file: FileInput,
        session_id: str,
        purpose: str = FilePurposes.ATTACHMENT,
        filename: Optional[str] = None,
        request_config: Optional[Dict[str, Any]] = None,
    ) -> FileObject:
        """
        Uploads a file to the Pearl API's /files endpoint.

        The returned file id can be attached to a chat message via the
        `attachments` field on `ChatMessage`.

        Args:
            file: The file to upload. Accepts a file-like object opened in
                binary mode, a path to a file on disk, or a tuple of
                (filename, content) / (filename, content, content_type).
            session_id: The chat session identifier the file is associated with.
            purpose: The purpose of the file (defaults to "attachment").
            filename: Optional explicit filename. Used when `file` is a
                file-like object without a discoverable name.
            request_config: Optional request configuration (e.g., custom
                headers, timeout override).

        Returns:
            The FileObject representing the uploaded file.

        Raises:
            requests.RequestException: If the API call fails or a network issue occurs.
        """
        files_kwarg = self._build_files_kwarg(file, filename)
        data_kwarg = {"purpose": purpose, "sessionId": session_id}

        kwargs: Dict[str, Any] = {}
        if request_config:
            kwargs.update(request_config)

        # The session sets Content-Type: application/json by default; clear it
        # so that requests can generate a correct multipart/form-data boundary.
        headers = dict(kwargs.pop("headers", {}) or {})
        headers["Content-Type"] = None

        response = self._session.post(
            '/files',
            files=files_kwarg,
            data=data_kwarg,
            headers=headers,
            **kwargs,
        )
        response.raise_for_status()

        return self._parse_file_object(response.json())

    def _build_files_kwarg(
        self,
        file: FileInput,
        filename: Optional[str],
    ) -> Dict[str, Any]:
        """Normalizes the `file` argument into the shape expected by requests."""
        if isinstance(file, tuple):
            return {"file": file}

        if isinstance(file, (str, os.PathLike)):
            resolved_name = filename or os.path.basename(str(file))
            with open(file, 'rb') as fh:
                content = fh.read()
            return {"file": (resolved_name, content)}

        resolved_name = filename or getattr(file, 'name', None)
        if resolved_name:
            resolved_name = os.path.basename(str(resolved_name))
        else:
            resolved_name = 'file'
        return {"file": (resolved_name, file)}

    def _parse_file_object(self, data: Dict[str, Any]) -> FileObject:
        """Parse the API response into a FileObject."""
        return FileObject(
            id=data.get('id', ''),
            name=data.get('name', ''),
            size=data.get('size', 0),
            purpose=data.get('purpose', ''),
            created_at=data.get('createdAt', 0),
        )
