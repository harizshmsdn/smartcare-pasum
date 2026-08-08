import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiBaseUrl, apiClient, ApiError } from '../api';

describe('API Client Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return default API base URL when environment variable is not set', () => {
    const url = getApiBaseUrl();
    expect(url).toBe('http://localhost:8000');
  });

  it('should format endpoint URLs and handle successful JSON response', async () => {
    const mockData = { success: true, message: 'OK' };
    const mockResponse = new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await apiClient('/test-endpoint', { skipAuth: true });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/test-endpoint',
      expect.objectContaining({
        method: undefined,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toEqual(mockData);
  });

  it('should append query params to endpoint URL', async () => {
    const mockResponse = new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await apiClient('/test', {
      params: { search: 'john', limit: 10 },
      skipAuth: true,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/test?search=john&limit=10',
      expect.anything()
    );
  });

  it('should throw ApiError with status and message when fetch fails', async () => {
    const errorBody = { detail: 'Unauthorized request' };
    const mockResponse = new Response(JSON.stringify(errorBody), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(apiClient('/protected', { skipAuth: true })).rejects.toThrow(ApiError);
  });
});
