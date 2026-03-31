// ─────────────────────────────────────────────────────────────────────────────
// API Fetch Wrapper — CELPIP WebTool
// All API calls go through this module. Set NEXT_PUBLIC_API_URL in .env.local.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** All v1 routes live under this prefix. */
export const API_V1 = "/api/v1";

export const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ── Custom Error ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Auth Helper ───────────────────────────────────────────────────────────────

/**
 * Build Authorization header from a Clerk JWT token.
 *
 * Usage in a React Query queryFn (inside a hook that calls useAuth()):
 *   const { getToken } = useAuth();
 *   const token = await getToken();
 *   return api.get<AppUser>(`${API_V1}/users/me`, { headers: authHeaders(token) });
 */
export function authHeaders(token: string | null | undefined): HeadersInit {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ── Core Fetch Helper ─────────────────────────────────────────────────────────

/**
 * Typed fetch wrapper. Automatically attaches JSON headers and base URL.
 * Throws ApiError on non-2xx responses.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new ApiError(response.status, `API error: ${response.statusText}`, detail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// ── Convenience Methods ────────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, init?: RequestInit): Promise<T> {
    return apiFetch<T>(path, { ...init, method: "GET" });
  },

  post<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return apiFetch<T>(path, {
      ...init,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return apiFetch<T>(path, {
      ...init,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string, init?: RequestInit): Promise<T> {
    return apiFetch<T>(path, { ...init, method: "DELETE" });
  },
};
