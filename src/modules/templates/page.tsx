import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, Route, Routes, useParams } from "react-router"
import { toast } from "sonner"
import {
  TEMPLATE_SAMPLE_VALUES,
  renderTemplate,
  unknownPlaceholders,
  type AdminTemplate,
} from "@acutehimanshu/core/domain/notification-templates"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"

const templateKeys = { all: ["admin", "templates"] as const }

const PORTAL_LABELS = { buyer: "To buyers", seller: "To sellers", both: "To either side" }

function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: ({ signal }) => api.get<AdminTemplate[]>("/admin/templates", { signal }),
  })
}

/** Notification templates: the list, and one template's editor. */
export default function TemplatesPage() {
  return (
    <Routes>
      <Route index element={<TemplateList />} />
      <Route path=":id" element={<TemplateEditor />} />
    </Routes>
  )
}

function TemplateList() {
  usePageTitle("Notification templates")
  const { data, isPending, error } = useTemplates()
  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Notification templates</Heading>
        <Text variant="muted">
          The wording of every message people get — in the app, by email and by SMS.
          Change any of them; reset to go back to the default.
        </Text>
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load templates.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-60" />
      ) : (
        (["buyer", "seller", "both"] as const).map((portal) => (
          <section
            key={portal}
            aria-labelledby={`templates-${portal}`}
            className="flex flex-col gap-2"
          >
            <Heading as="h2" size="h3" id={`templates-${portal}`}>
              {PORTAL_LABELS[portal]}
            </Heading>
            <ul
              aria-label={PORTAL_LABELS[portal]}
              className="flex flex-col divide-y rounded-xl border text-sm"
            >
              {data
                .filter((template) => template.portal === portal)
                .map((template) => (
                  <li key={template.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link to={template.id} className="font-medium hover:underline">
                        {template.label}
                      </Link>
                      <span className="text-muted-foreground truncate">
                        {(template.custom ?? template).title}
                      </span>
                    </div>
                    {template.custom && <Badge variant="secondary">Edited</Badge>}
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </PageContainer>
  )
}

function TemplateEditor() {
  const { id = "" } = useParams()
  const { data, isPending, error } = useTemplates()
  const template = data?.find((t) => t.id === id)
  usePageTitle(template?.label ?? "Template")
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/templates" className="text-muted-foreground text-sm hover:underline">
        ← Notification templates
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the template.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-80" />
      ) : !template ? (
        <Text>There&apos;s no template called {id}.</Text>
      ) : (
        <Editor key={JSON.stringify(template.custom)} template={template} />
      )}
    </PageContainer>
  )
}

function Editor({ template }: { template: AdminTemplate }) {
  const queryClient = useQueryClient()
  const current = template.custom ?? template
  const [title, setTitle] = useState(current.title)
  const [body, setBody] = useState(current.body)
  const [sms, setSms] = useState(template.custom?.sms ?? "")
  const unknown = [title, body, sms].flatMap((text) =>
    unknownPlaceholders(text, template.placeholders)
  )

  const replace = (updated: AdminTemplate) =>
    queryClient.setQueryData<AdminTemplate[]>(templateKeys.all, (list) =>
      list?.map((t) => (t.id === updated.id ? updated : t))
    )

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Heading>{template.label}</Heading>
          {template.custom && <Badge variant="secondary">Edited</Badge>}
        </div>
        <Text variant="muted">{PORTAL_LABELS[template.portal]}</Text>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <form
          aria-label="Template wording"
          className="flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-title">Title</Label>
            <Input
              id="template-title"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-body">Message</Label>
            <Textarea
              id="template-body"
              maxLength={300}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-sms">SMS text (optional)</Label>
            <Input
              id="template-sms"
              maxLength={160}
              placeholder="Empty = the title"
              value={sms}
              onChange={(e) => setSms(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Placeholders</span>
            {template.placeholders.length === 0 ? (
              <span className="text-muted-foreground">None for this message.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {template.placeholders.map((name) => (
                  <Button
                    key={name}
                    type="button"
                    size="xs"
                    variant="outline"
                    aria-label={`Add {${name}} to the message`}
                    onClick={() => setBody((text) => `${text} {${name}}`.trim())}
                  >
                    {`{${name}}`}
                  </Button>
                ))}
              </div>
            )}
            {unknown.length > 0 && (
              <span role="alert" className="text-destructive">
                {`{${unknown[0]}}`} isn&apos;t available in this message.
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ReasonDialog
              trigger="Save wording"
              triggerVariant="default"
              title="Save this wording?"
              description="New notifications use it straight away. Ones already sent keep their words."
              confirmLabel="Save"
              validate={() =>
                title.trim().length < 2 || body.trim().length < 2
                  ? "Enter a title and a message."
                  : unknown.length > 0
                    ? `{${unknown[0]}} isn't available in this message.`
                    : null
              }
              onConfirm={async (reason) => {
                replace(
                  await api.put<AdminTemplate>(
                    `/admin/templates/${encodeURIComponent(template.id)}`,
                    { title, body, sms: sms.trim() || undefined, reason }
                  )
                )
                toast.success("Wording saved")
              }}
            />
            {template.custom && (
              <ReasonDialog
                trigger="Reset to default"
                title="Go back to the default wording?"
                description={`“${template.title}” — ${template.body}`}
                confirmLabel="Reset"
                onConfirm={async (reason) => {
                  replace(
                    await api.post<AdminTemplate>(
                      `/admin/templates/${encodeURIComponent(template.id)}/reset`,
                      { reason }
                    )
                  )
                  toast.success("Back to the default wording")
                }}
              />
            )}
          </div>
        </form>

        <aside aria-label="Preview" className="flex flex-col gap-2">
          <span className="text-sm font-medium">Preview, with example details</span>
          <div className="flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm">
            <span className="font-semibold">
              {renderTemplate(title, TEMPLATE_SAMPLE_VALUES)}
            </span>
            <span className="text-muted-foreground">
              {renderTemplate(body, TEMPLATE_SAMPLE_VALUES)}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">
            SMS: {renderTemplate(sms.trim() || title, TEMPLATE_SAMPLE_VALUES)}
          </span>
        </aside>
      </div>

      <AuditHistory entries={template.history} />
    </>
  )
}
