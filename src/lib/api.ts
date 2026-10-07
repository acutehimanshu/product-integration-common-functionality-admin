import { env } from "@/lib/env"

// The admin portal's only way to reach the backend. There's no server of
// our own here, so the backend owns the session: it sets an httpOnly admin
// cookie at login, and every call sends it (credentials: "include"). The
// token is never visible to this code — an XSS bug can't read it.

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: { signal?: AbortSignal } = {}
): Promise<T> {
  // Files go as multipart; the browser sets that Content-Type (with its
  // boundary). Still safe from cross-site posts: the admin cookie is
  // SameSite=Strict, so another site's form can't send it.
  const upload = body instanceof FormData
  let res: Response
  try {
    res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
      method,
      credentials: "include",
      // JSON on every call, bodies or not: a non-simple request always gets
      // a CORS preflight, one more guard against cross-site form posts.
      headers: upload ? undefined : { "Content-Type": "application/json" },
      body: upload ? body : body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new ApiError(`Couldn't reach the server at ${env.VITE_API_BASE_URL}`, 0, null)
  }

  if (res.status === 204) return undefined as T
  const payload: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : res.statusText || "Something went wrong"
    throw new ApiError(message, res.status, payload)
  }
  return payload as T
}

export const api = {
  get: <T>(path: string, options?: { signal?: AbortSignal }) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
  /** POSTs one file as multipart (field "file"). */
  upload: <T>(path: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return request<T>("POST", path, form)
  },
}

/** Downloads a CSV export (GET, with the admin cookie) and saves it as `filename`. */
export async function downloadCsv(path: string, filename: string): Promise<void> {
  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, { credentials: "include" })
  if (!res.ok) {
    const payload: unknown = await res.json().catch(() => null)
    throw new ApiError(
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Couldn't download the file",
      res.status,
      payload
    )
  }
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
