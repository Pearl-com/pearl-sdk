import { HttpClient, PearlRequestOptions } from '../src/core/HttpClient';
import { PearlError } from '../src/core/PearlError';
import { File as NodeFile } from 'node:buffer';
import { Files } from '../src/resources/files';
import { FILE_PURPOSES, FileObject } from '../src/types';

const mockHttpClient = { post: jest.fn(), put: jest.fn() } as unknown as jest.Mocked<HttpClient>;

describe('Files', () => {
    let files: Files;

    beforeEach(() => {
        jest.clearAllMocks();
        files = new Files(mockHttpClient);
    });

    test('constructor initializes with the provided apiClient', () => {
        expect(files['apiClient']).toBe(mockHttpClient);
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
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            const result = await files.create({
                file: Buffer.from('hello'),
                sessionId: 'sess-1',
                filename: 'hello.txt'
            });

            expect(result).toEqual(mockFileObject);
            expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

            const [url, body, config] = mockHttpClient.post.mock.calls[0];
            expect(url).toBe('/files');
            expect(body).toBeInstanceOf(FormData);

            const form = body as FormData;
            expect(form.get('purpose')).toBe(FILE_PURPOSES.ATTACHMENT);
            expect(form.get('sessionId')).toBe('sess-1');
            const uploadedFile = form.get('file');
            expect(uploadedFile).toBeInstanceOf(Blob);
            expect((uploadedFile as File).name).toBe('hello.txt');

            expect(config).toBeUndefined();
        });

        test('uploads a Blob and forwards explicit purpose', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            const blob = new Blob(['hi'], { type: 'text/plain' });
            await files.create({
                file: blob,
                sessionId: 'sess-2',
                purpose: 'attachment',
                filename: 'custom.txt'
            });

            const [, body] = mockHttpClient.post.mock.calls[0];
            const form = body as FormData;
            expect(form.get('purpose')).toBe('attachment');
            expect(form.get('sessionId')).toBe('sess-2');
            const uploaded = form.get('file') as File;
            expect(uploaded.name).toBe('custom.txt');
        });

        test('forwards request options to the transport', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            await files.create(
                { file: Buffer.from('x'), sessionId: 's', filename: 'x.bin' },
                { headers: { 'X-Trace': 'abc' }, timeout: 123 }
            );

            const [, , config] = mockHttpClient.post.mock.calls[0];
            const options = config as PearlRequestOptions;
            expect(options.timeout).toBe(123);
            expect(options.headers).toMatchObject({
                'X-Trace': 'abc'
            });
        });

        test('propagates errors from apiClient.post', async () => {
            const err = new Error('boom');
            mockHttpClient.post.mockRejectedValueOnce(err);

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
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            const data = new Uint8Array([1, 2, 3, 4]);
            await files.create({
                file: data,
                sessionId: 's',
                filename: 'bytes.bin',
                contentType: 'application/octet-stream'
            });

            const [, body] = mockHttpClient.post.mock.calls[0];
            const form = body as FormData;
            const uploaded = form.get('file') as File;
            expect(uploaded).toBeInstanceOf(Blob);
            expect(uploaded.name).toBe('bytes.bin');
            expect(uploaded.type).toBe('application/octet-stream');
            expect(uploaded.size).toBe(4);
        });

        test('preserves a File name when no filename override is supplied', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);
            const file = new NodeFile(['hello'], 'original.txt', { type: 'text/plain' });
            await files.create({ file: file as unknown as Blob, sessionId: 's' });
            const form = mockHttpClient.post.mock.calls[0][1] as FormData;
            expect((form.get('file') as File).name).toBe('original.txt');
        });

        test('uploads an ArrayBuffer', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            const buffer = new Uint8Array([9, 8, 7]).buffer;
            await files.create({
                file: buffer,
                sessionId: 's',
                filename: 'ab.bin'
            });

            const [, body] = mockHttpClient.post.mock.calls[0];
            const form = body as FormData;
            const uploaded = form.get('file') as File;
            expect(uploaded).toBeInstanceOf(Blob);
            expect(uploaded.size).toBe(3);
        });

        test('posts to /files endpoint', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            await files.create({ file: Buffer.from('x'), sessionId: 's', filename: 'x' });

            expect(mockHttpClient.post.mock.calls[0][0]).toBe('/files');
        });

        test('sends sessionId as camelCase form field, not session_id', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            await files.create({
                file: Buffer.from('x'),
                sessionId: 'abc-123',
                filename: 'x'
            });

            const [, body] = mockHttpClient.post.mock.calls[0];
            const form = body as FormData;
            expect(form.get('sessionId')).toBe('abc-123');
            expect(form.get('session_id')).toBeNull();
        });

        test('defaults purpose to attachment when omitted', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            await files.create({ file: Buffer.from('x'), sessionId: 's', filename: 'x' });

            const [, body] = mockHttpClient.post.mock.calls[0];
            const form = body as FormData;
            expect(form.get('purpose')).toBe('attachment');
        });

        test('forwards an arbitrary purpose string unchanged', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            await files.create({
                file: Buffer.from('x'),
                sessionId: 's',
                purpose: 'custom-purpose',
                filename: 'x'
            });

            const [, body] = mockHttpClient.post.mock.calls[0];
            const form = body as FormData;
            expect(form.get('purpose')).toBe('custom-purpose');
        });

        test('uses default filename "file" when none provided for a Buffer', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            await files.create({ file: Buffer.from('x'), sessionId: 's' });

            const [, body] = mockHttpClient.post.mock.calls[0];
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
            mockHttpClient.post.mockResolvedValueOnce(serverResponse);

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

        test('does not mutate the caller-provided options', async () => {
            mockHttpClient.post.mockResolvedValueOnce(mockFileObject);

            const userOptions: PearlRequestOptions = {
                headers: { 'X-Trace': 'abc' },
                timeout: 5000
            };
            const userOptionsSnapshot = JSON.parse(JSON.stringify(userOptions));

            await files.create(
                { file: Buffer.from('x'), sessionId: 's', filename: 'x' },
                userOptions
            );

            expect(userOptions).toEqual(userOptionsSnapshot);
        });

        test('propagates HTTP errors with response data', async () => {
            const data = { Error: { message: 'Invalid file', code: 'bad_request' } };
            const httpErr = new PearlError('Invalid file', 'http', { status: 400, data });
            mockHttpClient.post.mockRejectedValueOnce(httpErr);

            await expect(
                files.create({ file: Buffer.from('x'), sessionId: 's', filename: 'x' })
            ).rejects.toMatchObject({
                kind: 'http', status: 400, data
            });
        });
    });
});
