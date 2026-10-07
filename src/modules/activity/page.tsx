import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { ActivityLog } from "@/components/activity-log"
import { usePageTitle } from "@/lib/use-page-title"

/** The super admin's view of everything every admin did — their own included. */
export default function ActivityPage() {
  usePageTitle("Activity log")
  return (
    <PageContainer maxWidth="6xl">
      <div className="flex flex-col gap-1">
        <Heading>Activity log</Heading>
        <Text variant="muted">
          Every admin, from login to logout: what they opened, added, changed and deleted.
          Only you can see this.
        </Text>
      </div>
      <ActivityLog />
    </PageContainer>
  )
}
