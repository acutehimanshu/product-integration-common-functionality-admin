import { useEffect, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { AdminMe } from "@acutehimanshu/core/domain/admin"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Text } from "@acutehimanshu/ui/components/text"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@acutehimanshu/ui/components/ui/tabs"
import { getErrorMessage } from "@/lib/api"
import {
  logInWithCode,
  confirmTwoStep,
  logInWithPassword,
  requestLoginCode,
} from "@/lib/auth"

// Admin login, two ways side by side (tabs): email + password, or email +
// a one-time code (no password yet, or forgot it). The email typed in one
// tab carries over to the other.

const email = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .pipe(z.email("Enter a valid email"))
const passwordSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
})
const emailSchema = z.object({ email })
const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
})

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  )
}

/** Reports the form's email as it's typed, so the other tab starts with it. */
function useReportEmail(
  form:
    UseFormReturn<{ email: string }> | UseFormReturn<{ email: string; password: string }>,
  onEmailChange: (email: string) => void
) {
  useEffect(() => {
    const subscription = (form as UseFormReturn<{ email: string }>).watch((values) =>
      onEmailChange(values.email ?? "")
    )
    return () => subscription.unsubscribe()
  }, [form, onEmailChange])
}

function useSecondsUntil(timestamp: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (timestamp === null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [timestamp])
  return timestamp === null ? 0 : Math.max(0, Math.ceil((timestamp - now) / 1000))
}

function PasswordForm({
  defaultEmail,
  onLoggedIn,
  onEmailChange,
}: {
  defaultEmail: string
  onLoggedIn: (admin: AdminMe) => void
  onEmailChange: (email: string) => void
}) {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: defaultEmail, password: "" },
  })
  useReportEmail(form, onEmailChange)
  const { errors, isSubmitting } = form.formState
  // Two-step login: the password was right; the emailed code finishes it.
  const [twoStep, setTwoStep] = useState<{ email: string; debugCode?: string } | null>(
    null
  )

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    try {
      const result = await logInWithPassword(email, password)
      if ("admin" in result) onLoggedIn(result.admin)
      else setTwoStep({ email, debugCode: result.twoStep.debugCode })
    } catch (error) {
      form.setError("root", { message: getErrorMessage(error, "Couldn't log you in") })
    }
  })

  if (twoStep)
    return (
      <TwoStepForm
        email={twoStep.email}
        debugCode={twoStep.debugCode}
        onLoggedIn={onLoggedIn}
        onBack={() => setTwoStep(null)}
      />
    )

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          placeholder="you@marketbase.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          {...form.register("email")}
        />
        <FieldError id="login-email-error" message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          {...form.register("password")}
        />
        <FieldError id="login-password-error" message={errors.password?.message} />
      </div>
      <FieldError id="login-error" message={errors.root?.message} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Log in"}
      </Button>
    </form>
  )
}

/** Second step of a two-step login (FRD-01 ADM-003): the code we just emailed. */
function TwoStepForm({
  email,
  debugCode,
  onLoggedIn,
  onBack,
}: Readonly<{
  email: string
  debugCode?: string
  onLoggedIn: (admin: AdminMe) => void
  onBack: () => void
}>) {
  const form = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  })
  const { errors, isSubmitting } = form.formState
  const onSubmit = form.handleSubmit(async ({ code }) => {
    try {
      onLoggedIn(await confirmTwoStep(email, code))
    } catch (error) {
      form.setError("root", { message: getErrorMessage(error, "Couldn't log you in") })
    }
  })
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <Text>
        Two-step login: we&apos;ve emailed <span className="font-medium">{email}</span> a
        6-digit code.
      </Text>
      {debugCode && (
        <Text variant="muted" className="text-xs" role="note">
          Test mode — your code is <span className="font-mono">{debugCode}</span>
        </Text>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="two-step-code">Code</Label>
        <Input
          id="two-step-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          aria-invalid={!!errors.code}
          aria-describedby={errors.code ? "two-step-code-error" : undefined}
          {...form.register("code")}
        />
        <FieldError id="two-step-code-error" message={errors.code?.message} />
      </div>
      <FieldError id="two-step-error" message={errors.root?.message} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Log in"}
      </Button>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="text-foreground self-start px-0"
        onClick={onBack}
      >
        Start again
      </Button>
    </form>
  )
}

