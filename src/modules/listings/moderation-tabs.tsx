import { SubNav } from "@/components/sub-nav"

const TABS = [
  { to: "/listings", label: "Reports and checks", end: true },
  { to: "/listings/reviews", label: "Waiting for review" },
  { to: "/listings/restrictions", label: "Restricted items" },
]

/** Listing moderation's screens. */
export function ModerationTabs() {
  return <SubNav tabs={TABS} label="Listing moderation" />
}
