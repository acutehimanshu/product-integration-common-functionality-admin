import { render } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"

/** Renders a screen with a fresh query cache, at `path` under `route`. */
export function renderScreen(ui: ReactNode, path = "/", route = "/*") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** An api.get stand-in that answers by path prefix (longest match wins). */
export function getByPath(fixtures: Record<string, unknown>) {
  return (path: string): Promise<unknown> => {
    const key = Object.keys(fixtures)
      .filter((k) => path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0]
    return key === undefined
      ? Promise.reject(new Error(`No fixture for ${path}`))
      : Promise.resolve(fixtures[key])
  }
}
