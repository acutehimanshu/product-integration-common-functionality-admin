import { useId, useState } from "react"
import {
  NOTE_MIN_LENGTH,
  noteProblem,
  REASON_MIN_LENGTH,
} from "@acutehimanshu/core/domain/admin-audit"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acutehimanshu/ui/components/ui/dialog"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { cn } from "@acutehimanshu/ui/utils"
import { getErrorMessage } from "@/lib/api"
import { useCanAct } from "@/components/module-access"

/**
 * Every admin action that changes someone's account, listing, order or money
 * goes through this: say what will happen, require a reason (kept in the
 * audit log, and sent to the user where it affects them), then act.
 * Big actions (`noteRequired`) also take an internal note: the fuller story,
 * for admins only — never sent to the user.
 */
export function ReasonDialog({
  trigger,
  triggerLabel,
  triggerVariant = "outline",
  title,
  description,
  reasonLabel = "Reason",
  reasonHint,
  confirmLabel,
  destructive = false,
  fields,
  validate,
  noteRequired = false,
  onConfirm,
}: {
  trigger: string
  /** Accessible name when the button repeats per row ("End Offer rounds for Country AU"). */
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "destructive" | "secondary"
  title: string
  description: string
  reasonLabel?: string
  /** e.g. "The seller sees this." */
  reasonHint?: string
  confirmLabel: string
  destructive?: boolean
  /** Extra inputs above the reason (a name, roles…); the caller owns their state. */
  fields?: React.ReactNode
  /** Checks the extra fields; return a message to show, or null. */
  validate?: () => string | null
  /** A big action: an internal note is required too (`note` in the body). */
  noteRequired?: boolean
  /** `note` is set only when `noteRequired`. */
  onConfirm: (reason: string, note: string | undefined) => Promise<unknown>
}) {
  const canAct = useCanAct()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const confirm = async () => {
    const problem = validate?.()
    if (problem) {
      setError(problem)
      return
    }
    if (reason.trim().length < REASON_MIN_LENGTH) {
      setError("Give a short reason — it's kept in the audit log.")
      return
    }
    const noteError = noteRequired ? noteProblem(note) : null
    if (noteError) {
      setError(noteError)
      return
    }
    setIsPending(true)
    try {
      await onConfirm(reason.trim(), noteRequired ? note.trim() : undefined)
      setOpen(false)
      setReason("")
      setNote("")
    } catch (err) {
      setError(getErrorMessage(err, "That didn't work. Try again."))
    } finally {
      setIsPending(false)
    }
  }

  // View-only access: no actions (the backend refuses them too).
  if (!canAct) return null
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
      }}
    >
      <DialogTrigger
        render={<Button variant={triggerVariant} aria-label={triggerLabel} />}
      >
        {trigger}
      </DialogTrigger>
      {/* Scrolls when extra fields (e.g. the permissions table) outgrow the screen. */}
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] overflow-y-auto",
          fields && "sm:max-w-lg"
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {fields}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-reason`}>{reasonLabel}</Label>
          <Textarea
            id={`${id}-reason`}
            value={reason}
            aria-invalid={!!error}
            aria-describedby={
              [error && `${id}-error`, reasonHint && `${id}-hint`]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onChange={(event) => {
              setReason(event.target.value)
              setError(null)
            }}
          />
          {reasonHint && (
            <p id={`${id}-hint`} className="text-muted-foreground text-xs">
              {reasonHint}
            </p>
          )}
          {noteRequired && (
            <div className="mt-2 flex flex-col gap-1.5">
              <Label htmlFor={`${id}-note`}>Internal note</Label>
              <Textarea
                id={`${id}-note`}
                value={note}
                aria-describedby={`${id}-note-hint`}
                onChange={(event) => {
                  setNote(event.target.value)
                  setError(null)
                }}
              />
              <p id={`${id}-note-hint`} className="text-muted-foreground text-xs">
                A big action: give the team the full story (at least {NOTE_MIN_LENGTH}{" "}
                characters). Only admins see this.
              </p>
            </div>
          )}
          {error && (
            <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={confirm}
          >
            {isPending ? "Saving..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
