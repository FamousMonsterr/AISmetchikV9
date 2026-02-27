export type BackendApiClientOptions = {
  baseUrl?: string;
  accessToken?: string;
};

export class BackendApiClient {
  private readonly baseUrl: string;
  private readonly accessToken?: string;

  constructor(options: BackendApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl || '').replace(/\/$/, '');
    this.accessToken = options.accessToken;
  }

  private buildUrl(path: string): string {
    if (!this.baseUrl) return path;
    return `${this.baseUrl}${path}`;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers || {});
    headers.set('Content-Type', 'application/json');
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const response = await fetch(this.buildUrl(path), {
      ...init,
      headers,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `Request failed: ${response.status}`);
    }
    return payload as T;
  }

  login(input: { email: string; password: string }) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; displayName: string; role: string; plan: string };
    }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) });
  }

  refresh(refreshToken: string) {
    return this.request<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  me() {
    return this.request<{ id: string; email: string; displayName: string; role: string; plan: string }>('/api/v1/auth/me');
  }

  createAnalysisJob(input: {
    projectId: string;
    fileUri: string;
    fileSha1: string;
    fileName: string;
    mimeType: string;
    objectKey?: string;
    model: string;
    temperature?: number;
    includeThoughts?: boolean;
  }) {
    return this.request<{ success: boolean; jobId: string; status: string; enqueued: boolean }>('/api/v1/analysis/jobs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getAnalysisJob(jobId: string) {
    return this.request<any>(`/api/v1/analysis/jobs/${encodeURIComponent(jobId)}`);
  }

  cancelAnalysisJob(jobId: string) {
    return this.request<{ success: boolean }>(`/api/v1/analysis/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    });
  }
}
