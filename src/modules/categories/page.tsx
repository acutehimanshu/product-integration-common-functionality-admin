import { Route, Routes } from "react-router"
import { AttributesScreen } from "@/modules/categories/attributes-screen"
import { CategoryTree } from "@/modules/categories/category-tree"
import { ReferenceScreen } from "@/modules/categories/reference-screen"

/** Categories: the tree, category attributes, and brands and conditions. */
export default function CategoriesPage() {
  return (
    <Routes>
      <Route index element={<CategoryTree />} />
      <Route path="attributes" element={<AttributesScreen />} />
      <Route path="reference" element={<ReferenceScreen />} />
    </Routes>
  )
}
