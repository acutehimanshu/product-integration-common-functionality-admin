import { Route, Routes } from "react-router"
import { ModerationQueue } from "@/modules/listings/moderation-queue"
import { ModerationReview } from "@/modules/listings/moderation-review"

/** Listing moderation: reported listings, and one listing's review page. */
export default function ListingsPage() {
  return (
    <Routes>
      <Route index element={<ModerationQueue />} />
      <Route path=":id" element={<ModerationReview />} />
    </Routes>
  )
}
