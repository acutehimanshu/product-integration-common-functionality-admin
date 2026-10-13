import { Route, Routes } from "react-router"
import { OrderList } from "@/modules/orders/order-list"
import { OrderReview } from "@/modules/orders/order-review"
import { ReconcileQueue } from "@/modules/orders/reconcile-queue"
import { CheckoutDetailPage } from "@/modules/orders/checkout-detail"
import { PaymentExceptions } from "@/modules/orders/payment-exceptions"
import { Shipments } from "@/modules/orders/shipments"
import { RequestDetailPage, RequestList } from "@/modules/orders/requests"
import { OfferList } from "@/modules/orders/offers"

/** Orders: every order (late shipments first), and one order's page. */
export default function OrdersPage() {
  return (
    <Routes>
      <Route index element={<OrderList />} />
      <Route path="reconcile" element={<ReconcileQueue />} />
      <Route path="checkouts/:id" element={<CheckoutDetailPage />} />
      <Route path="payment-exceptions" element={<PaymentExceptions />} />
      <Route path="shipments" element={<Shipments />} />
      <Route path="requests" element={<RequestList />} />
      <Route path="requests/:id" element={<RequestDetailPage />} />
      <Route path="offers" element={<OfferList />} />
      <Route path=":id" element={<OrderReview />} />
    </Routes>
  )
}
