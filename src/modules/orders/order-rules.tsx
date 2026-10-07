import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AdminOrderDetail } from "@acutehimanshu/core/domain/admin-orders"
import type { AuditEntry } from "@acutehimanshu/core/domain/admin-audit"
import {
  ORDER_RULE_KEYS,
  RULE_INFO,
  ruleProblem,
  GLOBAL_SCOPE,
  type AppliedRules,
  type OrderRuleKey,
} from "@acutehimanshu/core/domain/rules"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { ReasonDialog } from "@/components/reason-dialog"
import { api } from "@/lib/api"
import { orderKeys } from "@/modules/orders/api"

/**
 * The rules an order was placed under (BR-054), and the per-order override
 * — the BRD's "transaction" rule level. A big action.
 */
export function OrderRules({ id, rules }: { id: string; rules: AppliedRules | null }) {
  const queryClient = useQueryClient()
  const [key, setKey] = useState<OrderRuleKey>("problemWindowDays")
  const [value, setValue] = useState("")
  if (!rules) {
    return (
      <Text variant="muted" className="text-sm">
        Placed before rule snapshots: it follows the current settings.
      </Text>
    )
  }
  return (
    <section aria-labelledby="order-rules-heading" className="flex flex-col gap-2">
      <Heading as="h2" size="h3" id="order-rules-heading">
        Rules this order follows
      </Heading>
      <Text variant="muted" className="text-sm">
        Fixed when it was placed; later changes to settings and rules don&apos;t affect
        it.
      </Text>
      <table className="w-full text-left text-sm" aria-label="Rules this order follows">
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="py-1 pr-3 font-medium">
              Rule
            </th>
            <th scope="col" className="py-1 pr-3 font-medium">
              Value
            </th>
            <th scope="col" className="py-1 font-medium">
              From
            </th>
          </tr>
        </thead>
        <tbody>
          {ORDER_RULE_KEYS.map((k) => (
            <tr key={k} className="border-t">
              <th scope="row" className="py-1 pr-3 font-normal">
                {RULE_INFO[k].label}
              </th>
              <td className="py-1 pr-3">
                {rules[k].value} {RULE_INFO[k].unit}
              </td>
              <td className="py-1">{rules[k].source}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <ReasonDialog
          trigger="Change a rule on this order"
          title="Change a rule on this order?"
          description="Only this order changes. The buyer and seller see the new dates and fee."
          confirmLabel="Change rule"
          noteRequired
          fields={
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="order-rule-key">Rule</Label>
                <NativeSelect
                  id="order-rule-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value as OrderRuleKey)}
                >
                  {ORDER_RULE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {RULE_INFO[k].label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="order-rule-value">
                  New value ({RULE_INFO[key].unit})
                </Label>
                <Input
                  id="order-rule-value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>
          }
          validate={() =>
            value.trim() === ""
              ? "Enter the new value."
              : ruleProblem({ key, value: Number(value), scope: GLOBAL_SCOPE })
          }
          onConfirm={async (reason, note = "") => {
            const result = await api.post<{ rules: AppliedRules; history: AuditEntry[] }>(
              `/admin/orders/${id}/rules`,
              { key, value: Number(value), reason, note }
            )
            queryClient.setQueryData<AdminOrderDetail>(orderKeys.detail(id), (old) =>
              old ? { ...old, rules: result.rules, history: result.history } : old
            )
            await queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) })
            setValue("")
            toast.success("Rule changed on this order")
          }}
        />
      </div>
    </section>
  )
}
