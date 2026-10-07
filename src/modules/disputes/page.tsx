import { Route, Routes } from "react-router"
import { DisputeList } from "@/modules/disputes/dispute-list"
import { DisputeReview } from "@/modules/disputes/dispute-review"

/** Disputes: escalated problem reports, and deciding one. */
export default function DisputesPage() {
  return (
    <Routes>
      <Route index element={<DisputeList />} />
      <Route path=":id" element={<DisputeReview />} />
    </Routes>
  )
}
