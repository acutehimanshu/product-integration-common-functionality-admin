import { Route, Routes } from "react-router"
import { ModerationQueue } from "@/modules/listings/moderation-queue"
import { ModerationReview } from "@/modules/listings/moderation-review"
import { RestrictionsScreen } from "@/modules/listings/restrictions-screen"
import { ReviewQueue } from "@/modules/listings/review-queue"

/** Listing moderation: reported listings, and one listing's review page. */
export default function ListingsPage() {
  return (
    <Routes>
      <Route index element={<ModerationQueue />} />
      <Route path="reviews" element={<ReviewQueue />} />
      <Route path="restrictions" element={<RestrictionsScreen />} />
      <Route path=":id" element={<ModerationReview />} />
    </Routes>
  )
}
