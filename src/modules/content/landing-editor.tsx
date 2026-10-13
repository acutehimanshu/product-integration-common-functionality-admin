import { useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
import type { HelpContent } from "@acutehimanshu/core/domain/help-content"
import {
  LANDING_LIMITS,
  LANDING_SECTIONS,
  LANDING_SECTION_LABELS,
  landingProblem,
  type AdminLanding,
  type LandingButton,
  type LandingContent,
  type LandingPoint,
  type LandingSectionId,
} from "@acutehimanshu/core/domain/landing"
import type { AdminSiteContent } from "@acutehimanshu/core/domain/site-content"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
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
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

// Admin › Content › Landing page: what each section of the landing page says,
// drafts and versions, approval, publishing and which version visitors see.

export const landingKey = ["admin", "content", "landing"] as const

// ---- Small field editors -------------------------------------------------------------

function Field({
  id,
  label,
  value,
  onChange,
  multiline = false,
  max,
}: Readonly<{
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  max?: number
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

function ButtonFields({
  id,
  label,
  value,
  onChange,
}: Readonly<{
  id: string
  label: string
  value: LandingButton
  onChange: (v: LandingButton) => void
}>) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <Field
        id={`${id}-label`}
        label="Button text"
        value={value.label}
        max={30}
        onChange={(v) => onChange({ ...value, label: v })}
      />
      <Field
        id={`${id}-href`}
        label="Link (/… or https://…)"
        value={value.href}
        onChange={(v) => onChange({ ...value, href: v })}
      />
    </fieldset>
  )
}

function PointsEditor({
  id,
  points,
  onChange,
}: Readonly<{
  id: string
  points: LandingPoint[]
  onChange: (v: LandingPoint[]) => void
}>) {
  const set = (i: number, patch: Partial<LandingPoint>) =>
    onChange(points.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  return (
    <div className="flex flex-col gap-2">
      {points.map((p, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_2fr_auto]"
        >
          <Field
            id={`${id}-${i}-title`}
            label={`Point ${i + 1}`}
            value={p.title}
            max={60}
            onChange={(v) => set(i, { title: v })}
          />
          <Field
            id={`${id}-${i}-text`}
            label="Text"
            value={p.text}
            max={200}
            onChange={(v) => set(i, { text: v })}
          />
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="self-end"
            aria-label={`Remove point ${i + 1}`}
            onClick={() => onChange(points.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      {points.length < LANDING_LIMITS.points && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => onChange([...points, { title: "", text: "" }])}
        >
          Add a point
        </Button>
      )}
    </div>
  )
}

function StepsEditor({
  id,
  label,
  steps,
  onChange,
}: Readonly<{
  id: string
  label: string
  steps: string[]
  onChange: (v: string[]) => void
}>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      {steps.map((s, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              id={`${id}-${i}`}
              label={`Step ${i + 1}`}
              value={s}
              max={80}
              onChange={(v) => onChange(steps.map((x, j) => (j === i ? v : x)))}
            />
          </div>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-label={`Remove step ${i + 1}`}
            onClick={() => onChange(steps.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      {steps.length < LANDING_LIMITS.steps && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => onChange([...steps, ""])}
        >
          Add a step
        </Button>
      )}
    </fieldset>
  )
}

function Picker({
  legend,
  options,
  chosen,
  max,
  onChange,
  emptyMeans,
}: Readonly<{
  legend: string
  options: Array<{ id: string; label: string }>
  chosen: string[]
  max: number
  onChange: (ids: string[]) => void
  emptyMeans: string
}>) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <Text variant="muted" className="text-xs">
        Up to {max}. None chosen = {emptyMeans}.
      </Text>
      <div className="grid gap-1 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={chosen.includes(o.id)}
              disabled={!chosen.includes(o.id) && chosen.length >= max}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...chosen, o.id] : chosen.filter((x) => x !== o.id)
                )
              }
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// ---- Sections -------------------------------------------------------------------------

type SectionProps = Readonly<{
  draft: LandingContent
  set: <K extends LandingSectionId>(id: K, patch: Partial<LandingContent[K]>) => void
  categories: AdminCategory[]
  questions: Array<{ id: string; label: string }>
}>

function HeroImage({ draft, set }: Pick<SectionProps, "draft" | "set">) {
  const [busy, setBusy] = useState(false)
  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const { url } = await api.upload<{ url: string }>("/admin/content/image", file)
      set("hero", { imageUrl: url })
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't upload the image."))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="hero-image">Image (optional)</Label>
      <input
        id="hero-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {draft.hero.imageUrl && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-mono text-xs">
            {draft.hero.imageUrl}
          </span>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => set("hero", { imageUrl: null, imageAlt: "" })}
          >
            Remove image
          </Button>
        </div>
      )}
    </div>
  )
}

