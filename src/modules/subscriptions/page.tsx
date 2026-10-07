import { Route, Routes } from "react-router"
import { Overview } from "@/modules/subscriptions/overview"
import { PlanEditor } from "@/modules/subscriptions/plan-editor"
import { PlanList } from "@/modules/subscriptions/plan-list"
import { PackEditor } from "@/modules/subscriptions/pack-editor"
import { PackList } from "@/modules/subscriptions/pack-list"
import { SubscriberDetail } from "@/modules/subscriptions/subscriber-detail"
import { SubscriberList } from "@/modules/subscriptions/subscriber-list"

/**
 * Subscriptions: the switches and credit costs, packages, credit packs and
 * subscribers — each its own sub-page.
 */
export default function SubscriptionsPage() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="packages" element={<PlanList />} />
      <Route path="packages/new" element={<PlanEditor />} />
      <Route path="packages/:id" element={<PlanEditor />} />
      <Route path="packs" element={<PackList />} />
      <Route path="packs/new" element={<PackEditor />} />
      <Route path="packs/:id" element={<PackEditor />} />
      <Route path="subscribers" element={<SubscriberList />} />
      <Route path="subscribers/:userId" element={<SubscriberDetail />} />
    </Routes>
  )
}
