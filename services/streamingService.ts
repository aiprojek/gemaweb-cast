import { ServerConfig, StreamingConfig } from "../types";

export class StreamingService {
  private socket: WebSocket | null = null;
  private abortController: AbortController | null = null;
  private streamWriter: WritableStreamDefaultWriter | null = null;
  private isConnected = false;
  private currentMode: 'WS' | 'HTTP' | null = null;

  async connect(server: ServerConfig, streamConfig: StreamingConfig): Promise<void> {
    this.disconnect(); // Ensure clean slate

    // --- MODE 1 & 2: WebSocket (Proxy or Cloudflare) ---
    if (streamConfig.mode === 'CLOUDFLARE' || streamConfig.mode === 'PROXY') {
      this.currentMode = 'WS';
      return this.connectWebSocket(server, streamConfig);
    } 
    
    // --- MODE 3: Direct HTTP (Experimental) ---
    else if (streamConfig.mode === 'HTTP') {
      this.currentMode = 'HTTP';
      return this.connectHTTP(server);
    }
  }

  private async connectWebSocket(server: ServerConfig, streamConfig: StreamingConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      let url = '';
      
      if (streamConfig.mode === 'CLOUDFLARE') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; 
        const params = new URLSearchParams({
          host: server.address,
          port: server.port.toString(),
          user: server.user || 'source',
          pass: server.password,
          mount: server.mount,
          type: server.type
        });
        url = `${protocol}//${host}/stream?${params.toString()}`;
      } else {
        url = streamConfig.proxyUrl;
      }

      try {
        this.socket = new WebSocket(url);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
          this.isConnected = true;
          resolve();
        };

        this.socket.onerror = (e) => {
          console.error("WebSocket Error", e);
          if (!this.isConnected) {
            reject(new Error("Failed to connect via WebSocket Proxy."));
          }
        };

        this.socket.onclose = () => {
          this.isConnected = false;
        };

      } catch (e) {
        reject(e);
      }
    });
  }

  private async connectHTTP(server: ServerConfig): Promise<void> {
    try {
      this.abortController = new AbortController();
      
      // We need to establish the connection immediately.
      // Note: In a real browser environment, fetch waits until the body is ready unless we use a ReadableStream.
      // But standard Icecast PUT expects an open stream.
      
      const protocol = 'http:'; // Browser might force https if page is https, causing Mixed Content error.
      const port = server.port;
      const host = server.address;
      const mount = server.mount.startsWith('/') ? server.mount : `/${server.mount}`;
      
      // Basic Auth
      const auth = btoa(`${server.user || 'source'}:${server.password}`);

      const headers: HeadersInit = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'audio/mpeg', // Assumption, can be changed
        'Ice-Public': '0',
        'Ice-Name': 'GemaWeb Cast',
        'User-Agent': 'GemaWebCast/1.0'
      };

      // Create a ReadableStream that we can push data into
      const stream = new ReadableStream({
        start: (controller) => {
           // We will attach the controller to our class instance so sendAudioChunk can push to it
           // However, TypeScript trickery is needed to access it outside.
           // @ts-ignore
           this.httpController = controller;
        },
        cancel: () => {
           this.disconnect();
        }
      });

      // Start the FETCH request
      // IMPORTANT: This requires the server to support CORS and the browser to support duplex: 'half'
      const targetUrl = `${protocol}//${host}:${port}${mount}`;
      
      // We don't await the fetch result fully here because it might hang waiting for stream close.
      // We start it and catch errors.
      const fetchPromise = fetch(targetUrl, {
        method: 'PUT',
        headers: headers,
        body: stream,
        signal: this.abortController.signal,
        // @ts-ignore - 'duplex' is a new property for streaming fetch
        duplex: 'half' 
      }).then(response => {
        if (!response.ok) {
           throw new Error(`Server returned ${response.status} ${response.statusText}`);
        }
        return response;
      });

      // Allow a small delay to catch immediate auth errors (CORS errors happen instantly)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      this.isConnected = true;
      console.log("HTTP Direct connection initialized");

    } catch (e) {
      this.disconnect();
      throw new Error(`Direct HTTP Failed. CORS or SSL issue likely. (${e})`);
    }
  }

  sendAudioChunk(data: Blob) {
    // WebSocket Mode
    if (this.currentMode === 'WS' && this.socket && this.socket.readyState === WebSocket.OPEN) {
      data.arrayBuffer().then(buffer => {
        if (this.socket) this.socket.send(buffer);
      });
    }

    // HTTP Mode
    if (this.currentMode === 'HTTP' && this.isConnected) {
       // @ts-ignore
       if (this.httpController) {
          data.arrayBuffer().then(buffer => {
             // @ts-ignore
             try { this.httpController.enqueue(new Uint8Array(buffer)); } catch(e) {}
          });
       }
    }
  }

  async updateMetadata(server: ServerConfig, streamConfig: StreamingConfig, title: string): Promise<void> {
    // Only works in Cloudflare mode due to CORS/Backend requirement
    if (streamConfig.mode !== 'CLOUDFLARE') {
      console.warn("Metadata update only supported in Cloudflare Mode currently.");
      return;
    }

    const host = window.location.host; 
    const params = new URLSearchParams({
      host: server.address,
      port: server.port.toString(),
      user: server.user || 'admin',
      pass: server.password,
      mount: server.mount,
      type: server.type,
      title: title
    });

    const url = `${window.location.protocol}//${host}/metadata?${params.toString()}`;
    
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unknown error');
    } catch (e) {
      console.error("Failed to update metadata", e);
      throw e;
    }
  }

  disconnect() {
    // Close WebSocket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    // Close HTTP Stream
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    // @ts-ignore
    if (this.httpController) {
       // @ts-ignore
       try { this.httpController.close(); } catch(e) {}
       // @ts-ignore
       this.httpController = null;
    }

    this.isConnected = false;
    this.currentMode = null;
  }
}

export const streamingService = new StreamingService();