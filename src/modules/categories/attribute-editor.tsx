import { useState } from "react"
import {
  ATTRIBUTE_TYPES,
  ATTRIBUTE_TYPE_LABELS,
  type AttributeDefinition,
  type AttributeOption,
  type AttributeType,
} from "@acutehimanshu/core/domain/attributes"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { ReasonDialog } from "@/components/reason-dialog"

export type AttributeBody = Omit<AttributeDefinition, "id" | "updatedAt" | "options"> & {
  options?: Array<Omit<AttributeOption, "id"> & { id?: string }>
}

type Draft = {
  label: string
  type: AttributeType
  unit: string
  options: AttributeOption[]
  newOptions: string
  categoryIds: string[]
  required: boolean
  requiredIn: string[]
  public: boolean
  searchable: boolean
  filterable: boolean
  min: string
  max: string
  status: AttributeDefinition["status"]
}

const draftOf = (a?: AttributeDefinition): Draft => ({
  label: a?.label ?? "",
  type: a?.type ?? "text",
  unit: a?.unit ?? "",
  options: a?.options ?? [],
  newOptions: "",
  categoryIds: a?.categoryIds ?? [],
  required: a?.required ?? false,
  requiredIn: a?.requiredIn ?? [],
  public: a?.public ?? true,
  searchable: a?.searchable ?? false,
  filterable: a?.filterable ?? false,
  min: a?.min === undefined ? "" : String(a.min),
  max: a?.max === undefined ? "" : String(a.max),
  status: a?.status ?? "active",
})

const numberOrUndefined = (text: string) =>
  text.trim() === "" || !Number.isFinite(Number(text)) ? undefined : Number(text)

/** The draft as the API body: existing options keep their ids, new lines become options. */
export function bodyOf(draft: Draft): AttributeBody {
  const added = draft.newOptions
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({ label, status: "active" as const }))
  return {
    label: draft.label.trim(),
    type: draft.type,
    unit: draft.unit.trim() || undefined,
    options: draft.type === "choice" ? [...draft.options, ...added] : undefined,
    categoryIds: draft.categoryIds,
    required: draft.required,
    requiredIn: draft.required ? draft.requiredIn : [],
    public: draft.public,
    searchable: draft.searchable,
    filterable: draft.filterable && (draft.type === "choice" || draft.type === "yes_no"),
    min: draft.type === "number" ? numberOrUndefined(draft.min) : undefined,
    max:
      draft.type === "number" || draft.type === "text"
        ? numberOrUndefined(draft.max)
        : undefined,
    status: draft.status,
  }
}

/** What's wrong with the draft before it's sent, or null. */
export function draftProblem(draft: Draft): string | null {
  if (draft.label.trim().length < 2) return "Enter a name."
  if (draft.categoryIds.length === 0) return "Choose at least one category."
  if (draft.type === "choice" && (bodyOf(draft).options?.length ?? 0) === 0)
    return "Add at least one option."
  return null
}

