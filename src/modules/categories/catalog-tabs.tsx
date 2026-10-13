import { SubNav } from "@/components/sub-nav"

const TABS = [
  { to: "/categories", label: "Category tree", end: true },
  { to: "/categories/attributes", label: "Attributes" },
  { to: "/categories/reference", label: "Brands and conditions" },
]

/** The Categories module's three screens. */
export function CatalogTabs() {
  return <SubNav tabs={TABS} label="Catalogue" />
}
