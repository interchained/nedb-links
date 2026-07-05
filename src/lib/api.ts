/**
 * Editor API client — one tiny fetch layer, shared by every page.
 *
 * The admin token (v0.1 auth) lives in localStorage; ApiError carries
 * the status so pages can route 401s to the token gate instead of
 * showing a dead end.
 */

export const TOKEN_KEY = "links-admin-token";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — requests proceed unauthenticated */
  }
}

export function adminHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...adminHeaders(),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export function getJson<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function postJson<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function putJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

/** POST a draft manifest, get back the real renderer's HTML. */
export async function fetchPreviewHtml(draft: unknown): Promise<string> {
  const res = await fetch("/api/preview", {
    method: "POST",
    headers: { "content-type": "application/json", ...adminHeaders() },
    body: JSON.stringify(draft),
  });
  if (!res.ok) {
    let message = `${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return res.text();
}
