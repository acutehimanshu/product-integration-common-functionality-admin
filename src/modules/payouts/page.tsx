import { Route, Routes } from "react-router"
import { Ledger } from "@/modules/payouts/ledger"
import { PayoutList } from "@/modules/payouts/payout-list"
import { SellerPayouts } from "@/modules/payouts/seller-payouts"

/** Payouts: every seller's money, and one seller's lines (hold / release). */
export default function PayoutsPage() {
  return (
    <Routes>
      <Route index element={<PayoutList />} />
      <Route path="ledger" element={<Ledger />} />
      <Route path=":sellerId" element={<SellerPayouts />} />
    </Routes>
  )
}
