import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
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

const categoryKeys = { all: ["admin", "categories"] as const }

const parseDetails = (text: string) =>
  text
    .split(",")
    .map((detail) => detail.trim())
    .filter(Boolean)

/** Name + suggested details, shared by Add and Edit. */
function CategoryFields({
  idPrefix,
  name,
  setName,
  details,
  setDetails,
}: {
  idPrefix: string
  name: string
  setName: (value: string) => void
  details: string
  setDetails: (value: string) => void
}) {
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
    </>
  )
}

function EditCategory({
  category,
  onSaved,
}: {
  category: AdminCategory
  onSaved: () => void
}) {
  const [name, setName] = useState(category.name)
  const [details, setDetails] = useState((category.suggestedDetails ?? []).join(", "))
  return (
    <ReasonDialog
      trigger="Edit"
      title={`Edit “${category.name}”`}
      description="The web address stays the same, so links keep working."
      fields={
        <CategoryFields
          idPrefix={`edit-${category.id}`}
          name={name}
          setName={setName}
          details={details}
          setDetails={setDetails}
        />
      }
      validate={() => (name.trim().length < 2 ? "Enter a name." : null)}
      confirmLabel="Save"
      onConfirm={async (reason) => {
        await api.patch(`/admin/categories/${category.id}`, {
          name: name.trim(),
          suggestedDetails: parseDetails(details),
          reason,
        })
        onSaved()
        toast.success("Category saved")
      }}
    />
  )
}

function AddCategory({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("")
  const [details, setDetails] = useState("")
  return (
    <ReasonDialog
      trigger="Add a category"
      triggerVariant="default"
      title="Add a category"
      description="It appears in browse menus and the listing form straight away."
      fields={
        <CategoryFields
          idPrefix="add"
          name={name}
          setName={setName}
          details={details}
          setDetails={setDetails}
        />
      }
      validate={() => (name.trim().length < 2 ? "Enter a name." : null)}
      confirmLabel="Add"
      onConfirm={async (reason) => {
        await api.post("/admin/categories", {
          name: name.trim(),
          suggestedDetails: parseDetails(details),
          reason,
        })
        setName("")
        setDetails("")
        onSaved()
        toast.success("Category added")
      }}
    />
  )
}

export default function CategoriesPage() {
  usePageTitle("Categories")
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: categoryKeys.all,
    queryFn: ({ signal }) => api.get<AdminCategory[]>("/admin/categories", { signal }),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: categoryKeys.all })

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
        <AddCategory onSaved={refresh} />
      </div>

      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load categories.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <ol className="flex flex-col divide-y rounded-xl border" aria-label="Categories">
          {data.map((category, index) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 font-medium">
                  {category.name}
                  {category.hidden && <Badge variant="outline">Hidden</Badge>}
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
                  disabled={index === 0}
                  aria-label={`Move ${category.name} up`}
                  onClick={() => move(category, "up")}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === data.length - 1}
                  aria-label={`Move ${category.name} down`}
                  onClick={() => move(category, "down")}
                >
                  ↓
                </Button>
                <EditCategory category={category} onSaved={refresh} />
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
                      : "It leaves browse menus and the listing form. Its listings stay on sale and in search."
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
