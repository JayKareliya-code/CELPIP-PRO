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

// ── Constants ────────────────────────────────────────────────────────────────

/** Default per-request timeout (ms). Long-running uploads/exports should
 *  override via `signal: AbortSignal.timeout(longerMs)` or merge their own
 *  AbortController. Set high enough to absorb a slow OpenAI scoring call but
 *  low enough that a wedged backend doesn't pin React Query loading state. */
export const API_DEFAULT_TIMEOUT_MS = 20_000;

/** Event name dispatched on `window` when the API rejects a request as
 *  unauthenticated. A client-side listener (`AuthExpiredHandler`) reacts
 *  by clearing local state and routing to `/sign-in`. Centralising here
 *  keeps `apiFetch` free of any Clerk dependency. */
export const API_AUTH_EXPIRED_EVENT = "celpip:auth-expired";

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
 *
 * Timeouts: enforced via AbortSignal.timeout(API_DEFAULT_TIMEOUT_MS) when the
 * caller doesn't pass its own `signal`. A wedged backend used to pin React
 * Query in `isLoading` forever; now it surfaces an ApiError(0, "timeout")
 * after ~20s so the UI can show a retry control.
 *
 * 401 handling: a single `celpip:auth-expired` window event is dispatched on
 * unauthenticated responses so the app shell can sign the user out exactly
 * once. The error is still thrown so React Query receives it normally.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  // Honour a caller-supplied signal; otherwise apply the default timeout.
  // AbortSignal.timeout is available in all modern browsers and Node 18+,
  // which matches the Next 14 supported runtime.
  const signal = options.signal ?? AbortSignal.timeout(API_DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal,
      headers: {
        "Content-Type":  "application/json",
        "X-Request-ID":  generateRequestId(),
        ...localDateHeader(),
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    // AbortError fires both on caller-cancellation AND on timeout. We can't
    // distinguish here, but ApiError(0, ...) is a clean signal to callers
    // that the request never received a response.
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "Request timed out or was cancelled.", { kind: "abort" });
    }
    // Network error (DNS, offline, CORS preflight failure, etc.)
    throw new ApiError(0, "Network error.", { kind: "network", cause: String(err) });
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }

    // Build a user-readable message. Backend FastAPI returns `{ detail: ... }`
    // for errors; HTTP/2 leaves statusText empty so we fall back to status code.
    const detailObj   = (typeof detail === "object" && detail !== null) ? detail as Record<string, unknown> : null;
    const detailField = detailObj?.detail ?? detailObj?.message;
    const message =
      (typeof detailField === "string" && detailField) ||
      response.statusText ||
      `HTTP ${response.status}`;

    // Auth expired — fan out one window event so a single listener can
    // signOut() and route to /sign-in. Doing this *here* keeps every hook
    // free of the boilerplate. Wrapped in try/catch so SSR (no `window`)
    // is a no-op.
    if (response.status === 401) {
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(API_AUTH_EXPIRED_EVENT, {
            detail: { path, status: response.status },
          }));
        }
      } catch { /* non-fatal */ }
    }

    throw new ApiError(response.status, message, detail);
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
