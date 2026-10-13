import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ADMIN_ACTIONS,
  ADMIN_FIELDS,
  type AdminActionKey,
  type AdminFieldKey,
} from "@acutehimanshu/core/domain/admin-actions"
import type { AdminAccountDetail } from "@acutehimanshu/core/domain/admin-content"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import { Text } from "@acutehimanshu/ui/components/text"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"

/**
 * Narrower than the section levels (FRD-01 RBAC-002/004): actions taken away
 * inside sections they can act in, and the countries they work on.
 */
export function AccessLimits({
  account,
  onSaved,
}: Readonly<{
  account: AdminAccountDetail
  onSaved: (updated: AdminAccountDetail) => void
}>) {
  const { data: countries = [] } = useQuery({
    queryKey: ["admin", "countries", "list"],
    queryFn: ({ signal }) => api.get<SupportedCountry[]>("/admin/countries", { signal }),
  })
  const [restricted, setRestricted] = useState<AdminActionKey[]>(
    account.restrictedActions ?? []
  )
  const [scope, setScope] = useState<string[]>(account.countries ?? [])
  const [hidden, setHidden] = useState<AdminFieldKey[]>(account.hiddenFields ?? [])
  // Only actions in sections they can act in mean anything.
  const actions = ADMIN_ACTIONS.filter(
    (action) => account.permissions[action.section] === "manage"
  )
  const toggle = <T,>(list: T[], item: T, on: boolean): T[] =>
    on ? list.filter((x) => x !== item) : [...list, item]

  return (
    <div className="flex flex-col gap-3">
      {actions.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-medium">
            Actions they can take (untick to take one away)
          </legend>
          {actions.map((action) => {
            const allowed = !restricted.includes(action.key)
            return (
              <label key={action.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowed}
                  onChange={() => setRestricted(toggle(restricted, action.key, allowed))}
                />
                {action.label}
              </label>
            )
          })}
        </fieldset>
      )}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium">
          Countries they work on (none ticked = every country)
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {countries.map((country) => {
            const chosen = scope.includes(country.code)
            return (
              <label key={country.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosen}
                  onChange={() => setScope(toggle(scope, country.code, chosen))}
                />
                {country.name}
              </label>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium">
          Personal details they see (untick to hide)
        </legend>
        {ADMIN_FIELDS.map((field) => {
          const visible = !hidden.includes(field.key)
          return (
            <label key={field.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visible}
                onChange={() => setHidden(toggle(hidden, field.key, visible))}
              />
              {field.label}
            </label>
          )
        })}
      </fieldset>
      <Text variant="muted" className="text-xs">
        Records from other countries are hidden from them, restricted actions are refused,
        and hidden details show as "Hidden" — all enforced by the backend.
      </Text>
      <div>
        <ReasonDialog
          trigger="Save limits"
          title={`Change ${account.name}'s limits?`}
          description="Applies to their next action — no need to log out."
          confirmLabel="Save limits"
          onConfirm={async (reason) => {
            onSaved(
              await api.patch<AdminAccountDetail>(`/admin/admins/${account.id}`, {
                restrictedActions: restricted,
                countries: scope,
                hiddenFields: hidden,
                reason,
              })
            )
            toast.success("Limits saved")
          }}
        />
      </div>
    </div>
  )
}