const SECTION_FORMS: Record<LandingSectionId, (p: SectionProps) => ReactNode> = {
  hero: ({ draft, set }) => (
    <>
      <Field
        id="hero-eyebrow"
        label="Small line above the headline"
        value={draft.hero.eyebrow}
        max={60}
        onChange={(v) => set("hero", { eyebrow: v })}
      />
      <Field
        id="hero-title"
        label="Headline"
        value={draft.hero.title}
        max={80}
        onChange={(v) => set("hero", { title: v })}
      />
      <Field
        id="hero-text"
        label="Text"
        multiline
        value={draft.hero.text}
        max={300}
        onChange={(v) => set("hero", { text: v })}
      />
      <ButtonFields
        id="hero-primary"
        label="Main button"
        value={draft.hero.primary}
        onChange={(v) => set("hero", { primary: v })}
      />
      <ButtonFields
        id="hero-secondary"
        label="Second button"
        value={draft.hero.secondary}
        onChange={(v) => set("hero", { secondary: v })}
      />
      <HeroImage draft={draft} set={set} />
      {draft.hero.imageUrl && (
        <Field
          id="hero-alt"
          label="Describe the image (for people who can't see it)"
          value={draft.hero.imageAlt}
          max={150}
          onChange={(v) => set("hero", { imageAlt: v })}
        />
      )}
    </>
  ),
  why: ({ draft, set }) => (
    <>
      <Field
        id="why-title"
        label="Title"
        value={draft.why.title}
        max={60}
        onChange={(v) => set("why", { title: v })}
      />
      <PointsEditor
        id="why"
        points={draft.why.points}
        onChange={(v) => set("why", { points: v })}
      />
    </>
  ),
  how: ({ draft, set }) => (
    <>
      <Field
        id="how-title"
        label="Title"
        value={draft.how.title}
        max={60}
        onChange={(v) => set("how", { title: v })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <StepsEditor
          id="how-buying"
          label="Buying steps"
          steps={draft.how.buying}
          onChange={(v) => set("how", { buying: v })}
        />
        <StepsEditor
          id="how-selling"
          label="Selling steps"
          steps={draft.how.selling}
          onChange={(v) => set("how", { selling: v })}
        />
      </div>
    </>
  ),
  categories: ({ draft, set, categories }) => (
    <>
      <Field
        id="categories-title"
        label="Title"
        value={draft.categories.title}
        max={60}
        onChange={(v) => set("categories", { title: v })}
      />
      <Picker
        legend="Categories to show"
        options={categories
          .filter((c) => !c.hidden && !c.parentId)
          .map((c) => ({ id: c.id, label: c.name }))}
        chosen={draft.categories.categoryIds}
        max={LANDING_LIMITS.categories}
        emptyMeans="the main categories"
        onChange={(ids) => set("categories", { categoryIds: ids })}
      />
    </>
  ),
  featured: ({ draft, set }) => (
    <>
      <Field
        id="featured-title"
        label="Title"
        value={draft.featured.title}
        max={60}
        onChange={(v) => set("featured", { title: v })}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="featured-count">
          How many listings (1–{LANDING_LIMITS.featured})
        </Label>
        <Input
          id="featured-count"
          type="number"
          min={1}
          max={LANDING_LIMITS.featured}
          className="w-24"
          value={draft.featured.count}
          onChange={(e) => set("featured", { count: Number(e.target.value) })}
        />
        <Text variant="muted" className="text-xs">
          Running promoted campaigns first, then trending listings — only ones that can be
          bought in the visitor's country.
        </Text>
      </div>
    </>
  ),
  trust: ({ draft, set }) => (
    <>
      <Field
        id="trust-title"
        label="Title"
        value={draft.trust.title}
        max={60}
        onChange={(v) => set("trust", { title: v })}
      />
      <PointsEditor
        id="trust"
        points={draft.trust.points}
        onChange={(v) => set("trust", { points: v })}
      />
    </>
  ),
  sellers: ({ draft, set }) => (
    <>
      <Field
        id="sellers-title"
        label="Title"
        value={draft.sellers.title}
        max={60}
        onChange={(v) => set("sellers", { title: v })}
      />
      <Field
        id="sellers-text"
        label="Text"
        multiline
        value={draft.sellers.text}
        max={300}
        onChange={(v) => set("sellers", { text: v })}
      />
      <ButtonFields
        id="sellers-button"
        label="Button"
        value={draft.sellers.button}
        onChange={(v) => set("sellers", { button: v })}
      />
    </>
  ),
  faq: ({ draft, set, questions }) => (
    <>
      <Field
        id="faq-title"
        label="Title"
        value={draft.faq.title}
        max={60}
        onChange={(v) => set("faq", { title: v })}
      />
      <Picker
        legend="Questions from the help centre"
        options={questions}
        chosen={draft.faq.questionIds}
        max={LANDING_LIMITS.faq}
        emptyMeans="the first published questions"
        onChange={(ids) => set("faq", { questionIds: ids })}
      />
    </>
  ),
  newsletter: ({ draft, set }) => (
    <>
      <Field
        id="newsletter-title"
        label="Title"
        value={draft.newsletter.title}
        max={60}
        onChange={(v) => set("newsletter", { title: v })}
      />
      <Field
        id="newsletter-text"
        label="Text"
        value={draft.newsletter.text}
        max={200}
        onChange={(v) => set("newsletter", { text: v })}
      />
      <Field
        id="newsletter-button"
        label="Button text"
        value={draft.newsletter.buttonLabel}
        max={30}
        onChange={(v) => set("newsletter", { buttonLabel: v })}
      />
      <Text variant="muted" className="text-xs">
        Guests confirm by email before anything is sent; every email has an unsubscribe
        link.
      </Text>
    </>
  ),
  finalCta: ({ draft, set }) => (
    <>
      <Field
        id="final-title"
        label="Title"
        value={draft.finalCta.title}
        max={80}
        onChange={(v) => set("finalCta", { title: v })}
      />
      <Field
        id="final-text"
        label="Text"
        value={draft.finalCta.text}
        max={200}
        onChange={(v) => set("finalCta", { text: v })}
      />
      <ButtonFields
        id="final-primary"
        label="Main button"
        value={draft.finalCta.primary}
        onChange={(v) => set("finalCta", { primary: v })}
      />
      <ButtonFields
        id="final-secondary"
        label="Second button"
        value={draft.finalCta.secondary}
        onChange={(v) => set("finalCta", { secondary: v })}
      />
    </>
  ),
}

// ---- Status, switch and workflow ------------------------------------------------------------

const STATUS_LABEL: Record<AdminLanding["status"], string> = {
  draft: "Draft",
  pending_approval: "Waiting for approval",
  published: "Published",
}

function Workflow({
  data,
  refresh,
}: Readonly<{ data: AdminLanding; refresh: () => Promise<unknown> }>) {
  const post = (path: string, body: object, done: string) => async () => {
    await api.post(`/admin/content/landing/${path}`, body)
    await refresh()
    toast.success(done)
  }
  const needsApproval = data.approvalRequired && data.approvedVersion !== data.version
  return (
    <section
      aria-labelledby="landing-status"
      className="flex flex-col gap-3 rounded-xl border p-4"
    >
      <Heading as="h2" size="h3" id="landing-status">
        What visitors see
      </Heading>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={data.source === "admin" ? "default" : "outline"}>
          {data.source === "admin"
            ? "Your published version"
            : "The built-in page (Phase 1)"}
        </Badge>
        <Badge variant="outline">
          Draft version {data.version} · {STATUS_LABEL[data.status]}
        </Badge>
        {data.live && (
          <Badge variant="outline">Published: version {data.live.version}</Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {data.status !== "pending_approval" && data.approvalRequired && (
          <ReasonDialog
            trigger="Send for approval"
            title="Send for approval?"
            description="Someone else approves it before it can be published."
            confirmLabel="Send"
            onConfirm={post("submit", {}, "Sent for approval")}
          />
        )}
        {data.status === "pending_approval" && (
          <>
            <ReasonDialog
              trigger="Approve"
              title="Approve this version?"
              description="You can't approve your own changes."
              confirmLabel="Approve"
              onConfirm={(reason) => post("approve", { reason }, "Approved")()}
            />
            <ReasonDialog
              trigger="Send back"
              title="Send it back?"
              description="The author sees your reason."
              confirmLabel="Send back"
              onConfirm={(reason) => post("reject", { reason }, "Sent back")()}
            />
          </>
        )}
        <ReasonDialog
          trigger="Publish"
          title={`Publish version ${data.version}?`}
          description={
            needsApproval
              ? "This version needs a second person's approval first."
              : "It becomes the published version. Visitors see it when the page is switched to your version."
          }
          confirmLabel="Publish"
          onConfirm={(reason) => post("publish", { reason }, "Published")()}
        />
        {data.source === "builtin" ? (
          <ReasonDialog
            trigger="Show my version to visitors"
            title="Switch visitors to your published version?"
            description={
              data.live
                ? "The landing page shows your published version from now on."
                : "Publish a version first."
            }
            confirmLabel="Switch"
            onConfirm={(reason) =>
              post(
                "source",
                { source: "admin", reason },
                "Visitors now see your version"
              )()
            }
          />
        ) : (
          <ReasonDialog
            trigger="Go back to the built-in page"
            title="Show the built-in page again?"
            description="Your versions are kept; you can switch back any time."
            confirmLabel="Switch"
            onConfirm={(reason) =>
              post(
                "source",
                { source: "builtin", reason },
                "Visitors now see the built-in page"
              )()
            }
          />
        )}
      </div>
    </section>
  )
}

function Versions({
  data,
  refresh,
}: Readonly<{ data: AdminLanding; refresh: () => Promise<unknown> }>) {
  return (
    <section aria-labelledby="landing-versions" className="flex flex-col gap-2 text-sm">
      <Heading as="h2" size="h3" id="landing-versions">
        Versions
      </Heading>
      <ul className="flex flex-col divide-y rounded-xl border">
        {[...data.versions].reverse().map((v) => (
          <li key={v.version} className="flex flex-wrap items-center gap-2 p-2">
            <span className="flex-1">
              Version {v.version} · {v.by} · {formatDateTime(v.at)}
              {v.note && ` — ${v.note}`}
            </span>
            {v.version !== data.version && (
              <ReasonDialog
                trigger="Restore"
                triggerLabel={`Restore version ${v.version}`}
                title={`Restore version ${v.version}?`}
                description="It becomes the draft again, as a new version."
                confirmLabel="Restore"
                onConfirm={async (reason) => {
                  await api.post("/admin/content/landing/restore", {
                    version: v.version,
                    reason,
                  })
                  await refresh()
                }}
              />
            )}
          </li>
        ))}
      </ul>
      <ol
        className="text-muted-foreground flex flex-col gap-0.5 text-xs"
        aria-label="Decisions"
      >
        {data.decisions.map((d) => (
          <li key={`${d.at}-${d.action}-${d.version}`}>
            {formatDateTime(d.at)} — {d.by} {d.action} version {d.version}
            {d.reason && `: ${d.reason}`}
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---- Editor ---------------------------------------------------------------------------------

function Editor({
  data,
  categories,
  questions,
}: Readonly<{
  data: AdminLanding
  categories: AdminCategory[]
  questions: Array<{ id: string; label: string }>
}>) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<LandingContent>(data.draft)
  const [open, setOpen] = useState<LandingSectionId>("hero")
  const refresh = () => queryClient.invalidateQueries({ queryKey: landingKey })
  const set: SectionProps["set"] = (id, patch) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }))
  const problem = landingProblem(draft)
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-3">
        {LANDING_SECTIONS.map((id) => {
          const Form = SECTION_FORMS[id]
          return (
            <section
              key={id}
              aria-labelledby={`section-${id}`}
              className="rounded-xl border"
            >
              <div className="flex flex-wrap items-center gap-3 p-3">
                <button
                  type="button"
                  id={`section-${id}`}
                  className="flex-1 text-left font-medium hover:underline"
                  aria-expanded={open === id}
                  onClick={() => setOpen(id)}
                >
                  {LANDING_SECTION_LABELS[id]}
                </button>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft[id].visible}
                    onChange={(e) => set(id, { visible: e.target.checked })}
                  />
                  Shown
                </label>
              </div>
              {open === id && (
                <div className="flex flex-col gap-3 border-t p-3">
                  <Form
                    draft={draft}
                    set={set}
                    categories={categories}
                    questions={questions}
                  />
                </div>
              )}
            </section>
          )
        })}
        {problem && (
          <Text role="alert" className="text-destructive text-sm">
            {problem}
          </Text>
        )}
        <div>
          <ReasonDialog
            trigger="Save draft"
            triggerVariant="default"
            title="Save this draft?"
            description="It's saved as a new version. Visitors see no change until it's published and switched on."
            confirmLabel="Save"
            validate={() => problem}
            onConfirm={async (reason) => {
              await api.put("/admin/content/landing", { content: draft, reason })
              await refresh()
              toast.success("Saved as a new version")
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Workflow data={data} refresh={refresh} />
        <Versions data={data} refresh={refresh} />
        <AuditHistory entries={data.history} />
      </div>
    </div>
  )
}

export function LandingEditor() {
  usePageTitle("Landing page")
  const landing = useQuery({
    queryKey: landingKey,
    queryFn: ({ signal }) => api.get<AdminLanding>("/admin/content/landing", { signal }),
  })
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: ({ signal }) => api.get<AdminCategory[]>("/admin/categories", { signal }),
  })
  const help = useQuery({
    queryKey: ["admin", "content", "site", "help"],
    queryFn: ({ signal }) =>
      api.get<AdminSiteContent<HelpContent>>("/admin/content/help", { signal }),
  })
  const questions = (help.data?.content.topics ?? []).flatMap((t) =>
    t.questions.filter((q) => q.published).map((q) => ({ id: q.id, label: q.q }))
  )
  return (
    <PageContainer maxWidth="6xl">
      <Link to="/content" className="text-muted-foreground text-sm hover:underline">
        ← Content
      </Link>
      <Heading>Landing page</Heading>
      <Text variant="muted">
        What guests see at the home address. Each section can be hidden; the layout stays
        the same. Signed-in buyers go straight to the shop.
      </Text>
      {landing.error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(landing.error, "Couldn't load the landing page.")}
        </Text>
      )}
      {landing.isPending ? (
        <Skeleton className="h-64" />
      ) : (
        landing.data && (
          <Editor
            key={landing.data.version}
            data={landing.data}
            categories={categories.data ?? []}
            questions={questions}
          />
        )
      )}
    </PageContainer>
  )
}
