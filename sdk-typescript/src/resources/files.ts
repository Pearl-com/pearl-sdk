import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { FileObject, FILE_PURPOSES, FilePurpose } from '../types';

/**
 * Value types accepted for a file upload. On Node.js (18+) you can pass a
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
    private apiClient: AxiosInstance;

    constructor(apiClient: AxiosInstance) {
        this.apiClient = apiClient;
    }

    /**
     * Uploads a file to the Pearl API's /files endpoint.
     *
     * The returned `id` can be attached to a chat message via the
     * `attachments` field on `ChatMessage`.
     *
     * @param params Upload parameters including the file and its session id.
     * @param requestConfig Optional Axios request configuration.
     * @returns A Promise that resolves to the uploaded FileObject.
     * @throws AxiosError if the API call fails or a network issue occurs.
     */
    public async create(
        params: FileCreateParams,
        requestConfig?: AxiosRequestConfig
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

        const mergedConfig: AxiosRequestConfig = {
            ...(requestConfig || {}),
            headers: {
                ...(requestConfig?.headers || {}),
                'Content-Type': 'multipart/form-data'
            }
        };

        const response = await this.apiClient.post<FileObject>(
            '/files',
            formData,
            mergedConfig
        );

        return response.data;
    }

    private buildFormData(
        file: FileInput,
        filename: string | undefined,
        contentType: string | undefined
    ): FormData {
        const formData = new FormData();
        const resolvedName = filename || 'file';

        if (typeof Blob !== 'undefined' && file instanceof Blob) {
            formData.append('file', file, filename);
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
