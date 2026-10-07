import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router/dom"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "@fontsource-variable/lexend"
import { ThemeProvider } from "@acutehimanshu/ui/components/providers/theme-provider"
import { Toaster } from "@acutehimanshu/ui/components/ui/sonner"
import { ApiError } from "@/lib/api"
import { adminKeys } from "@/lib/auth"
import { router } from "@/router"
import "@/styles.css"

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
  queryCache: new QueryCache({
    // A 401 from any call means the session ended (expired, logged out
    // elsewhere): drop the admin, and <RequireAdmin> sends them to login.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        queryClient.setQueryData(adminKeys.me(), null)
      }
    },
  }),
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)
