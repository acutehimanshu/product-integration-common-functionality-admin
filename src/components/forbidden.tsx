import { Link } from "react-router"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { usePageTitle } from "@/lib/use-page-title"

/** A section outside this admin's roles. */
export function Forbidden() {
  usePageTitle("No access")
  return (
    <PageContainer center>
      <Card className="w-full">
        <CardHeader>
          <Heading as="h1" size="h3">
            You don&apos;t have access to this
          </Heading>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Your admin role doesn&apos;t include this section. Ask a super admin if you
            need it.
          </p>
          <Link
            to="/"
            className="text-foreground text-sm underline-offset-4 hover:underline"
          >
            Back to the dashboard
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
