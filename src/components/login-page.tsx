import { Navigate, useNavigate, useSearchParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { safeRedirectPath } from "@acutehimanshu/core/safe-redirect"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { AdminHeader } from "@/components/admin-header"
import { LoginForm } from "@/components/login-form"
import { adminKeys, useAdmin } from "@/lib/auth"
import { usePageTitle } from "@/lib/use-page-title"

export function LoginPage() {
  usePageTitle("Log in")
  const [params] = useSearchParams()
  const from = safeRedirectPath(params.get("from") ?? undefined) ?? "/"
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: admin } = useAdmin()

  // Already logged in (a stale bookmark): carry on.
  if (admin) return <Navigate to={from} replace />

  return (
    <div className="flex min-h-full flex-col">
      <AdminHeader />
      <PageContainer>
        <div className="flex flex-col gap-2">
          <Heading>Admin log in</Heading>
          <Text variant="muted">
            For the Marketbase team. Accounts are created by a super admin.
          </Text>
        </div>
        <LoginForm
          onLoggedIn={(loggedIn) => {
            // Known-good: write it straight into the cache, no refetch.
            queryClient.setQueryData(adminKeys.me(), loggedIn)
            toast.success("Logged in")
            void navigate(from, { replace: true })
          }}
        />
      </PageContainer>
    </div>
  )
}
