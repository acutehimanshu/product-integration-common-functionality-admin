import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { accessSummary } from "@/components/module-access"
import { PASSWORD_MIN_LENGTH } from "@acutehimanshu/core/domain/admin-content"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { api, getErrorMessage } from "@/lib/api"
import { adminKeys, useAdmin } from "@/lib/auth"
import { usePageTitle } from "@/lib/use-page-title"

/**
 * Every admin's own page: who they are, and setting or changing their
 * password. Invited admins start without one (one-time code only).
 */
export function MyAccount() {
  usePageTitle("My account")
  const queryClient = useQueryClient()
  const { data: admin } = useAdmin()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [repeat, setRepeat] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  if (!admin) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (next.length < PASSWORD_MIN_LENGTH)
      return setError(`Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    if (next !== repeat) return setError("The two new passwords don't match.")
    setIsPending(true)
    try {
      await api.post("/admin/me/password", {
        currentPassword: current || undefined,
        newPassword: next,
      })
      if (admin.setupOnly) {
        // The backend ended this session: log in with the password and a code.
        queryClient.setQueryData(adminKeys.me(), null)
        toast.success("Password saved — log in with it and the code we email you")
        return
      }
      queryClient.setQueryData(adminKeys.me(), { ...admin, hasPassword: true })
      setCurrent("")
      setNext("")
      setRepeat("")
      toast.success("Password saved")
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save your password."))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-1">
        <Heading>My account</Heading>
        <Text variant="muted">
          {admin.name} · {admin.email} · {accessSummary(admin)}
        </Text>
      </div>
      <form
        onSubmit={submit}
        className="flex flex-col gap-3"
        aria-label="Password"
        noValidate
      >
        <Heading as="h2" size="h3">
          {admin.hasPassword ? "Change your password" : "Set a password"}
        </Heading>
        {admin.setupOnly && (
          <Text role="status" className="bg-muted rounded-xl p-3">
            Two-step login is on for you. Set a password here; then you&apos;ll log in
            with it and a code we email you.
          </Text>
        )}
        {!admin.hasPassword && !admin.setupOnly && (
          <Text variant="muted">
            You log in with one-time codes today. A password lets you use the Password tab
            too.
          </Text>
        )}
        {admin.hasPassword && !admin.setupOnly && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Forgot it? Log in with a one-time code, then you can set a new one without
              it.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => {
              setNext(e.target.value)
              setError(null)
            }}
          />
          <p className="text-muted-foreground text-xs">
            At least {PASSWORD_MIN_LENGTH} characters.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repeat-password">New password again</Label>
          <Input
            id="repeat-password"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => {
              setRepeat(e.target.value)
              setError(null)
            }}
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Saving..." : "Save password"}
        </Button>
      </form>
    </PageContainer>
  )
}
