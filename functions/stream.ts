// @ts-ignore
import { connect } from 'cloudflare:sockets';

// Define Cloudflare specific types that are missing in the standard environment
type PagesFunction<Env = unknown, Params extends string = any, Data extends Record<string, unknown> = Record<string, unknown>> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;

interface EventContext<Env, Params extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Params;
  data: Data;
}

// Declaring WebSocketPair as it is available in the global scope of Cloudflare Workers
declare const WebSocketPair: {
  new (): {
    0: WebSocket;
    1: WebSocket;
  };
};

interface Env {}

export const onRequest: PagesFunction<Env> = async (context) => {
  const upgradeHeader = context.request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  // Parse Query Params to get destination
  const url = new URL(context.request.url);
  const targetHost = url.searchParams.get('host');
  const targetPort = parseInt(url.searchParams.get('port') || '8000');
  const user = url.searchParams.get('user') || 'source';
  const pass = url.searchParams.get('pass') || '';
  const mount = url.searchParams.get('mount') || '/stream';
  const type = url.searchParams.get('type') || 'Icecast';

  if (!targetHost || !targetPort) {
    return new Response('Missing host or port', { status: 400 });
  }

  // Setup WebSocket pair
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair) as unknown as [WebSocket, WebSocket & { accept: () => void }];

  // Handle the TCP connection in the background
  server.accept();

  // We do not await this, we let it run
  handleSession(server, targetHost, targetPort, user, pass, mount, type);

  return new Response(null, {
    status: 101,
    webSocket: client,
  } as ResponseInit & { webSocket: WebSocket });
};

async function handleSession(
  webSocket: WebSocket, 
  host: string, 
  port: number, 
  user: string, 
  pass: string, 
  mount: string, 
  type: string
) {
  let tcpSocket: any = null;
  let writer: any = null;

  try {
    // 1. Connect to Radio Server via TCP
    tcpSocket = connect({ hostname: host, port: port });
    writer = tcpSocket.writable.getWriter();

    // 2. Perform Handshake based on Protocol
    let handshake = '';
    
    if (type === 'Shoutcast') {
      // Shoutcast v1 Source Protocol: Just password + newline
      handshake = `${pass}\n`;
    } else {
      // Icecast / Shoutcast v2 Source Protocol (HTTP PUT)
      // Note: Minimal headers. Content-Type usually defaults to audio/mpeg or defined by client.
      const auth = btoa(`${user}:${pass}`);
      handshake = `PUT ${mount} HTTP/1.1\r\n` +
                  `Host: ${host}\r\n` +
                  `Authorization: Basic ${auth}\r\n` +
                  `User-Agent: GemaWebCast/1.0\r\n` +
                  `Content-Type: audio/mpeg\r\n` +
                  `Ice-Public: 0\r\n` +
                  `Ice-Name: GemaWeb Live\r\n` + 
                  `Transfer-Encoding: chunked\r\n` + 
                  `Expect: 100-continue\r\n` + 
                  `\r\n`;
    }

    const encoder = new TextEncoder();
    await writer.write(encoder.encode(handshake));

    // 3. Pipe WebSocket messages (Audio Chunks) to TCP Socket
    webSocket.addEventListener('message', async (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
           // Icecast with Transfer-Encoding: chunked requires chunk size in hex first
           // However, simple Icecast PUT often accepts raw stream if not chunked. 
           // For simplicity in this worker, we assume raw streaming or handle basic piping.
           // If 'Transfer-Encoding: chunked' is used above, we must wrap frames.
           
           const data = new Uint8Array(event.data);
           
           if (type !== 'Shoutcast') {
             // Wrap in HTTP Chunk format
             const hexSize = data.length.toString(16);
             await writer.write(encoder.encode(`${hexSize}\r\n`));
             await writer.write(data);
             await writer.write(encoder.encode(`\r\n`));
           } else {
             // Shoutcast Raw
             await writer.write(data);
           }
        }
      } catch (err) {
        console.error('Write Error:', err);
        webSocket.close();
      }
    });

    webSocket.addEventListener('close', () => {
      try { tcpSocket.close(); } catch(e) {}
    });

    // 4. Read response from TCP (optional, to check for 200 OK)
    // For a simple streamer, we might ignore inbound except to keep connection alive or debug
    const reader = tcpSocket.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // We could log server response here
      // const decoded = new TextDecoder().decode(value);
      // console.log("Server says:", decoded);
    }

  } catch (error) {
    console.error("Streaming Session Error:", error);
    webSocket.close(1011, "Upstream Error");
  } finally {
    if (writer) writer.releaseLock();
    if (tcpSocket) tcpSocket.close();
  }
}