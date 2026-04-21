"""Tests for the Files resource."""

import io
import os
import pathlib
import tempfile
from unittest.mock import Mock, patch

import pytest
import requests

from pearl_sdk import PearlClient
from pearl_sdk.resources.files import Files
from pearl_sdk.types import FileObject, FilePurposes


class TestFiles:
    """Test cases for the Files class."""

    def setup_method(self):
        self.mock_session = Mock(spec=requests.Session)
        self.files = Files(self.mock_session)

    def _stub_response(self, payload):
        mock_response = Mock()
        mock_response.json.return_value = payload
        mock_response.raise_for_status.return_value = None
        self.mock_session.post.return_value = mock_response
        return mock_response

    def test_constructor_initializes_with_session(self):
        assert self.files._session is self.mock_session

    def test_create_with_file_like_object(self):
        self._stub_response({
            "id": "file-123",
            "name": "hello.txt",
            "size": 5,
            "purpose": "attachment",
            "createdAt": 1700000000,
        })

        buf = io.BytesIO(b"hello")
        buf.name = "hello.txt"

        result = self.files.create(
            file=buf,
            session_id="sess-1",
        )

        assert isinstance(result, FileObject)
        assert result.id == "file-123"
        assert result.name == "hello.txt"
        assert result.size == 5
        assert result.purpose == "attachment"
        assert result.created_at == 1700000000

        call = self.mock_session.post.call_args
        assert call.args[0] == '/files'
        assert call.kwargs["data"] == {"purpose": FilePurposes.ATTACHMENT, "sessionId": "sess-1"}
        assert "file" in call.kwargs["files"]
        assert call.kwargs["files"]["file"][0] == "hello.txt"
        # Content-Type must be cleared so requests can generate the correct multipart boundary
        assert call.kwargs["headers"]["Content-Type"] is None

    def test_create_with_path(self):
        self._stub_response({
            "id": "file-abc",
            "name": "f.png",
            "size": 6,
            "purpose": "attachment",
            "createdAt": 1,
        })

        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            tmp.write(b"\x89PNG\r\n")
            tmp_path = tmp.name

        try:
            result = self.files.create(
                file=tmp_path,
                session_id="sess-2",
                purpose=FilePurposes.ATTACHMENT,
            )
        finally:
            os.unlink(tmp_path)

        assert result.id == "file-abc"
        call = self.mock_session.post.call_args
        assert call.kwargs["files"]["file"][0] == os.path.basename(tmp_path)

    def test_create_with_tuple(self):
        self._stub_response({
            "id": "file-xyz",
            "name": "doc.pdf",
            "size": 8,
            "purpose": "attachment",
            "createdAt": 1,
        })

        result = self.files.create(
            file=("doc.pdf", b"%PDF-1.4", "application/pdf"),
            session_id="sess-3",
        )

        assert result.id == "file-xyz"
        call = self.mock_session.post.call_args
        assert call.kwargs["files"]["file"] == ("doc.pdf", b"%PDF-1.4", "application/pdf")

    def test_create_with_explicit_filename_override(self):
        self._stub_response({
            "id": "file-1",
            "name": "custom.bin",
            "size": 3,
            "purpose": "attachment",
            "createdAt": 1,
        })

        buf = io.BytesIO(b"xyz")
        self.files.create(file=buf, session_id="s", filename="custom.bin")

        call = self.mock_session.post.call_args
        assert call.kwargs["files"]["file"][0] == "custom.bin"

    def test_create_merges_request_config(self):
        self._stub_response({
            "id": "file-rc",
            "name": "a.txt",
            "size": 1,
            "purpose": "attachment",
            "createdAt": 1,
        })

        self.files.create(
            file=io.BytesIO(b"a"),
            session_id="s",
            filename="a.txt",
            request_config={"timeout": 15, "headers": {"X-Trace": "abc"}},
        )

        call = self.mock_session.post.call_args
        assert call.kwargs["timeout"] == 15
        assert call.kwargs["headers"]["X-Trace"] == "abc"
        assert call.kwargs["headers"]["Content-Type"] is None

    def test_create_http_error(self):
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = requests.RequestException("boom")
        self.mock_session.post.return_value = mock_response

        with pytest.raises(requests.RequestException, match="boom"):
            self.files.create(file=io.BytesIO(b"x"), session_id="s", filename="x")

    def test_create_posts_to_files_endpoint(self):
        """The endpoint path must be '/files' (relative to base URL)."""
        self._stub_response({
            "id": "f", "name": "n", "size": 1, "purpose": "attachment", "createdAt": 1,
        })

        self.files.create(file=io.BytesIO(b"x"), session_id="s", filename="x")

        assert self.mock_session.post.call_args.args[0] == "/files"

    def test_create_sends_session_id_as_camel_case_in_form(self):
        """The API expects 'sessionId' (camelCase), not 'session_id'."""
        self._stub_response({
            "id": "f", "name": "n", "size": 1, "purpose": "attachment", "createdAt": 1,
        })

        self.files.create(
            file=io.BytesIO(b"x"),
            session_id="abc-123",
            filename="x",
        )

        data = self.mock_session.post.call_args.kwargs["data"]
        assert data["sessionId"] == "abc-123"
        assert "session_id" not in data

    def test_create_defaults_purpose_to_attachment(self):
        self._stub_response({
            "id": "f", "name": "n", "size": 1, "purpose": "attachment", "createdAt": 1,
        })

        self.files.create(file=io.BytesIO(b"x"), session_id="s", filename="x")

        data = self.mock_session.post.call_args.kwargs["data"]
        assert data["purpose"] == "attachment"

    def test_create_forwards_custom_purpose(self):
        self._stub_response({
            "id": "f", "name": "n", "size": 1, "purpose": "other", "createdAt": 1,
        })

        self.files.create(
            file=io.BytesIO(b"x"),
            session_id="s",
            purpose="other",
            filename="x",
        )

        data = self.mock_session.post.call_args.kwargs["data"]
        assert data["purpose"] == "other"

    def test_create_with_pathlib_path(self):
        self._stub_response({
            "id": "file-pl",
            "name": "pl.bin",
            "size": 4,
            "purpose": "attachment",
            "createdAt": 123,
        })

        with tempfile.NamedTemporaryFile(delete=False, suffix=".bin") as tmp:
            tmp.write(b"data")
            tmp_path = pathlib.Path(tmp.name)

        try:
            result = self.files.create(file=tmp_path, session_id="s")
        finally:
            os.unlink(tmp_path)

        assert result.id == "file-pl"
        call = self.mock_session.post.call_args
        assert call.kwargs["files"]["file"][0] == tmp_path.name
        assert call.kwargs["files"]["file"][1] == b"data"

    def test_create_uses_default_filename_when_not_resolvable(self):
        """If the file-like object has no name and no filename is provided,
        a generic 'file' name should be used."""
        self._stub_response({
            "id": "f", "name": "file", "size": 1, "purpose": "attachment", "createdAt": 1,
        })

        buf = io.BytesIO(b"x")
        self.files.create(file=buf, session_id="s")

        call = self.mock_session.post.call_args
        assert call.kwargs["files"]["file"][0] == "file"

    def test_create_returns_fully_populated_file_object(self):
        """Every required field from the API response is surfaced on FileObject."""
        self._stub_response({
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "photo.png",
            "size": 20480,
            "purpose": "attachment",
            "createdAt": 1700000000,
        })

        result = self.files.create(
            file=io.BytesIO(b"x"),
            session_id="s",
            filename="photo.png",
        )

        assert isinstance(result, FileObject)
        assert result.id == "550e8400-e29b-41d4-a716-446655440000"
        assert result.name == "photo.png"
        assert result.size == 20480
        assert result.purpose == "attachment"
        assert result.created_at == 1700000000

    def test_create_preserves_other_headers_while_clearing_content_type(self):
        """Custom headers in request_config should be preserved when the
        Content-Type header is cleared for multipart encoding."""
        self._stub_response({
            "id": "f", "name": "n", "size": 1, "purpose": "attachment", "createdAt": 1,
        })

        self.files.create(
            file=io.BytesIO(b"x"),
            session_id="s",
            filename="x",
            request_config={
                "headers": {
                    "X-Custom": "yes",
                    "X-Request-Id": "req-42",
                    "Content-Type": "application/json",
                }
            },
        )

        headers = self.mock_session.post.call_args.kwargs["headers"]
        assert headers["X-Custom"] == "yes"
        assert headers["X-Request-Id"] == "req-42"
        assert headers["Content-Type"] is None

    def test_create_uses_basename_when_path_contains_directories(self):
        """A filesystem path should not leak directory components into the
        multipart filename field."""
        self._stub_response({
            "id": "f", "name": "n", "size": 1, "purpose": "attachment", "createdAt": 1,
        })

        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tmp:
            tmp.write(b"hi")
            tmp_path = tmp.name

        try:
            self.files.create(file=tmp_path, session_id="s")
        finally:
            os.unlink(tmp_path)

        call = self.mock_session.post.call_args
        uploaded_name = call.kwargs["files"]["file"][0]
        assert uploaded_name == os.path.basename(tmp_path)
        assert os.sep not in uploaded_name

    def test_create_propagates_network_error(self):
        """Network errors raised before a response should bubble up."""
        self.mock_session.post.side_effect = requests.ConnectionError("no network")

        with pytest.raises(requests.ConnectionError, match="no network"):
            self.files.create(
                file=io.BytesIO(b"x"),
                session_id="s",
                filename="x",
            )

    def test_client_exposes_files_resource(self):
        """PearlClient should expose a Files resource at .files."""
        client = PearlClient(api_key="key")
        assert isinstance(client.files, Files)

    def test_end_to_end_request_hits_base_url(self):
        """Integration check: the client's request wrapper should prepend
        the base URL and the multipart request should be sent correctly."""
        client = PearlClient(
            api_key="test-key",
            base_url="https://api.example.com/api/v1",
        )

        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {
            "id": "file-int",
            "name": "a.txt",
            "size": 1,
            "purpose": "attachment",
            "createdAt": 10,
        }

        with patch.object(requests.Session, "send", return_value=mock_resp) as mocked_send:
            result = client.files.create(
                file=io.BytesIO(b"a"),
                session_id="sess",
                filename="a.txt",
            )

        assert result.id == "file-int"
        prepared = mocked_send.call_args.args[0]
        assert prepared.method == "POST"
        assert prepared.url == "https://api.example.com/api/v1/files"
        assert prepared.headers.get("Authorization") == "Bearer test-key"
        content_type = prepared.headers.get("Content-Type", "")
        assert content_type.startswith("multipart/form-data")
        body = prepared.body
        if isinstance(body, (bytes, bytearray)):
            body_str = body.decode("utf-8", errors="replace")
        else:
            body_str = str(body)
        assert 'name="file"' in body_str
        assert 'name="purpose"' in body_str
        assert "attachment" in body_str
        assert 'name="sessionId"' in body_str
        assert "sess" in body_str

    def test_create_raises_on_404(self):
        """Non-retryable HTTP errors should surface via raise_for_status."""
        mock_response = Mock()
        http_error = requests.HTTPError("404 Not Found")
        http_error.response = Mock(status_code=404)
        mock_response.raise_for_status.side_effect = http_error
        self.mock_session.post.return_value = mock_response

        with pytest.raises(requests.HTTPError):
            self.files.create(
                file=io.BytesIO(b"x"),
                session_id="s",
                filename="x",
            )
