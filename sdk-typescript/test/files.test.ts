import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Files } from '../src/resources/files';
import { FILE_PURPOSES, FileObject } from '../src/types';

const mockAxiosInstance: jest.Mocked<AxiosInstance> = {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    patch: jest.fn(),
    isAxiosError: jest.fn(),
    Axios: jest.fn(),
    getUri: jest.fn(),
    defaults: {},
    interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() }
    }
} as unknown as jest.Mocked<AxiosInstance>;

describe('Files', () => {
    let files: Files;

    beforeEach(() => {
        jest.clearAllMocks();
        files = new Files(mockAxiosInstance);
    });

    test('constructor initializes with the provided apiClient', () => {
        expect(files['apiClient']).toBe(mockAxiosInstance);
    });

    describe('create', () => {
        const mockFileObject: FileObject = {
            id: 'file-123',
            name: 'hello.txt',
            size: 5,
            purpose: 'attachment',
            createdAt: 1700000000
        };

        test('uploads a Buffer and defaults purpose to attachment', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            const result = await files.create({
                file: Buffer.from('hello'),
                sessionId: 'sess-1',
                filename: 'hello.txt'
            });

            expect(result).toEqual(mockFileObject);
            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);

            const [url, body, config] = mockAxiosInstance.post.mock.calls[0];
            expect(url).toBe('/files');
            expect(body).toBeInstanceOf(FormData);

            const form = body as FormData;
            expect(form.get('purpose')).toBe(FILE_PURPOSES.ATTACHMENT);
            expect(form.get('sessionId')).toBe('sess-1');
            const uploadedFile = form.get('file');
            expect(uploadedFile).toBeInstanceOf(Blob);
            expect((uploadedFile as File).name).toBe('hello.txt');

            expect((config as AxiosRequestConfig).headers).toMatchObject({
                'Content-Type': 'multipart/form-data'
            });
        });

        test('uploads a Blob and forwards explicit purpose', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            const blob = new Blob(['hi'], { type: 'text/plain' });
            await files.create({
                file: blob,
                sessionId: 'sess-2',
                purpose: 'attachment',
                filename: 'custom.txt'
            });

            const [, body] = mockAxiosInstance.post.mock.calls[0];
            const form = body as FormData;
            expect(form.get('purpose')).toBe('attachment');
            expect(form.get('sessionId')).toBe('sess-2');
            const uploaded = form.get('file') as File;
            expect(uploaded.name).toBe('custom.txt');
        });

        test('merges requestConfig headers with multipart Content-Type', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            await files.create(
                { file: Buffer.from('x'), sessionId: 's', filename: 'x.bin' },
                { headers: { 'X-Trace': 'abc' }, timeout: 123 }
            );

            const [, , config] = mockAxiosInstance.post.mock.calls[0];
            const cfg = config as AxiosRequestConfig;
            expect(cfg.timeout).toBe(123);
            expect(cfg.headers).toMatchObject({
                'X-Trace': 'abc',
                'Content-Type': 'multipart/form-data'
            });
        });

        test('propagates errors from apiClient.post', async () => {
            const err = new Error('boom');
            mockAxiosInstance.post.mockRejectedValueOnce(err);

            await expect(
                files.create({ file: Buffer.from('x'), sessionId: 's', filename: 'x' })
            ).rejects.toBe(err);
        });

        test('throws TypeError for unsupported file types', async () => {
            await expect(
                files.create({ file: 'not-a-file' as any, sessionId: 's' })
            ).rejects.toBeInstanceOf(TypeError);
        });

        test('uploads a Uint8Array and applies contentType on the Blob', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            const data = new Uint8Array([1, 2, 3, 4]);
            await files.create({
                file: data,
                sessionId: 's',
                filename: 'bytes.bin',
                contentType: 'application/octet-stream'
            });

            const [, body] = mockAxiosInstance.post.mock.calls[0];
            const form = body as FormData;
            const uploaded = form.get('file') as File;
            expect(uploaded).toBeInstanceOf(Blob);
            expect(uploaded.name).toBe('bytes.bin');
            expect(uploaded.type).toBe('application/octet-stream');
            expect(uploaded.size).toBe(4);
        });

        test('uploads an ArrayBuffer', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            const buffer = new Uint8Array([9, 8, 7]).buffer;
            await files.create({
                file: buffer,
                sessionId: 's',
                filename: 'ab.bin'
            });

            const [, body] = mockAxiosInstance.post.mock.calls[0];
            const form = body as FormData;
            const uploaded = form.get('file') as File;
            expect(uploaded).toBeInstanceOf(Blob);
            expect(uploaded.size).toBe(3);
        });

        test('posts to /files endpoint', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            await files.create({ file: Buffer.from('x'), sessionId: 's', filename: 'x' });

            expect(mockAxiosInstance.post.mock.calls[0][0]).toBe('/files');
        });

        test('sends sessionId as camelCase form field, not session_id', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            await files.create({
                file: Buffer.from('x'),
                sessionId: 'abc-123',
                filename: 'x'
            });

            const [, body] = mockAxiosInstance.post.mock.calls[0];
            const form = body as FormData;
            expect(form.get('sessionId')).toBe('abc-123');
            expect(form.get('session_id')).toBeNull();
        });

        test('defaults purpose to attachment when omitted', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            await files.create({ file: Buffer.from('x'), sessionId: 's', filename: 'x' });

            const [, body] = mockAxiosInstance.post.mock.calls[0];
            const form = body as FormData;
            expect(form.get('purpose')).toBe('attachment');
        });

        test('forwards an arbitrary purpose string unchanged', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            await files.create({
                file: Buffer.from('x'),
                sessionId: 's',
                purpose: 'custom-purpose',
                filename: 'x'
            });

            const [, body] = mockAxiosInstance.post.mock.calls[0];
            const form = body as FormData;
            expect(form.get('purpose')).toBe('custom-purpose');
        });

        test('uses default filename "file" when none provided for a Buffer', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            await files.create({ file: Buffer.from('x'), sessionId: 's' });

            const [, body] = mockAxiosInstance.post.mock.calls[0];
            const form = body as FormData;
            const uploaded = form.get('file') as File;
            expect(uploaded.name).toBe('file');
        });

        test('returns the fully populated FileObject from the API', async () => {
            const serverResponse: FileObject = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'photo.png',
                size: 20480,
                purpose: 'attachment',
                createdAt: 1700000000
            };
            mockAxiosInstance.post.mockResolvedValueOnce({ data: serverResponse });

            const result = await files.create({
                file: Buffer.from('content'),
                sessionId: 's',
                filename: 'photo.png'
            });

            expect(result).toEqual(serverResponse);
            expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
            expect(result.name).toBe('photo.png');
            expect(result.size).toBe(20480);
            expect(result.purpose).toBe('attachment');
            expect(result.createdAt).toBe(1700000000);
        });

        test('does not mutate the caller-provided requestConfig', async () => {
            mockAxiosInstance.post.mockResolvedValueOnce({ data: mockFileObject });

            const userConfig: AxiosRequestConfig = {
                headers: { 'X-Trace': 'abc' },
                timeout: 5000
            };
            const userConfigSnapshot = JSON.parse(JSON.stringify(userConfig));

            await files.create(
                { file: Buffer.from('x'), sessionId: 's', filename: 'x' },
                userConfig
            );

            expect(userConfig).toEqual(userConfigSnapshot);
        });

        test('propagates axios errors with response data', async () => {
            const axiosErr: any = new Error('Request failed with status code 400');
            axiosErr.response = {
                status: 400,
                data: { Error: { message: 'Invalid file', code: 'bad_request' } }
            };
            mockAxiosInstance.post.mockRejectedValueOnce(axiosErr);

            await expect(
                files.create({ file: Buffer.from('x'), sessionId: 's', filename: 'x' })
            ).rejects.toMatchObject({
                response: { status: 400 }
            });
        });
    });
});
