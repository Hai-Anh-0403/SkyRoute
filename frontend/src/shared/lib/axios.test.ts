import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, configureAuthInterceptors } from './axios';

function createAxiosError(
  status: number,
  config: InternalAxiosRequestConfig,
): AxiosError {
  return new AxiosError(
    `Request failed with status ${status}`,
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    {
      status,
      statusText: status === 401 ? 'Unauthorized' : 'Error',
      headers: {},
      config,
      data: { success: false, error: { code: 'AUTH_002', message: 'Expired' } },
    },
  );
}

describe('apiClient auth interceptors', () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('attaches Bearer token, refreshes once on 401, and retries original request', async () => {
    let currentToken: string | null = 'expired.token';
    const onTokenRefreshed = vi.fn(
      (payload: { user: unknown; accessToken: string }) => {
        currentToken = payload.accessToken;
      },
    );
    const onAuthFailed = vi.fn();

    configureAuthInterceptors({
      getAccessToken: () => currentToken,
      onTokenRefreshed,
      onAuthFailed,
    });

    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      if (config.url === '/auth/refresh') {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            success: true,
            data: {
              user: { id: '1', email: 'a@b.com', fullName: 'A' },
              accessToken: 'fresh.token',
            },
          },
        };
      }

      if (config.headers?.Authorization === 'Bearer expired.token') {
        throw createAxiosError(401, config);
      }

      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { success: true, data: { items: ['ok'] } },
      };
    });

    apiClient.defaults.adapter = adapter;

    const response = await apiClient.get('/trips');

    expect(response.data).toEqual({ success: true, data: { items: ['ok'] } });
    expect(onTokenRefreshed).toHaveBeenCalledTimes(1);
    expect(onAuthFailed).not.toHaveBeenCalled();

    const refreshCalls = adapter.mock.calls.filter(
      ([cfg]) => cfg.url === '/auth/refresh',
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('does NOT trigger token refresh when /auth/login returns 401', async () => {
    const onTokenRefreshed = vi.fn();
    const onAuthFailed = vi.fn();

    configureAuthInterceptors({
      getAccessToken: () => null,
      onTokenRefreshed,
      onAuthFailed,
    });

    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      throw createAxiosError(401, config);
    });
    apiClient.defaults.adapter = adapter;

    await expect(
      apiClient.post('/auth/login', { email: 'a@b.com', password: 'bad' }),
    ).rejects.toBeInstanceOf(AxiosError);

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(onTokenRefreshed).not.toHaveBeenCalled();
    expect(onAuthFailed).not.toHaveBeenCalled();
  });
});
