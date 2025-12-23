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
    // Note: Cloudflare Workers allows TCP connections to many ports, but not all. 
    // Standard ports (80, 443, 8000, 8080) usually work.
    tcpSocket = connect({ hostname: host, port: port });
    writer = tcpSocket.writable.getWriter();

    // 2. Perform Handshake based on Protocol
    let handshake = '';
    
    // Use a robust User-Agent like BUTT to ensure compatibility
    const userAgent = 'butt/0.1.34'; 

    if (type === 'Shoutcast') {
      // Shoutcast v1 Source Protocol: Just password + CRLF (Crucial fix: \r\n instead of \n)
      handshake = `${pass}\r\n`;
    } else {
      // Icecast / Shoutcast v2 Source Protocol (HTTP PUT)
      // Note: Shoutcast v2 works best with this mode if you treat it as Icecast.
      const auth = btoa(`${user}:${pass}`);
      handshake = `PUT ${mount} HTTP/1.1\r\n` +
                  `Host: ${host}\r\n` +
                  `Authorization: Basic ${auth}\r\n` +
                  `User-Agent: ${userAgent}\r\n` +
                  `Content-Type: audio/mpeg\r\n` +
                  `Ice-Public: 1\r\n` +
                  `Ice-Name: GemaWeb Live\r\n` + 
                  `Expect: 100-continue\r\n` + 
                  `\r\n`;
    }

    const encoder = new TextEncoder();
    await writer.write(encoder.encode(handshake));

    // 3. Pipe WebSocket messages (Audio Chunks) to TCP Socket
    webSocket.addEventListener('message', async (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
           const data = new Uint8Array(event.data);
           // Stream Raw Data
           await writer.write(data);
        }
      } catch (err) {
        // Silently fail on write error, will be caught by close
        webSocket.close();
      }
    });

    // 4. Handle Closure
    webSocket.addEventListener('close', () => {
      try { tcpSocket.close(); } catch(e) {}
    });

    // 5. Read response from TCP to detect Auth Failure immediately
    const reader = tcpSocket.readable.getReader();
    const decoder = new TextDecoder();
    
    (async () => {
      try {
        // Read the first chunk which usually contains the headers/auth response
        const { done, value } = await reader.read();
        if (!done && value) {
            const responseText = decoder.decode(value);
            // Check for common error codes
            if (responseText.includes('401') || responseText.includes('Forbidden') || responseText.includes('ICV')) {
                console.error("Upstream Auth Failed:", responseText);
                webSocket.close(1008, "Authentication Failed"); // 1008 = Policy Violation
                return;
            }
        }
        
        // Continue reading to keep socket alive (drain)
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch (e) {
        // TCP Error
        webSocket.close(1011, "Upstream Connection Error");
      }
    })();

  } catch (error) {
    console.error("Streaming Session Error:", error);
    webSocket.close(1011, "Upstream Error");
  } finally {
    if (writer) writer.releaseLock();
  }
}