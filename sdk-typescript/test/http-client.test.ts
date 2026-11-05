import { PearlClient, PearlRequestError, PearlRequestOptions } from '../src';

const send = (client: PearlClient, options: PearlRequestOptions = {}) =>
    client.chat.sendCompletion([], 'session', undefined, undefined, options);

const json = (body: string, init: ResponseInit = {}) =>
    new Response(body, { ...init, headers: { ...init.headers, 'Content-Type': 'application/json' } });

/** A fetch implementation that never settles on its own and rejects once the request signal aborts. */
const hangUntilAborted = (_url: unknown, init: RequestInit) =>
    new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });

describe('HttpClient', () => {
    let mock: jest.SpyInstance;

    beforeEach(() => {
        mock = jest.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    describe('client configuration', () => {
        test('rejects an empty API key', () => {
            expect(() => new PearlClient('')).toThrow();
        });

        test.each([0, -1, NaN, Infinity, 2_147_483_648])('rejects timeout %s when creating the client', (timeout) => {
            expect(() => new PearlClient('key', { timeout })).toThrow();
        });

        test.each(['not a url', '/relative', 'ftp://example.com'])('rejects base URL %s', (baseUrl) => {
            expect(() => new PearlClient('key', { baseUrl })).toThrow('baseUrl');
        });

        test('falls back to the default base URL when baseUrl is empty', () => {
            expect(() => new PearlClient('key', { baseUrl: '' })).not.toThrow();
        });

        test('rejects a negative maxRetries when creating the client', () => {
            expect(() => new PearlClient('key', { retryPolicy: { maxRetries: -1 } })).toThrow('maxRetries');
        });
    });

    describe('building the request', () => {
        test('sends to the default API URL with the API key as a bearer token', async () => {
            mock.mockResolvedValue(new Response('{}'));

            await send(new PearlClient('test-key'));

            const [url, init] = mock.mock.calls[0];
            expect(url).toBe('https://api.pearl.com/api/v1/chat/completions');
            expect(init.headers.get('authorization')).toBe('Bearer test-key');
        });

        const baseUrls = ['https://example.com/api/v1', 'https://example.com/api/v1/'];
        test.each(baseUrls)('builds the URL from base URL %s and applies caller headers', async (baseUrl) => {
            mock.mockResolvedValue(json('{"id":"ok"}'));
            const headers = { authorization: 'Bearer override', 'X-Trace': 'test' };

            await expect(send(new PearlClient('key', { baseUrl }), { headers })).resolves.toEqual({ id: 'ok' });

            const [url, init] = mock.mock.calls[0];
            expect(url).toBe('https://example.com/api/v1/chat/completions');
            expect(init.headers.get('authorization')).toBe('Bearer override');
            expect(init.headers.get('content-type')).toBe('application/json');
            expect(JSON.parse(init.body).metadata.sessionId).toBe('session');
            expect(headers).toEqual({ authorization: 'Bearer override', 'X-Trace': 'test' });
        });

        test.each([
            ['a Headers instance', new Headers({ 'X-Trace': 'a' })],
            ['an array of pairs', [['X-Trace', 'a']] as [string, string][]],
            ['a plain object', { 'X-Trace': 'a' }],
        ])('accepts caller headers as %s', async (_name, headers) => {
            mock.mockResolvedValue(new Response('{}'));

            await send(new PearlClient('key'), { headers });

            expect(mock.mock.calls[0][1].headers.get('x-trace')).toBe('a');
            expect(mock.mock.calls[0][1].headers.get('authorization')).toBe('Bearer key');
        });

        test('sends a JSON body with PUT when updating a webhook', async () => {
            mock.mockResolvedValue(new Response(null));

            await new PearlClient('key').webhooks.update({ endpoint: 'https://example.com/hook' });

            const [url, init] = mock.mock.calls[0];
            expect(url).toBe('https://api.pearl.com/api/v1/webhook');
            expect(init.method).toBe('PUT');
            expect(JSON.parse(init.body)).toEqual({ endpoint: 'https://example.com/hook' });
        });

        test('throws a plain TypeError for an invalid header name without sending a request', async () => {
            const error = await send(new PearlClient('key'), { headers: { 'bad name': 'x' } }).catch((e: unknown) => e);

            expect(error).toMatchObject({ name: 'TypeError' });
            expect(error).not.toBeInstanceOf(PearlRequestError);
            expect(mock).not.toHaveBeenCalled();
        });

        const invalidTimeouts = [0, NaN, Infinity, 2_147_483_648];
        test.each(invalidTimeouts)('rejects request timeout %s without sending a request', async (timeout) => {
            await expect(send(new PearlClient('key'), { timeout })).rejects.toThrow('Timeout');

            expect(mock).not.toHaveBeenCalled();
        });
    });

    describe('reading the response', () => {
        test.each([
            ['plain text', 'text/plain', 'plain text'],
            ['{"a":1}', 'text/plain', '{"a":1}'],
            ['{"a":1}', undefined, '{"a":1}'],
            ['{"a":1}', 'application/json', { a: 1 }],
            ['{"a":1}', 'Application/JSON; charset=utf-8', { a: 1 }],
            ['{"a":1}', 'application/problem+json', { a: 1 }],
            ['[1,2]', 'application/json', [1, 2]],
            ['123', 'application/json', 123],
            ['"quoted"', 'application/json', 'quoted'],
            ['{broken', 'application/json', '{broken'],
            ['', 'application/json', undefined],
            ['', 'text/plain', undefined],
        ])('reads body %j sent as %s', async (body, contentType, expected) => {
            const headers: Record<string, string> = contentType ? { 'Content-Type': contentType } : {};
            // A byte body has no default content type, unlike a string body.
            mock.mockResolvedValue(new Response(new TextEncoder().encode(body), { headers }));

            await expect(send(new PearlClient('key'))).resolves.toEqual(expected);
        });

        test.each([201, 204])('resolves with no value for HTTP %s with an empty body', async (status) => {
            mock.mockResolvedValue(new Response(null, { status }));

            await expect(
                new PearlClient('key').webhooks.register({ endpoint: 'https://example.com' }),
            ).resolves.toBeUndefined();
        });

        test('throws an http error with status, data and headers but without credentials', async () => {
            mock.mockResolvedValue(json('{"message":"bad"}', { status: 400, headers: { 'X-Trace': '123' } }));

            const error = await send(new PearlClient('secret')).catch((e: unknown) => e);

            expect(error).toBeInstanceOf(PearlRequestError);
            expect(error).toMatchObject({ kind: 'http', status: 400, data: { message: 'bad' } });
            expect((error as PearlRequestError).headers?.get('x-trace')).toBe('123');
            expect(JSON.stringify(error)).not.toContain('secret');
            expect(mock).toHaveBeenCalledTimes(1);
        });
    });

    describe('retries', () => {
        test('retries an HTTP 422 response and returns the later success', async () => {
            mock.mockResolvedValueOnce(new Response('busy', { status: 422 })).mockResolvedValueOnce(json('{}'));

            await expect(send(new PearlClient('key', { retryPolicy: { retryDelayMs: 1 } }))).resolves.toEqual({});

            expect(mock).toHaveBeenCalledTimes(2);
        });

        test.each([false, true])('retries HTTP 422 up to maxRetries only when enabled is %s', async (enabled) => {
            mock.mockImplementation(async () => new Response('busy', { status: 422 }));
            const client = new PearlClient('key', { retryPolicy: { enabled, maxRetries: 1, retryDelayMs: 1 } });

            await expect(send(client)).rejects.toMatchObject({ status: 422 });

            expect(mock).toHaveBeenCalledTimes(enabled ? 2 : 1);
        });

        test.each([401, 429, 500])('does not retry HTTP %s', async (status) => {
            mock.mockResolvedValue(new Response('error', { status }));

            await expect(send(new PearlClient('key'))).rejects.toMatchObject({ kind: 'http', status, data: 'error' });

            expect(mock).toHaveBeenCalledTimes(1);
        });

        test('does not retry a network failure', async () => {
            mock.mockRejectedValue(new TypeError('offline'));

            await expect(send(new PearlClient('key'))).rejects.toMatchObject({ kind: 'network' });

            expect(mock).toHaveBeenCalledTimes(1);
        });

        test('does not retry a timeout', async () => {
            jest.useFakeTimers();
            mock.mockImplementation(hangUntilAborted);

            const result = expect(send(new PearlClient('key'), { timeout: 10 })).rejects.toMatchObject({
                kind: 'timeout',
            });
            await jest.advanceTimersByTimeAsync(10);
            await result;

            expect(mock).toHaveBeenCalledTimes(1);
        });

        test('counts retries separately for concurrent requests', async () => {
            const attempts: Record<string, number> = {};
            mock.mockImplementation(async (_url, init) => {
                const session = JSON.parse(init.body).metadata.sessionId;
                attempts[session] = (attempts[session] || 0) + 1;
                return json('{}', { status: attempts[session] === 1 ? 422 : 200 });
            });
            const client = new PearlClient('key', { retryPolicy: { maxRetries: 1, retryDelayMs: 1 } });

            const sessions = ['a', 'b'];
            const results = await Promise.all(sessions.map((session) => client.chat.sendCompletion([], session)));

            expect(results).toEqual([{}, {}]);

            expect(attempts).toEqual({ a: 2, b: 2 });
        });

        test('removes its abort listeners after retrying with a signal attached', async () => {
            const signal = new AbortController().signal;
            const add = jest.spyOn(signal, 'addEventListener');
            const remove = jest.spyOn(signal, 'removeEventListener');
            mock.mockResolvedValueOnce(new Response('busy', { status: 422 })).mockResolvedValueOnce(json('{}'));

            const client = new PearlClient('key', { retryPolicy: { retryDelayMs: 1 } });
            await expect(send(client, { signal })).resolves.toEqual({});

            expect(mock).toHaveBeenCalledTimes(2);
            expect(add).toHaveBeenCalledTimes(3);
            for (const [, listener] of add.mock.calls) {
                expect(remove).toHaveBeenCalledWith('abort', listener);
            }
        });
    });

    describe('timeouts', () => {
        test('times out after the request timeout and clears timers', async () => {
            jest.useFakeTimers();
            mock.mockImplementation(hangUntilAborted);

            const result = expect(send(new PearlClient('key'), { timeout: 10 })).rejects.toMatchObject({
                kind: 'timeout',
            });
            await jest.advanceTimersByTimeAsync(10);
            await result;

            expect(jest.getTimerCount()).toBe(0);
        });

        test('times out after the client timeout when the request sets none', async () => {
            jest.useFakeTimers();
            mock.mockImplementation(hangUntilAborted);

            const result = expect(send(new PearlClient('key', { timeout: 20 }))).rejects.toMatchObject({
                kind: 'timeout',
            });
            await jest.advanceTimersByTimeAsync(19);
            expect(mock.mock.calls[0][1].signal.aborted).toBe(false);
            await jest.advanceTimersByTimeAsync(1);
            await result;

            expect(jest.getTimerCount()).toBe(0);
        });

        test('defaults to 30 seconds and reports an earlier caller abort as aborted', async () => {
            jest.useFakeTimers();
            let rejectRequest!: (reason: unknown) => void;
            mock.mockImplementation(
                () =>
                    new Promise((_resolve, reject) => {
                        rejectRequest = reject;
                    }),
            );
            const controller = new AbortController();

            const result = expect(send(new PearlClient('key'), { signal: controller.signal })).rejects.toMatchObject({
                kind: 'aborted',
            });
            const signal = mock.mock.calls[0][1].signal as AbortSignal;
            await jest.advanceTimersByTimeAsync(29999);
            expect(signal.aborted).toBe(false);
            controller.abort();
            await jest.advanceTimersByTimeAsync(1);
            rejectRequest(new Error('delayed abort rejection'));
            await result;

            expect(jest.getTimerCount()).toBe(0);
        });
    });

    describe('cancellation', () => {
        test('rejects without sending a request when the signal is already aborted', async () => {
            const controller = new AbortController();
            controller.abort();

            await expect(send(new PearlClient('key'), { signal: controller.signal })).rejects.toMatchObject({
                kind: 'aborted',
            });

            expect(mock).not.toHaveBeenCalled();
        });

        test('sets the signal reason as the cause when the caller aborts', async () => {
            const reason = new Error('caller gave up');
            const controller = new AbortController();
            mock.mockImplementation(hangUntilAborted);

            const result = send(new PearlClient('key'), { signal: controller.signal });
            controller.abort(reason);

            await expect(result).rejects.toMatchObject({ kind: 'aborted', cause: reason });
        });

        test('stops waiting to retry when the caller aborts', async () => {
            jest.useFakeTimers();
            mock.mockResolvedValue(new Response('busy', { status: 422 }));
            const controller = new AbortController();

            const result = expect(send(new PearlClient('key'), { signal: controller.signal })).rejects.toMatchObject({
                kind: 'aborted',
            });
            await jest.advanceTimersByTimeAsync(0);
            controller.abort();
            await result;

            expect(mock).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        });

        test('does not wait to retry when the caller aborts while the error body is being read', async () => {
            jest.useFakeTimers();
            const controller = new AbortController();
            const response = new Response('busy', { status: 422 });
            jest.spyOn(response, 'text').mockImplementation(async () => {
                controller.abort();
                return 'busy';
            });
            mock.mockResolvedValue(response);

            await expect(send(new PearlClient('key'), { signal: controller.signal })).rejects.toMatchObject({
                kind: 'aborted',
            });

            expect(mock).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        });

        test.each([200, 400])('removes timers and abort listeners after HTTP %s', async (status) => {
            jest.useFakeTimers();
            const signal = new AbortController().signal;
            const add = jest.spyOn(signal, 'addEventListener');
            const remove = jest.spyOn(signal, 'removeEventListener');
            mock.mockResolvedValue(json('{}', { status }));

            const request = send(new PearlClient('key'), { signal });
            if (status === 200) {
                await expect(request).resolves.toEqual({});
            } else {
                await expect(request).rejects.toMatchObject({ status });
            }

            expect(remove).toHaveBeenCalledWith('abort', add.mock.calls[0][1]);
            expect(jest.getTimerCount()).toBe(0);
        });

        test('removes the listener from the original signal when options.signal is replaced', async () => {
            const original = new AbortController();
            const replacement = new AbortController();
            const add = jest.spyOn(original.signal, 'addEventListener');
            const remove = jest.spyOn(original.signal, 'removeEventListener');
            const removeReplacement = jest.spyOn(replacement.signal, 'removeEventListener');
            const options: PearlRequestOptions = { signal: original.signal };
            mock.mockImplementation(hangUntilAborted);

            const result = expect(send(new PearlClient('key'), options)).rejects.toMatchObject({ kind: 'aborted' });
            options.signal = replacement.signal;
            original.abort();
            await result;

            expect(remove).toHaveBeenCalledWith('abort', add.mock.calls[0][1]);
            expect(removeReplacement).not.toHaveBeenCalled();
        });
    });
});
