import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { SELLER_TYPE_LABELS } from "@acutehimanshu/core/domain/seller"
import {
  REGISTRY_KINDS,
  REGISTRY_KIND_LABELS,
  type AdminRequirementSets,
  type RequirementSet,
} from "@acutehimanshu/core/domain/verification"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"

const setsKey = (code: string) => ["admin", "countries", code, "verification"] as const

function SetEditor({ code, set }: Readonly<{ code: string; set: RequirementSet }>) {
  const queryClient = useQueryClient()
  const [identifiers, setIdentifiers] = useState(set.identifiers)
  const [documents, setDocuments] = useState(set.documents.join("\n"))
  const [partnerCheck, setPartnerCheck] = useState(set.partnerCheck)
  const [manualReview, setManualReview] = useState(set.manualReview)
  const [months, setMonths] = useState(set.validityMonths?.toString() ?? "")
  const id = `${code}-${set.sellerType}`
  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">
        {SELLER_TYPE_LABELS[set.sellerType]} sellers · version {set.version}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {REGISTRY_KINDS.map((kind) => (
          <label key={kind} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={identifiers.includes(kind)}
              onChange={(e) =>
                setIdentifiers(
                  e.target.checked
                    ? [...identifiers, kind]
                    : identifiers.filter((k) => k !== kind)
                )
              }
            />
            {REGISTRY_KIND_LABELS[kind]}
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-docs`}>Documents (one per line)</Label>
        <Textarea
          id={`${id}-docs`}
          value={documents}
          onChange={(e) => setDocuments(e.target.value)}
          placeholder="Proof of identity"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={partnerCheck}
          onChange={(e) => setPartnerCheck(e.target.checked)}
        />
        Payment partner checks identity and bank details
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={manualReview}
          onChange={(e) => setManualReview(e.target.checked)}
        />
        A Marketbase admin reviews every submission
      </label>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-months`}>Valid for (months; empty = no expiry)</Label>
        <Input
          id={`${id}-months`}
          type="number"
          min={1}
          max={60}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="w-32"
        />
      </div>
      <div>
        <ReasonDialog
          trigger={`Save ${SELLER_TYPE_LABELS[set.sellerType].toLowerCase()} requirements`}
          title="Change what sellers need to be verified?"
          description="New submissions use it. Cases already sent keep the requirements they met."
          confirmLabel="Save"
          noteRequired
          onConfirm={async (reason, note = "") => {
            await api.put<RequirementSet>(
              `/admin/countries/${code}/verification/${set.sellerType}`,
              {
                identifiers,
                documents: documents
                  .split("\n")
                  .map((d) => d.trim())
                  .filter(Boolean),
                partnerCheck,
                manualReview,
                validityMonths: months.trim() ? Number(months) : null,
                reason,
                note,
              }
            )
            await queryClient.invalidateQueries({ queryKey: setsKey(code) })
            toast.success("Requirements saved")
          }}
        />
      </div>
    </fieldset>
  )
}

/** Country Master › seller verification requirements (FRD-03 03-007; FRD-02 CFG-033). */
export function VerificationRequirements({ code }: Readonly<{ code: string }>) {
  const { data } = useQuery({
    queryKey: setsKey(code),
    queryFn: ({ signal }) =>
      api.get<AdminRequirementSets>(`/admin/countries/${code}/verification`, { signal }),
  })
  return (
    <section
      aria-labelledby="country-verification"
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <Heading as="h2" size="h3" id="country-verification">
        Seller verification
      </Heading>
      <Text variant="muted" className="text-sm">
        What sellers here must provide, by seller type. Registry numbers are checked with
        the verification partner; documents are private.
      </Text>
      {!data ? (
        <Skeleton className="h-32" />
      ) : (
        data.sets.map((set) => (
          <SetEditor key={`${set.sellerType}-${set.version}`} code={code} set={set} />
        ))
      )}
    </section>
  )
}
