import type { FieldChange } from "@acutehimanshu/core/domain/audit-changes"
import { plural } from "@acutehimanshu/ui/utils"

/** Shown open up to this many changes; more start folded. */
const OPEN_LIMIT = 4

/**
 * Before/after values of a configuration change (audit and activity
 * entries). Renders nothing when there are none.
 */
export function ChangeList({ changes }: { changes?: FieldChange[] }) {
  if (!changes || changes.length === 0) return null
  const table = (
    <table className="w-full text-left text-xs">
      <thead className="text-muted-foreground">
        <tr>
          <th scope="col" className="py-1 pr-3 font-medium">
            Field
          </th>
          <th scope="col" className="py-1 pr-3 font-medium">
            Before
          </th>
          <th scope="col" className="py-1 font-medium">
            After
          </th>
        </tr>
      </thead>
      <tbody>
        {changes.map((change) => (
          <tr key={change.field} className="border-t align-top">
            <th scope="row" className="py-1 pr-3 font-normal">
              {change.field}
            </th>
            <td className="text-muted-foreground py-1 pr-3 break-words">
              {change.before ?? "—"}
            </td>
            <td className="py-1 break-words">{change.after ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
  return (
    <details
      className="bg-muted/40 rounded-md px-2 py-1"
      open={changes.length <= OPEN_LIMIT}
    >
      <summary className="cursor-pointer text-xs font-medium">
        {plural(changes.length, "change")}
      </summary>
      {table}
    </details>
  )
}
