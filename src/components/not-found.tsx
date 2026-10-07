import { Link } from "react-router"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { usePageTitle } from "@/lib/use-page-title"

/** Unknown URL — including a switched-off module's (it has no route). */
export function NotFound() {
  usePageTitle("Page not found")
  return (
    <PageContainer center>
      <Card className="w-full">
        <CardHeader>
          <Heading as="h1" size="h3">
            Page not found
          </Heading>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            We couldn&apos;t find the page you were looking for.
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
