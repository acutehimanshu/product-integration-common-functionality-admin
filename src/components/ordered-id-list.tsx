import { Text } from "@acutehimanshu/ui/components/text"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { moveItem } from "@/lib/move-item"

type Item = { id: string; name: string; enabled: boolean }

/**
 * An order of providers or gateways (first = tried first): move up, remove,
 * add. Switched-off ones stay in the order but are skipped.
 */
export function OrderedIdList({
  ids,
  items,
  addable,
  context,
  listLabel,
  addPlaceholder,
  selectId,
  emptyText,
  keepOne = false,
  onChange,
}: Readonly<{
  ids: string[]
  /** Everything an id can name (for the names and the off note). */
  items: readonly Item[]
  /** What can still be added. */
  addable: readonly Item[]
  /** Ends the buttons' names: "Move X up in {context}", "Remove X from {context}". */
  context: string
  listLabel: string
  addPlaceholder: string
  selectId: string
  /** Shown instead of an empty list; without it the empty list renders. */
  emptyText?: string
  /** Never remove the last one. */
  keepOne?: boolean
  onChange: (ids: string[]) => void
}>) {
  const find = (id: string) => items.find((item) => item.id === id)
  const name = (id: string) => find(id)?.name ?? id
  return (
    <>
      {emptyText && ids.length === 0 ? (
        <Text variant="muted" className="text-sm">
          {emptyText}
        </Text>
      ) : (
        <ol className="flex flex-col gap-1 text-sm" aria-label={listLabel}>
          {ids.map((id, index) => (
            <li key={id} className="flex items-center gap-2">
              <span className="flex-1">
                {index + 1}. {name(id)}
                {!find(id)?.enabled && (
                  <span className="text-muted-foreground"> (off — skipped)</span>
                )}
              </span>
              <Button
                variant="outline"
                size="xs"
                disabled={index === 0}
                aria-label={`Move ${name(id)} up in ${context}`}
                onClick={() => onChange(moveItem(ids, index, index - 1))}
              >
                Up
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={keepOne && ids.length === 1}
                aria-label={`Remove ${name(id)} from ${context}`}
                onClick={() => onChange(ids.filter((x) => x !== id))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ol>
      )}
      {addable.length > 0 && (
        <div className="flex items-center gap-2">
          <Label htmlFor={selectId} className="text-sm">
            Add
          </Label>
          <NativeSelect
            id={selectId}
            value=""
            onChange={(e) => e.target.value && onChange([...ids, e.target.value])}
          >
            <option value="">{addPlaceholder}</option>
            {addable.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
    </>
  )
}
