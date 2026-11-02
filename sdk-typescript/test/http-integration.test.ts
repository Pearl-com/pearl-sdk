import { createServer, Server, IncomingHttpHeaders } from 'node:http';
import { AddressInfo } from 'node:net';
import { PearlClient } from '../src';

describe('native fetch integration', () => {
  let server: Server;
  let client: PearlClient;
  let bodyStarted: Promise<void>;
  let stalledConnectionClosed: Promise<void>;
  let notifyConnectionClosed: () => void;
  let notifyBodyStarted: () => void;
  let received: { url?: string; method?: string; headers: IncomingHttpHeaders; body: string }[];
  beforeEach(async () => {
    received = [];
    stalledConnectionClosed = new Promise(resolve => { notifyConnectionClosed = resolve; });
    bodyStarted = new Promise(resolve => { notifyBodyStarted = resolve; });
    server = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      received.push({ url: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() });
      if (req.url?.endsWith('/files') && received.length === 1) { res.writeHead(422); res.end('busy'); }
      else if (req.headers['x-delay']) {
        req.socket.once('close', notifyConnectionClosed);
        res.writeHead(200);
        res.flushHeaders();
        notifyBodyStarted();
      }
      else if (req.headers['x-disconnect']) {
        res.writeHead(200, { 'Content-Length': '1000' });
        res.write('{"partial":', () => res.destroy());
      }
      else if (req.headers['x-redirect'] && !req.url?.endsWith('/redirected')) { res.writeHead(307, { Location: '/redirected' }); res.end(); }
      else { res.writeHead(200); res.end('{"id":"ok"}'); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    client = new PearlClient('key', { baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/`, retryPolicy: { retryDelayMs: 1 } });
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  test('sends authenticated JSON and follows redirects', async () => {
    await client.chat.sendCompletion([], 'session', undefined, undefined, { headers: { 'X-Redirect': '1' } });
    expect(received[0]).toMatchObject({ url: '/api/v1/chat/completions', method: 'POST' });
    expect(received[0].headers.authorization).toBe('Bearer key');
    expect(JSON.parse(received[0].body).metadata.sessionId).toBe('session');
    expect(received[1].url).toBe('/redirected');
  });
  test('uploads real multipart bytes again after 422', async () => {
    await expect(client.files.create({ file: Buffer.from('hello upload'), sessionId: 'session', filename: 'hello.txt', contentType: 'text/plain' }, { headers: { 'Content-Type': 'wrong' } })).resolves.toEqual({ id: 'ok' });
    expect(received).toHaveLength(2);
    for (const request of received) {
      const boundary = request.headers['content-type']!.split('boundary=')[1];
      expect(boundary).toBeTruthy(); expect(request.body).toContain('--' + boundary);
      expect(request.body).toContain('hello upload'); expect(request.body).toContain('filename="hello.txt"');
      expect(request.body).toContain('name="sessionId"'); expect(request.body).toContain('text/plain');
    }
  });
  test('timeout covers a stalled response body', async () => {
    await expect(client.webhooks.register({ endpoint: 'https://example.com' }, { headers: { 'X-Delay': '1' }, timeout: 500 })).rejects.toMatchObject({ kind: 'timeout' });
    await stalledConnectionClosed;
    expect(received).toHaveLength(1);
  });
  test('caller can cancel an active request', async () => {
    const controller = new AbortController();
    const result = expect(client.webhooks.update({ endpoint: 'https://example.com' }, { headers: { 'X-Delay': '1' }, signal: controller.signal })).rejects.toMatchObject({ kind: 'aborted' });
    await bodyStarted;
    controller.abort();
    await result;
    await stalledConnectionClosed;
    expect(received[0].method).toBe('PUT');
  });
  test('handles a disconnected response body without retrying and can make another request', async () => {
    await expect(client.webhooks.register(
      { endpoint: 'https://example.com' },
      { headers: { 'X-Disconnect': '1' } },
    )).rejects.toMatchObject({ kind: 'network', cause: { name: 'TypeError', message: expect.any(String) } });
    expect(received).toHaveLength(1);

    await expect(client.webhooks.register({ endpoint: 'https://example.com' })).resolves.toBeUndefined();
    expect(received).toHaveLength(2);
  });

});
