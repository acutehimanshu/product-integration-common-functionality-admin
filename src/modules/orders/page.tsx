import { Route, Routes } from "react-router"
import { OrderList } from "@/modules/orders/order-list"
import { OrderReview } from "@/modules/orders/order-review"

/** Orders: every order (late shipments first), and one order's page. */
export default function OrdersPage() {
  return (
    <Routes>
      <Route index element={<OrderList />} />
      <Route path=":id" element={<OrderReview />} />
    </Routes>
  )
}
