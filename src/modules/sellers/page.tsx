import { Route, Routes } from "react-router"
import { SellerQueue } from "@/modules/sellers/seller-queue"
import { SellerReview } from "@/modules/sellers/seller-review"

/** Seller verification: the queue, and one seller's review page. */
export default function SellersPage() {
  return (
    <Routes>
      <Route index element={<SellerQueue />} />
      <Route path=":id" element={<SellerReview />} />
    </Routes>
  )
}
