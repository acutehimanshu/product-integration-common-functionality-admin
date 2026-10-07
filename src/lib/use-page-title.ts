import { useEffect } from "react"

/** "Users" → the tab reads "Users | Marketbase Admin". */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | Marketbase Admin`
  }, [title])
}
