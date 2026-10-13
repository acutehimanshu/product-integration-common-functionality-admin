import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"

/** Marketbase sets a listing's stock, with a reason (FRD-04 CAT-040). */
export function StockAdjust({
  listingId,
  available,
  onSaved,
}: Readonly<{ listingId: string; available: number; onSaved: () => Promise<unknown> }>) {
  const [value, setValue] = useState(String(available))
  // One key per dialog: a retried save applies once (CAT-038).
  const [key] = useState(() => crypto.randomUUID())
  return (
    <ReasonDialog
      trigger="Adjust stock"
      triggerVariant="outline"
      title="Adjust stock"
      description="The seller sees the change and your reason in the listing's history."
      confirmLabel="Save"
      validate={() =>
        /^\d{1,4}$/.test(value.trim()) ? null : "Enter a whole number from 0 to 9999."
      }
      fields={
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stock-available">Available</Label>
          <Input
            id="stock-available"
            type="number"
            min={0}
            max={9999}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      }
      onConfirm={async (reason) => {
        await api.post(`/admin/listings/${encodeURIComponent(listingId)}/stock`, {
          available: Number(value),
          reason,
          key,
        })
        await onSaved()
        toast.success("Stock saved")
      }}
    />
  )
}
