import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ATTRIBUTE_TYPE_LABELS,
  type AttributeDefinition,
} from "@acutehimanshu/core/domain/attributes"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import {
  AttributeEditor,
  type AttributeBody,
} from "@/modules/categories/attribute-editor"
import { CatalogTabs } from "@/modules/categories/catalog-tabs"

const attributeKeys = { all: ["admin", "attributes"] as const }

/** Admin › Categories › Attributes (FRD-04 CAT-006..011). */
export function AttributesScreen() {
  usePageTitle("Attributes")
  const queryClient = useQueryClient()
  const attributes = useQuery({
    queryKey: attributeKeys.all,
    queryFn: ({ signal }) =>
      api.get<AttributeDefinition[]>("/admin/attributes", { signal }),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: ({ signal }) => api.get<AdminCategory[]>("/admin/categories", { signal }),
  })
  const { data: countries = [] } = useQuery({
    queryKey: ["admin", "countries", "list"],
    queryFn: ({ signal }) => api.get<SupportedCountry[]>("/admin/countries", { signal }),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: attributeKeys.all })
  const save =
    (attribute?: AttributeDefinition) => async (body: AttributeBody, reason: string) => {
      if (attribute)
        await api.put(`/admin/attributes/${attribute.id}`, { ...body, reason })
      else await api.post("/admin/attributes", { ...body, reason })
      await refresh()
      toast.success("Attribute saved")
    }
  const nameOf = (id: string) =>
    categories.find((c) => c.id === id)?.path.join(" › ") ?? id

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading>Categories</Heading>
          <Text variant="muted">
            Fields sellers fill in for a category: typed, some needed to publish, some
            shown as filters.
          </Text>
        </div>
        <AttributeEditor categories={categories} countries={countries} onSave={save()} />
      </div>
      <CatalogTabs />
      {attributes.error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(attributes.error, "Couldn't load attributes.")}
        </Text>
      )}
      {attributes.isPending && <Skeleton className="h-64" />}
      {attributes.data && (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Attributes">
          {attributes.data.map((attribute) => (
            <li
              key={attribute.id}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {attribute.label}
                  <Badge variant="outline">{ATTRIBUTE_TYPE_LABELS[attribute.type]}</Badge>
                  {attribute.required && (
                    <Badge variant="secondary">
                      Required
                      {attribute.requiredIn.length
                        ? ` in ${attribute.requiredIn.join(", ")}`
                        : ""}
                    </Badge>
                  )}
                  {attribute.filterable && <Badge variant="secondary">Filter</Badge>}
                  {attribute.status === "retired" && (
                    <Badge variant="outline">Retired</Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {attribute.categoryIds.map(nameOf).join(", ")}
                  {attribute.options?.length
                    ? ` · ${attribute.options
                        .filter((o) => o.status === "active")
                        .map((o) => o.label)
                        .join(", ")}`
                    : ""}
                </span>
              </div>
              <AttributeEditor
                attribute={attribute}
                categories={categories}
                countries={countries}
                onSave={save(attribute)}
              />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
