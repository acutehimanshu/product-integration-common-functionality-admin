import { useRouteError } from "react-router"
import { ErrorFallback } from "@acutehimanshu/ui/components/error-fallback"

/** Anything a screen throws while rendering lands here instead of a blank page. */
export function RouteError() {
  const error = useRouteError()
  return (
    <ErrorFallback
      error={error instanceof Error ? error : new Error(String(error))}
      retry={() => window.location.reload()}
    />
  )
}