function Check({
  label,
  checked,
  onChange,
}: Readonly<{ label: string; checked: boolean; onChange: (on: boolean) => void }>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

/** Add or edit one attribute (FRD-04 CAT-006..011). */
export function AttributeEditor({
  attribute,
  categories,
  countries,
  onSave,
}: Readonly<{
  attribute?: AttributeDefinition
  categories: AdminCategory[]
  countries: SupportedCountry[]
  onSave: (body: AttributeBody, reason: string) => Promise<void>
}>) {
  const [draft, setDraft] = useState(() => draftOf(attribute))
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const id = attribute?.id ?? "new"
  const filterAllowed = draft.type === "choice" || draft.type === "yes_no"

  return (
    <ReasonDialog
      trigger={attribute ? "Edit" : "Add an attribute"}
      triggerVariant={attribute ? "outline" : "default"}
      triggerLabel={attribute ? `Edit ${attribute.label}` : undefined}
      title={attribute ? `Edit “${attribute.label}”` : "Add an attribute"}
      description="Sellers fill it in on the listing form for these categories and their sub-categories. Listings keep the values they saved."
      confirmLabel="Save"
      validate={() => draftProblem(draft)}
      onConfirm={async (reason) => {
        await onSave(bodyOf(draft), reason)
        if (!attribute) setDraft(draftOf())
      }}
      fields={
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pe-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-label`}>Name</Label>
              <Input
                id={`${id}-label`}
                value={draft.label}
                onChange={(e) => set({ label: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-type`}>Type</Label>
              <NativeSelect
                id={`${id}-type`}
                value={draft.type}
                onChange={(e) => set({ type: e.target.value as AttributeType })}
              >
                {ATTRIBUTE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ATTRIBUTE_TYPE_LABELS[type]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {draft.type === "choice" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Options</legend>
              {draft.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    aria-label={`Option ${index + 1}`}
                    value={option.label}
                    onChange={(e) =>
                      set({
                        options: draft.options.map((o) =>
                          o.id === option.id ? { ...o, label: e.target.value } : o
                        ),
                      })
                    }
                  />
                  <Check
                    label="Retired"
                    checked={option.status === "retired"}
                    onChange={(on) =>
                      set({
                        options: draft.options.map((o) =>
                          o.id === option.id
                            ? { ...o, status: on ? "retired" : "active" }
                            : o
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <Label htmlFor={`${id}-new-options`}>Add options (one per line)</Label>
              <Textarea
                id={`${id}-new-options`}
                rows={3}
                value={draft.newOptions}
                onChange={(e) => set({ newOptions: e.target.value })}
              />
            </fieldset>
          )}

          {(draft.type === "number" || draft.type === "text") && (
            <div className="grid gap-3 sm:grid-cols-3">
              {draft.type === "number" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${id}-unit`}>Unit</Label>
                    <Input
                      id={`${id}-unit`}
                      value={draft.unit}
                      placeholder="GB, cm"
                      onChange={(e) => set({ unit: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${id}-min`}>Lowest</Label>
                    <Input
                      id={`${id}-min`}
                      type="number"
                      value={draft.min}
                      onChange={(e) => set({ min: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-max`}>
                  {draft.type === "number" ? "Highest" : "Longest (characters)"}
                </Label>
                <Input
                  id={`${id}-max`}
                  type="number"
                  value={draft.max}
                  onChange={(e) => set({ max: e.target.value })}
                />
              </div>
            </div>
          )}

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-medium">Categories</legend>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {categories.map((category) => (
                <span
                  key={category.id}
                  style={{ paddingInlineStart: `${category.depth}rem` }}
                >
                  <Check
                    label={category.name}
                    checked={draft.categoryIds.includes(category.id)}
                    onChange={() =>
                      set({ categoryIds: toggle(draft.categoryIds, category.id) })
                    }
                  />
                </span>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-medium">Rules</legend>
            <Check
              label="Needed to publish"
              checked={draft.required}
              onChange={(on) => set({ required: on })}
            />
            {draft.required && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 ps-6">
                <span className="text-muted-foreground w-full text-xs">
                  Only for sellers in (none ticked = every country):
                </span>
                {countries.map((country) => (
                  <Check
                    key={country.code}
                    label={country.name}
                    checked={draft.requiredIn.includes(country.code)}
                    onChange={() =>
                      set({ requiredIn: toggle(draft.requiredIn, country.code) })
                    }
                  />
                ))}
              </div>
            )}
            <Check
              label="Shown on the product page"
              checked={draft.public}
              onChange={(on) => set({ public: on })}
            />
            <Check
              label="Found by the search box"
              checked={draft.searchable}
              onChange={(on) => set({ searchable: on })}
            />
            {filterAllowed && (
              <Check
                label="Offered as a filter"
                checked={draft.filterable}
                onChange={(on) => set({ filterable: on })}
              />
            )}
            {attribute && (
              <Check
                label="Retired (no longer on the listing form)"
                checked={draft.status === "retired"}
                onChange={(on) => set({ status: on ? "retired" : "active" })}
              />
            )}
          </fieldset>
        </div>
      }
    />
  )
}
