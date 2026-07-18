export const API_BASE =
  localStorage.getItem("ironstreakApiBase") || import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

type ApiErrorPayload = {
  detail?: string | Array<{ msg?: string }>;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function detailToString(detail: ApiErrorPayload["detail"]): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  return detail.map((item) => item.msg || "Validation error").join(" ");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON body (proxy error page, etc.) — fall through to status handling.
    }
  }

  if (!response.ok) {
    const detail = detailToString((data as ApiErrorPayload | null)?.detail);
    throw new ApiError(response.status, detail || `Request failed: ${response.status}`);
  }

  return data as T;
}
