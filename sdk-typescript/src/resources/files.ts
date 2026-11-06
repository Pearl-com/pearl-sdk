import { HttpClient, PearlRequestOptions } from '../core/HttpClient';
import { FileObject, FILE_PURPOSES, FilePurpose } from '../types';

/**
 * Value types accepted for a file upload. On Node.js (20+) you can pass a
 * `Buffer`, `Uint8Array`, `ArrayBuffer`, or a `Blob`. In the browser,
 * `Blob` or `File` instances are supported.
 */
export type FileInput = Buffer | Blob | ArrayBuffer | Uint8Array;

/**
 * Parameters for uploading a file via `client.files.create`.
 */
export interface FileCreateParams {
    /** The file to upload. */
    file: FileInput;
    /** The chat session identifier the file is associated with. */
    sessionId: string;
    /** The purpose of the file (defaults to "attachment"). */
    purpose?: FilePurpose | string;
    /** Optional filename. Used when `file` has no inherent name. */
    filename?: string;
    /** Optional MIME type for the uploaded content. */
    contentType?: string;
}

/**
 * Manages file-related operations, structured under `client.files`.
 *
 * Supports uploading files (such as images or documents) that can be
 * attached to chat conversations for use by the Assistant or Expert.
 */
export class Files {
    private apiClient: HttpClient;

    constructor(apiClient: HttpClient) {
        this.apiClient = apiClient;
    }

    /**
     * Uploads a file to the Pearl API's /files endpoint.
     *
     * The returned `id` can be attached to a chat message via the
     * `attachments` field on `ChatMessage`.
     *
     * @param params Upload parameters including the file and its session id.
     * @param options Optional request options (headers, timeout, signal).
     * @returns A Promise that resolves to the uploaded FileObject.
     * @throws PearlRequestError if the request fails (HTTP error, network failure, timeout or abort).
     */
    public async create(
        params: FileCreateParams,
        options?: PearlRequestOptions
    ): Promise<FileObject> {
        const {
            file,
            sessionId,
            purpose = FILE_PURPOSES.ATTACHMENT,
            filename,
            contentType
        } = params;

        const formData = this.buildFormData(file, filename, contentType);
        formData.append('purpose', String(purpose));
        formData.append('sessionId', sessionId);

        return this.apiClient.post<FileObject>('/files', formData, options);
    }

    private buildFormData(
        file: FileInput,
        filename: string | undefined,
        contentType: string | undefined
    ): FormData {
        const formData = new FormData();
        const resolvedName = filename || 'file';

        if (typeof Blob !== 'undefined' && file instanceof Blob) {
            if (filename === undefined) {
                formData.append('file', file);
            } else {
                formData.append('file', file, filename);
            }
            return formData;
        }

        if (file instanceof ArrayBuffer || ArrayBuffer.isView(file)) {
            const blob = new Blob(
                [file as BlobPart],
                contentType ? { type: contentType } : undefined
            );
            formData.append('file', blob, resolvedName);
            return formData;
        }

        throw new TypeError(
            'Unsupported file type for upload. Expected Blob, Buffer, Uint8Array, or ArrayBuffer.'
        );
    }
}
