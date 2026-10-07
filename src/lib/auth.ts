import { useQuery } from "@tanstack/react-query"
import type { AdminLoginResult, AdminMe } from "@acutehimanshu/core/domain/admin"
import type { OtpRequestResult } from "@acutehimanshu/core/domain/auth"
import { api, ApiError } from "@/lib/api"

// Admin login: email + password, or email + one-time code for someone who
// doesn't have (or forgot) a password. Either way the backend answers with
// the admin and sets the httpOnly session cookie.

export const adminKeys = {
  all: ["admin"] as const,
  me: () => [...adminKeys.all, "me"] as const,
}

/** The logged-in admin, or null when there's no (valid) session. */
export async function getAdmin(options?: {
  signal?: AbortSignal
}): Promise<AdminMe | null> {
  try {
    return await api.get<AdminMe>("/admin/me", options)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function useAdmin() {
  return useQuery({
    queryKey: adminKeys.me(),
    queryFn: ({ signal }) => getAdmin({ signal }),
    staleTime: 5 * 60_000,
  })
}

export async function logInWithPassword(
  email: string,
  password: string
): Promise<AdminMe> {
  const { admin } = await api.post<AdminLoginResult>("/admin/auth/login", {
    email,
    password,
  })
  return admin
}

export function requestLoginCode(email: string): Promise<OtpRequestResult> {
  return api.post<OtpRequestResult>("/admin/auth/otp/request", { email })
}

export async function logInWithCode(email: string, code: string): Promise<AdminMe> {
  const { admin } = await api.post<AdminLoginResult>("/admin/auth/otp/verify", {
    email,
    code,
  })
  return admin
}

export function logOut(): Promise<void> {
  return api.post<void>("/admin/auth/logout")
}
