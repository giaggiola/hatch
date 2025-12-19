import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const COOKIE_NAME = 'auth_token';

// Headers to forward from backend to client (for caching)
const CACHE_HEADERS = ['cache-control', 'etag', 'last-modified', 'vary'];

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathname = `/api/${path.join('/')}`;
  const url = new URL(pathname, BACKEND_URL);

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Get auth token from cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth header if we have a token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Forward the request body for non-GET requests
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // No body
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: body || undefined,
    });

    // Get response data
    const contentType = response.headers.get('content-type');
    let data: unknown;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Build response headers - forward cache headers from backend
    const responseHeaders: Record<string, string> = {};

    if (contentType) {
      responseHeaders['Content-Type'] = contentType;
    }

    // Forward cache-related headers from backend
    for (const header of CACHE_HEADERS) {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders[header] = value;
      }
    }

    // Return response with same status and forwarded headers
    if (typeof data === 'string') {
      return new NextResponse(data, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Backend unavailable' },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
