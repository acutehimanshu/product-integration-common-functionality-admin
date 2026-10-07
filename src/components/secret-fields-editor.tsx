import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"

type Values = Record<string, string>

export type ConfigField = {
  key: string
  label: string
  placeholder?: string
  secret?: boolean
}

/**
 * A provider's or gateway's settings and keys. Keys are write-only: a stored
 * one shows only "ends in ••••" (its last 4), and typing replaces it.
 */
export function SecretFieldsEditor({
  fields,
  idPrefix,
  settings,
  secrets,
  kept,
  onSettings,
  onSecrets,
}: Readonly<{
  fields: readonly ConfigField[]
  /** Keeps ids unique per row, e.g. "provider-abc". */
  idPrefix: string
  settings: Values
  secrets: Values
  /** Last 4 characters of each stored key (editing an existing one). */
  kept?: Values
  onSettings: (settings: Values) => void
  onSecrets: (secrets: Values) => void
}>) {
  return (
    <>
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`
        const last4 = field.secret ? kept?.[field.key] : undefined
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{field.label}</Label>
            <Input
              id={id}
              type={field.secret ? "password" : "text"}
              autoComplete="off"
              placeholder={
                last4 ? `Set — ends in ${last4}. Type to replace.` : field.placeholder
              }
              value={(field.secret ? secrets : settings)[field.key] ?? ""}
              onChange={(e) =>
                field.secret
                  ? onSecrets({ ...secrets, [field.key]: e.target.value })
                  : onSettings({ ...settings, [field.key]: e.target.value })
              }
            />
          </div>
        )
      })}
    </>
  )
}
