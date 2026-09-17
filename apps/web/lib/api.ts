import { createClient } from '../utils/supabase/client';

/**
 * Custom error class representing HTTP API errors.
 */
export class ApiError extends Error {
  public status: number;
  public detail: any;

  constructor(message: string, status: number, detail?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Gets the configured API Base URL from environment or defaults to local development backend.
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

/**
 * Options for API requests extending standard RequestInit.
 */
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

/**
 * Centralized API client wrapper providing typed HTTP requests with automatic authentication token injection.
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, params, headers = {}, skipAuth = false, ...customConfig } = options;

  const baseUrl = getApiBaseUrl();
  // In HTTPS browser environments, skip insecure localhost to allow instant Supabase fallback
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseUrl.startsWith('http://')) {
    throw new ApiError('FastAPI backend unreachable over HTTP on HTTPS origin', 503);
  }

  let url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  // Append query parameters if provided
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Inject Supabase JWT session token if authentication is required
  if (!skipAuth) {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (err) {
      console.warn('Failed to retrieve authentication session for API request:', err);
    }
  }

  const config: RequestInit = {
    ...customConfig,
    headers: reqHeaders,
  };

  if (body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Execute request with backoff retry on HTTP 429
  let response: Response | null = null;
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await fetch(url, config);
    } catch (netErr: any) {
      throw new ApiError(`Network error connecting to API: ${netErr.message || 'Failed to fetch'}`, 503);
    }
    if (response.status === 429 && attempt < maxRetries) {
      const retryAfterHeader = response.headers.get('retry-after');
      const waitMs = retryAfterHeader ? Math.min(Number(retryAfterHeader) * 1000, 4000) : 1000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    let errorDetail: any = null;
    try {
      errorDetail = response ? await response.json() : null;
    } catch {
      errorDetail = response ? await response.text() : null;
    }
    const message = (errorDetail && typeof errorDetail === 'object' && errorDetail.detail)
      ? errorDetail.detail
      : `API Request failed with status ${response?.status || 'network_error'}`;
    
    throw new ApiError(message, response?.status || 500, errorDetail);
  }

  // Parse JSON if content exists
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

/**
 * API convenience helper methods.
 */
export const api = {
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
