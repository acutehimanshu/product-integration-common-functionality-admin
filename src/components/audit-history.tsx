import type { AuditEntry } from "@acutehimanshu/core/domain/admin-audit"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { ChangeList } from "@/components/change-list"
import { formatDateTime } from "@/lib/format"

/** Who did what to this record, when, and why — newest first. */
export function AuditHistory({ entries }: { entries: AuditEntry[] }) {
  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-2">
      <Heading as="h2" size="h3" id="history-heading">
        History
      </Heading>
      {entries.length === 0 ? (
        <Text variant="muted">No admin actions yet.</Text>
      ) : (
        <ol className="flex flex-col gap-3 border-l pl-4">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium">{entry.summary}</span>
              <span className="text-muted-foreground text-xs">
                {entry.admin.name} · {formatDateTime(entry.at)}
              </span>
              {entry.reason && <span>“{entry.reason}”</span>}
              <ChangeList changes={entry.changes} />
              {entry.note && (
                <span className="bg-muted/50 rounded-md px-2 py-1 whitespace-pre-wrap">
                  <span className="font-medium">Internal note:</span> {entry.note}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