function CodeForm({
  defaultEmail,
  onLoggedIn,
  onEmailChange,
}: {
  defaultEmail: string
  onLoggedIn: (admin: AdminMe) => void
  onEmailChange: (email: string) => void
}) {
  const [sent, setSent] = useState<{
    email: string
    resendAfter: number
    debugCode?: string
  } | null>(null)
  const [isResending, setIsResending] = useState(false)
  const secondsToResend = useSecondsUntil(sent?.resendAfter ?? null)

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: defaultEmail },
  })
  useReportEmail(emailForm, onEmailChange)
  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  })

  const send = async (email: string) => {
    const result = await requestLoginCode(email)
    setSent({
      email,
      resendAfter: Date.parse(result.resendAfter),
      debugCode: result.debugCode,
    })
  }

  const onSend = emailForm.handleSubmit(async ({ email }) => {
    try {
      await send(email)
    } catch (error) {
      emailForm.setError("root", {
        message: getErrorMessage(error, "Couldn't send a code"),
      })
    }
  })

  const onVerify = codeForm.handleSubmit(async ({ code }) => {
    if (!sent) return
    try {
      onLoggedIn(await logInWithCode(sent.email, code))
    } catch (error) {
      codeForm.setError("root", {
        message: getErrorMessage(error, "Couldn't log you in"),
      })
    }
  })

  if (!sent) {
    const { errors, isSubmitting } = emailForm.formState
    return (
      <form onSubmit={onSend} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code-email">Email</Label>
          <Input
            id="code-email"
            type="email"
            autoComplete="username"
            placeholder="you@marketbase.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "code-email-error" : undefined}
            {...emailForm.register("email")}
          />
          <FieldError id="code-email-error" message={errors.email?.message} />
        </div>
        <FieldError id="code-send-error" message={errors.root?.message} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Email me a code"}
        </Button>
      </form>
    )
  }

  const { errors, isSubmitting } = codeForm.formState
  return (
    <form onSubmit={onVerify} className="flex flex-col gap-3" noValidate>
      <Text>
        If <span className="font-medium">{sent.email}</span> has an admin account,
        we&apos;ve emailed it a 6-digit code.
      </Text>
      {sent.debugCode && (
        <Text variant="muted" className="text-xs" role="note">
          Test mode — your code is <span className="font-mono">{sent.debugCode}</span>
        </Text>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-code">Code</Label>
        <Input
          id="login-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          aria-invalid={!!errors.code}
          aria-describedby={errors.code ? "login-code-error" : undefined}
          {...codeForm.register("code")}
        />
        <FieldError id="login-code-error" message={errors.code?.message} />
      </div>
      <FieldError id="code-login-error" message={errors.root?.message} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Log in"}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="text-foreground px-0"
          disabled={secondsToResend > 0 || isResending}
          onClick={async () => {
            setIsResending(true)
            try {
              await send(sent.email)
              codeForm.reset()
              toast.success("New code sent")
            } catch (error) {
              toast.error(getErrorMessage(error, "Couldn't send a new code"))
            } finally {
              setIsResending(false)
            }
          }}
        >
          {secondsToResend > 0 ? `Resend code in ${secondsToResend}s` : "Resend code"}
        </Button>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="text-foreground px-0"
          onClick={() => {
            setSent(null)
            codeForm.reset()
          }}
        >
          Use a different email
        </Button>
      </div>
    </form>
  )
}

/** Tabs: Password | One-time code. The admin is handed to onLoggedIn. */
export function LoginForm({ onLoggedIn }: { onLoggedIn: (admin: AdminMe) => void }) {
  const [email, setEmail] = useState("")
  return (
    <Tabs defaultValue="password">
      <TabsList className="w-full" aria-label="How to log in">
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="code">One-time code</TabsTrigger>
      </TabsList>
      <TabsContent value="password" className="pt-2">
        <PasswordForm
          defaultEmail={email}
          onLoggedIn={onLoggedIn}
          onEmailChange={setEmail}
        />
      </TabsContent>
      <TabsContent value="code" className="pt-2">
        <CodeForm defaultEmail={email} onLoggedIn={onLoggedIn} onEmailChange={setEmail} />
        <Text variant="muted" className="mt-3 text-xs">
          No password yet, or forgot it? We&apos;ll email you a code instead.
        </Text>
      </TabsContent>
    </Tabs>
  )
}
