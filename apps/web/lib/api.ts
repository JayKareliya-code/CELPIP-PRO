// ─────────────────────────────────────────────────────────────────────────────
// API Fetch Wrapper — CELPIP WebTool
// All API calls go through this module. Set NEXT_PUBLIC_API_URL in .env.local.
// ─────────────────────────────────────────────────────────────────────────────

/** Base URL for all API calls. Import this instead of reading the env var locally. */
export const API_BASE_URL =
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

/**
 * Returns the user's current local date as YYYY-MM-DD.
 * Sent as X-User-Date on every request so the backend can compute
 * streak logic against the user's calendar day, not the server's UTC date.
 */
export function localDateHeader(): HeadersInit {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");
  return { "X-User-Date": `${yyyy}-${mm}-${dd}` };
}

/**
 * Generate a short correlation ID for the request.
 * Uses crypto.randomUUID() when available (all modern browsers + Node 19+);
 * falls back to a simple timestamp+random string for older environments.
 */
function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Core Fetch Helper ─────────────────────────────────────────────────────────

/**
 * Typed fetch wrapper. Automatically attaches JSON headers and base URL.
 * Throws ApiError on non-2xx responses.
 *
 * Every request carries:
 *   X-Request-ID  — client-generated UUID correlated in backend structured logs
 *   X-User-Date   — current local date for streak computation
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type":  "application/json",
      "X-Request-ID":  generateRequestId(),
      ...localDateHeader(),
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

  deleteWithBody<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return apiFetch<T>(path, {
      ...init,
      method: "DELETE",
      body: JSON.stringify(body),
    });
  },
};
