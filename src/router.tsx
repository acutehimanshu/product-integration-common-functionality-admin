import { lazy } from "react"
import { createBrowserRouter, type RouteObject } from "react-router"
import { AdminLayout } from "@/components/admin-layout"
import { ModuleScreen } from "@/components/module-screen"
import { NotFound } from "@/components/not-found"
import { RequireAdmin } from "@/components/require-admin"
import { RouteError } from "@/components/route-error"
import { LoginPage } from "@/components/login-page"
import { MyAccount } from "@/components/my-account"
import { enabledModules } from "@/modules"

// Only enabled modules get a route, so a switched-off module's URLs fall
// through to "Page not found". Each module owns everything under its path
// ("/users/*"), so its sub-pages don't touch this file.
const moduleRoutes: RouteObject[] = enabledModules.map((module) => {
  const path = module.routes?.[0]
  // The module engine requires a route per module (src/modules/index.test.ts).
  if (!path) throw new Error(`Module ${module.id} has no route`)
  // lazy() once per module, here — each screen is its own code chunk.
  const element = <ModuleScreen module={module} screen={lazy(module.load)} />
  return path === "/" ? { index: true, element } : { path: `${path.slice(1)}/*`, element }
})

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        path: "/",
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          ...moduleRoutes,
          // Every admin's own page — not a module, can't be switched off.
          { path: "account", element: <MyAccount /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
])
