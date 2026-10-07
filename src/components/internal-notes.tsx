import { useId, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  internalNoteProblem,
  type InternalNote,
  type InternalNoteKind,
} from "@acutehimanshu/core/domain/admin-notes"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { useCanAct } from "@/components/module-access"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"

const notesKey = (kind: InternalNoteKind, id: string) =>
  ["admin", "notes", kind, id] as const

/**
 * The team's running notes on a record (orders, users, sellers, disputes,
 * payouts): context without taking an action. Admins only, never shown to
 * the user; nobody can edit or delete a note. View-only admins read them.
 */
export function InternalNotes({ kind, id }: { kind: InternalNoteKind; id: string }) {
  const formId = useId()
  const canAct = useCanAct()
  const queryClient = useQueryClient()
  const path = `/admin/${kind}/${encodeURIComponent(id)}/notes`
  const { data, isPending, error } = useQuery({
    queryKey: notesKey(kind, id),
    queryFn: ({ signal }) => api.get<InternalNote[]>(path, { signal }),
  })
  const [text, setText] = useState("")
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    const invalid = internalNoteProblem(text)
    if (invalid) return setProblem(invalid)
    setSaving(true)
    try {
      const note = await api.post<InternalNote>(path, { text: text.trim() })
      queryClient.setQueryData<InternalNote[]>(notesKey(kind, id), (current = []) => [
        note,
        ...current,
      ])
      setText("")
      toast.success("Note added")
    } catch (err) {
      setProblem(getErrorMessage(err, "Couldn't add the note."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby={`${formId}-heading`} className="flex flex-col gap-3">
      <Heading as="h2" size="h3" id={`${formId}-heading`}>
        Internal notes
      </Heading>
      <Text variant="muted" className="text-xs">
        For the team only — never shown to the user. Notes can&apos;t be edited or
        deleted.
      </Text>
      {canAct && (
        <form onSubmit={add} className="flex flex-col gap-2" aria-label="Add a note">
          <Label htmlFor={`${formId}-text`} className="sr-only">
            New note
          </Label>
          <Textarea
            id={`${formId}-text`}
            value={text}
            placeholder="e.g. Called the buyer — photos coming tomorrow."
            aria-invalid={!!problem}
            aria-describedby={problem ? `${formId}-error` : undefined}
            onChange={(event) => {
              setText(event.target.value)
              setProblem(null)
            }}
          />
          {problem && (
            <p id={`${formId}-error`} role="alert" className="text-destructive text-sm">
              {problem}
            </p>
          )}
          <Button
            type="submit"
            variant="outline"
            disabled={saving}
            className="self-start"
          >
            {saving ? "Saving..." : "Add note"}
          </Button>
        </form>
      )}
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the notes.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-16" />
      ) : data.length === 0 ? (
        <Text variant="muted">No notes yet.</Text>
      ) : (
        <ol aria-label="Notes" className="flex flex-col gap-3 border-l pl-4">
          {data.map((note) => (
            <li key={note.id} className="flex flex-col gap-0.5 text-sm">
              <span className="whitespace-pre-wrap">{note.text}</span>
              <span className="text-muted-foreground text-xs">
                {note.admin.name} · {formatDateTime(note.at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
