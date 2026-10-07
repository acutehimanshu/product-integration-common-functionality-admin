import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { downloadCsv, getErrorMessage } from "@/lib/api"

/** "Download CSV" for an admin list or report (`path` is the export endpoint with its filters). */
export function CsvButton({
  path,
  filename,
  label = "Download CSV",
}: {
  path: string
  filename: string
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await downloadCsv(path, filename)
        } catch (error) {
          toast.error(getErrorMessage(error, "Couldn't download the file."))
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? "Preparing…" : label}
    </Button>
  )
}

/** A list's filters for its export (everything but paging). */
export function exportQuery(params: URLSearchParams): string {
  const query = new URLSearchParams(params)
  query.delete("page")
  query.delete("pageSize")
  return query.toString()
}
