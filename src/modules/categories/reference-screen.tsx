import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Brand, ConditionSetting } from "@acutehimanshu/core/domain/attributes"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"
import { CatalogTabs } from "@/modules/categories/catalog-tabs"

const keys = {
  brands: ["admin", "brands"] as const,
  conditions: ["admin", "conditions"] as const,
}

function NameDialog({
  trigger,
  title,
  initial,
  onSave,
  triggerLabel,
}: Readonly<{
  trigger: string
  title: string
  initial: string
  triggerLabel?: string
  onSave: (name: string, reason: string) => Promise<void>
}>) {
  const [name, setName] = useState(initial)
  return (
    <ReasonDialog
      trigger={trigger}
      triggerVariant={initial ? "outline" : "default"}
      triggerLabel={triggerLabel}
      title={title}
      description="Listings keep what they were saved with."
      confirmLabel="Save"
      validate={() => (name.trim() ? null : "Enter a name.")}
      fields={
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`name-${trigger}-${initial}`}>Name</Label>
          <Input
            id={`name-${trigger}-${initial}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      }
      onConfirm={async (reason) => {
        await onSave(name.trim(), reason)
        if (!initial) setName("")
      }}
    />
  )
}

/**
 * Admin › Categories › Brands and conditions (FRD-04 CAT-012/063): the lists
 * the listing form offers. Retiring takes an item off the form; listings
 * that use it keep it.
 */
export function ReferenceScreen() {
  usePageTitle("Brands and conditions")
  const queryClient = useQueryClient()
  const brands = useQuery({
    queryKey: keys.brands,
    queryFn: ({ signal }) => api.get<Brand[]>("/admin/brands", { signal }),
  })
  const conditions = useQuery({
    queryKey: keys.conditions,
    queryFn: ({ signal }) => api.get<ConditionSetting[]>("/admin/conditions", { signal }),
  })
  const refreshBrands = () => queryClient.invalidateQueries({ queryKey: keys.brands })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Categories</Heading>
        <Text variant="muted">Brands and conditions sellers choose from.</Text>
      </div>
      <CatalogTabs />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <Heading as="h2" size="h3">
            Brands
          </Heading>
          <NameDialog
            trigger="Add a brand"
            title="Add a brand"
            initial=""
            onSave={async (name, reason) => {
              await api.post("/admin/brands", { name, reason })
              await refreshBrands()
              toast.success("Brand added")
            }}
          />
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y text-sm" aria-label="Brands">
            {brands.data?.map((brand) => (
              <li key={brand.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="flex-1 font-medium">
                  {brand.name}{" "}
                  {brand.status === "retired" && <Badge variant="outline">Retired</Badge>}
                </span>
                <span className="text-muted-foreground text-xs">
                  {brand.listings} listing{brand.listings === 1 ? "" : "s"}
                </span>
                <NameDialog
                  trigger="Rename"
                  triggerLabel={`Rename ${brand.name}`}
                  title={`Rename “${brand.name}”`}
                  initial={brand.name}
                  onSave={async (name, reason) => {
                    await api.patch(`/admin/brands/${brand.id}`, { name, reason })
                    await refreshBrands()
                    toast.success("Brand saved")
                  }}
                />
                <ReasonDialog
                  trigger={brand.status === "retired" ? "Bring back" : "Retire"}
                  triggerVariant="outline"
                  triggerLabel={`${brand.status === "retired" ? "Bring back" : "Retire"} ${brand.name}`}
                  title={
                    brand.status === "retired"
                      ? `Offer “${brand.name}” again?`
                      : `Retire “${brand.name}”?`
                  }
                  description="Only the listing form changes; listings keep their brand."
                  confirmLabel="Save"
                  onConfirm={async (reason) => {
                    await api.patch(`/admin/brands/${brand.id}`, {
                      status: brand.status === "retired" ? "active" : "retired",
                      reason,
                    })
                    await refreshBrands()
                    toast.success("Brand saved")
                  }}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Heading as="h2" size="h3">
            Conditions
          </Heading>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y text-sm" aria-label="Conditions">
            {conditions.data?.map((setting) => (
              <li
                key={setting.condition}
                className="flex flex-wrap items-center gap-2 py-2"
              >
                <span className="flex-1 font-medium">
                  {setting.label}{" "}
                  {setting.status === "retired" && (
                    <Badge variant="outline">Retired</Badge>
                  )}
                </span>
                <NameDialog
                  trigger="Rename"
                  triggerLabel={`Rename ${setting.label}`}
                  title={`Rename “${setting.label}”`}
                  initial={setting.label}
                  onSave={async (label, reason) => {
                    queryClient.setQueryData(
                      keys.conditions,
                      await api.patch<ConditionSetting[]>(
                        `/admin/conditions/${setting.condition}`,
                        { label, reason }
                      )
                    )
                    toast.success("Condition saved")
                  }}
                />
                <ReasonDialog
                  trigger={setting.status === "retired" ? "Bring back" : "Retire"}
                  triggerVariant="outline"
                  triggerLabel={`${setting.status === "retired" ? "Bring back" : "Retire"} ${setting.label}`}
                  title={
                    setting.status === "retired"
                      ? `Offer “${setting.label}” again?`
                      : `Retire “${setting.label}”?`
                  }
                  description="New listings can't choose a retired condition; listings that have it keep it."
                  confirmLabel="Save"
                  onConfirm={async (reason) => {
                    queryClient.setQueryData(
                      keys.conditions,
                      await api.patch<ConditionSetting[]>(
                        `/admin/conditions/${setting.condition}`,
                        {
                          status: setting.status === "retired" ? "active" : "retired",
                          reason,
                        }
                      )
                    )
                    toast.success("Condition saved")
                  }}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
