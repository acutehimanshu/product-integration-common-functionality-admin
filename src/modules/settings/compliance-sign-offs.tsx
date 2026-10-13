import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  COMPLIANCE_AREAS,
  COMPLIANCE_AREA_LABELS,
  type AdminCountry,
  type ComplianceArea,
} from "@acutehimanshu/core/domain/country-profile"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"

function SignOff({ code, area }: Readonly<{ code: string; area: ComplianceArea }>) {
  const queryClient = useQueryClient()
  const [reference, setReference] = useState("")
  return (
    <ReasonDialog
      trigger="Sign off"
      triggerLabel={`Sign off ${COMPLIANCE_AREA_LABELS[area]}`}
      title={`Sign off: ${COMPLIANCE_AREA_LABELS[area]}?`}
      description="Record the legal/tax approval this rests on. It switches this on for the country."
      confirmLabel="Sign off"
      noteRequired
      fields={
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`ref-${area}`}>Approval document or ticket</Label>
          <Input
            id={`ref-${area}`}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      }
      onConfirm={async (reason, note = "") => {
        await api.post(`/admin/countries/${code}/compliance`, {
          area,
          reference,
          reason,
          note,
        })
        await queryClient.invalidateQueries({ queryKey: ["admin", "countries", code] })
        toast.success("Signed off")
      }}
    />
  )
}

/**
 * Legal/tax sign-offs (FRD-06 PFS-079): tax collection, import charges and
 * holding buyers' money each need one before they run in this country, when
 * the marketplace settings require sign-offs.
 */
export function ComplianceSignOffs({ country }: Readonly<{ country: AdminCountry }>) {
  const queryClient = useQueryClient()
  return (
    <section
      aria-labelledby="compliance-signoffs"
      className="flex flex-col gap-2 rounded-xl border p-4"
    >
      <Heading as="h2" size="h3" id="compliance-signoffs">
        Compliance sign-offs
      </Heading>
      <ul className="flex flex-col divide-y text-sm">
        {COMPLIANCE_AREAS.map((area) => {
          const signOff = country.compliance?.[area]
          return (
            <li key={area} className="flex flex-wrap items-center gap-3 py-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{COMPLIANCE_AREA_LABELS[area]}</span>
                <Text variant="muted" className="text-xs">
                  {signOff
                    ? `Signed off by ${signOff.by}, ${formatDateTime(signOff.at)} — ${signOff.reference}`
                    : "Not signed off"}
                </Text>
              </div>
              {signOff ? (
                <ReasonDialog
                  trigger="Withdraw"
                  triggerLabel={`Withdraw ${COMPLIANCE_AREA_LABELS[area]}`}
                  title="Withdraw this sign-off?"
                  description="While sign-offs are required, this stops in the country at once."
                  confirmLabel="Withdraw"
                  noteRequired
                  onConfirm={async (reason, note = "") => {
                    await api.post(
                      `/admin/countries/${country.code}/compliance/${area}/revoke`,
                      { reason, note }
                    )
                    await queryClient.invalidateQueries({
                      queryKey: ["admin", "countries", country.code],
                    })
                    toast.success("Sign-off withdrawn")
                  }}
                />
              ) : (
                <SignOff code={country.code} area={area} />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
