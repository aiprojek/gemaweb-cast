// Function to proxy metadata updates to Icecast/Shoutcast admin interfaces
// This circumvents CORS issues by performing the request server-side.

// Define Cloudflare specific types locally
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

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  
  // Params
  const host = url.searchParams.get('host');
  const port = url.searchParams.get('port');
  const user = url.searchParams.get('user') || 'admin'; // Default admin user
  const pass = url.searchParams.get('pass');
  const mount = url.searchParams.get('mount') || '/stream';
  const type = url.searchParams.get('type') || 'Icecast';
  const title = url.searchParams.get('title');

  if (!host || !port || !pass || !title) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
    });
  }

  let updateUrl = '';
  let authHeader = '';

  if (type === 'Shoutcast') {
    // Shoutcast v1/v2 Admin CGI
    // http://host:port/admin.cgi?mode=updinfo&pass=password&song=Title
    // Shoutcast often uses 'admin' as user for v2, or just pass for v1
    updateUrl = `http://${host}:${port}/admin.cgi?mode=updinfo&pass=${encodeURIComponent(pass)}&song=${encodeURIComponent(title)}`;
    // Some shoutcast servers need Basic Auth too
    authHeader = 'Basic ' + btoa(`admin:${pass}`);
  } else {
    // Icecast Admin
    // http://host:port/admin/metadata?mode=updinfo&mount=/stream&song=Title
    updateUrl = `http://${host}:${port}/admin/metadata?mode=updinfo&mount=${encodeURIComponent(mount)}&song=${encodeURIComponent(title)}`;
    authHeader = 'Basic ' + btoa(`${user}:${pass}`);
  }

  try {
    const response = await fetch(updateUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'GemaWebCast/1.0'
      }
    });

    if (response.ok || response.status === 200) {
       return new Response(JSON.stringify({ success: true, message: 'Metadata updated' }), {
         headers: { 'Content-Type': 'application/json' }
       });
    } else {
       const text = await response.text();
       return new Response(JSON.stringify({ error: 'Server rejected update', details: text }), { 
         status: response.status,
         headers: { 'Content-Type': 'application/json' }
       });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to connect to radio server', details: err.message }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
    });
  }
};