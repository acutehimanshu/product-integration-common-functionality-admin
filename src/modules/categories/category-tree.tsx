import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
import { descendantIds } from "@acutehimanshu/core/domain/categories"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import { CatalogTabs } from "@/modules/categories/catalog-tabs"

const categoryKeys = { all: ["admin", "categories"] as const }

const parseDetails = (text: string) =>
  text
    .split(",")
    .map((detail) => detail.trim())
    .filter(Boolean)

type Draft = { name: string; details: string; parentId: string; countries: string[] }

const draftOf = (category?: AdminCategory): Draft => ({
  name: category?.name ?? "",
  details: (category?.suggestedDetails ?? []).join(", "),
  parentId: category?.parentId ?? "",
  countries: category?.countries ?? [],
})

const inputOf = (draft: Draft) => ({
  name: draft.name.trim(),
  suggestedDetails: parseDetails(draft.details),
  parentId: draft.parentId || null,
  countries: draft.countries,
})

/** Name, parent, countries and suggested details, shared by Add and Edit. */
function CategoryFields({
  idPrefix,
  draft,
  setDraft,
  categories,
  countries,
  editingId,
}: Readonly<{
  idPrefix: string
  draft: Draft
  setDraft: (draft: Draft) => void
  categories: AdminCategory[]
  countries: SupportedCountry[]
  editingId?: string
}>) {
  // A category can't go under itself or its own sub-categories (CAT-002).
  const excluded = editingId ? descendantIds(categories, editingId) : new Set<string>()
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })
  const name = draft.name
  const setName = (value: string) => set({ name: value })
  const details = draft.details
  const setDetails = (value: string) => set({ details: value })
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-details`}>Suggested details</Label>
        <Input
          id={`${idPrefix}-details`}
          value={details}
          placeholder="Size, Colour, Brand"
          onChange={(e) => setDetails(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Comma-separated. Offered to sellers listing in this category.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-parent`}>Inside</Label>
        <NativeSelect
          id={`${idPrefix}-parent`}
          value={draft.parentId}
          onChange={(e) => set({ parentId: e.target.value })}
        >
          <option value="">Top level</option>
          {categories
            .filter((c) => !excluded.has(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.path.join(" › ")}
              </option>
            ))}
        </NativeSelect>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium">
          Offered in (none ticked = every country)
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {countries.map((country) => {
            const on = draft.countries.includes(country.code)
            return (
              <label key={country.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    set({
                      countries: on
                        ? draft.countries.filter((c) => c !== country.code)
                        : [...draft.countries, country.code],
                    })
                  }
                />
                {country.name}
              </label>
            )
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          A sub-category is only offered where its parent is.
        </p>
      </fieldset>
    </>
  )
}

/** What moving it or offering it in fewer places does to its listings (CAT-005). */
const impactNote = (category: AdminCategory) =>
  category.activeListings > 0
    ? ` Moving it or taking a country away puts its ${category.activeListings} active listing(s) in Listing moderation for a check — they stay on sale.`
    : ""

function EditCategory({
  category,
  categories,
  countries,
  onSaved,
}: Readonly<{
  category: AdminCategory
  categories: AdminCategory[]
  countries: SupportedCountry[]
  onSaved: () => void
}>) {
  const [draft, setDraft] = useState(() => draftOf(category))
  return (
    <ReasonDialog
      trigger="Edit"
      triggerLabel={`Edit ${category.name}`}
      title={`Edit “${category.name}”`}
      description={`The web address stays the same, so links keep working.${impactNote(category)}`}
      fields={
        <CategoryFields
          idPrefix={`edit-${category.id}`}
          draft={draft}
          setDraft={setDraft}
          categories={categories}
          countries={countries}
          editingId={category.id}
        />
      }
      validate={() => (draft.name.trim().length < 2 ? "Enter a name." : null)}
      confirmLabel="Save"
      onConfirm={async (reason) => {
        await api.patch(`/admin/categories/${category.id}`, { ...inputOf(draft), reason })
        onSaved()
        toast.success("Category saved")
      }}
    />
  )
}

function AddCategory({
  categories,
  countries,
  onSaved,
}: Readonly<{
  categories: AdminCategory[]
  countries: SupportedCountry[]
  onSaved: () => void
}>) {
  const [draft, setDraft] = useState(() => draftOf())
  return (
    <ReasonDialog
      trigger="Add a category"
      triggerVariant="default"
      title="Add a category"
      description="It appears in browse menus and the listing form straight away."
      fields={
        <CategoryFields
          idPrefix="add"
          draft={draft}
          setDraft={setDraft}
          categories={categories}
          countries={countries}
        />
      }
      validate={() => (draft.name.trim().length < 2 ? "Enter a name." : null)}
      confirmLabel="Add"
      onConfirm={async (reason) => {
        await api.post("/admin/categories", { ...inputOf(draft), reason })
        setDraft(draftOf())
        onSaved()
        toast.success("Category added")
      }}
    />
  )
}

export function CategoryTree() {
  usePageTitle("Categories")
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: categoryKeys.all,
    queryFn: ({ signal }) => api.get<AdminCategory[]>("/admin/categories", { signal }),
  })
  const { data: countries = [] } = useQuery({
    queryKey: ["admin", "countries", "list"],
    queryFn: ({ signal }) => api.get<SupportedCountry[]>("/admin/countries", { signal }),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: categoryKeys.all })
  const all = data ?? []
  // Up/down moves among siblings (same parent).
  const siblingsOf = (category: AdminCategory) =>
    all.filter((c) => c.parentId === category.parentId)

  const move = async (category: AdminCategory, direction: "up" | "down") => {
    try {
      queryClient.setQueryData(
        categoryKeys.all,
        await api.post<AdminCategory[]>(`/admin/categories/${category.id}/move`, {
          direction,
        })
      )
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't move it."))
    }
  }

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading>Categories</Heading>
          <Text variant="muted">
            What buyers browse and sellers list in, in this order.
          </Text>
        </div>
        <AddCategory categories={all} countries={countries} onSaved={refresh} />
      </div>
      <CatalogTabs />

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load categories.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <ol className="flex flex-col divide-y rounded-xl border" aria-label="Categories">
          {data.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
              style={{ paddingInlineStart: `${0.75 + category.depth * 1.5}rem` }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 font-medium">
                  {category.name}
                  {category.hidden && <Badge variant="outline">Hidden</Badge>}
                  {category.countries?.length ? (
                    <Badge variant="secondary">{category.countries.join(", ")}</Badge>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  /c/{category.slug} · {category.listingCount} listing
                  {category.listingCount === 1 ? "" : "s"}
                  {category.suggestedDetails?.length
                    ? ` · suggests ${category.suggestedDetails.join(", ")}`
                    : ""}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={siblingsOf(category)[0]?.id === category.id}
                  aria-label={`Move ${category.name} up`}
                  onClick={() => move(category, "up")}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={siblingsOf(category).at(-1)?.id === category.id}
                  aria-label={`Move ${category.name} down`}
                  onClick={() => move(category, "down")}
                >
                  ↓
                </Button>
                <EditCategory
                  category={category}
                  categories={all}
                  countries={countries}
                  onSaved={refresh}
                />
                <ReasonDialog
                  trigger={category.hidden ? "Show" : "Hide"}
                  title={
                    category.hidden
                      ? `Show “${category.name}” again?`
                      : `Hide “${category.name}”?`
                  }
                  description={
                    category.hidden
                      ? "It goes back into browse menus and the listing form."
                      : `It and its sub-categories leave browse menus and the listing form. Their listings stay on sale and in search.${impactNote(category)}`
                  }
                  confirmLabel={category.hidden ? "Show" : "Hide"}
                  noteRequired={!category.hidden}
                  onConfirm={async (reason, note) => {
                    await api.patch(`/admin/categories/${category.id}`, {
                      hidden: !category.hidden,
                      reason,
                      note,
                    })
                    await refresh()
                    toast.success(category.hidden ? "Category shown" : "Category hidden")
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </PageContainer>
  )
}
