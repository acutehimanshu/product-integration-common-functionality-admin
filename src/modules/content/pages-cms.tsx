import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import type { Page } from "@acutehimanshu/core/types/page"
import {
  PAGE_BLOCK_TYPES,
  PAGE_KINDS,
  PAGE_KIND_LABELS,
  PAGE_STATUS_LABELS,
  type AdminContentPage,
  type ContentPage,
  type PageBlock,
  type PageKind,
  type ReusableBlock,
} from "@acutehimanshu/core/domain/content-pages"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
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

const keys = {
  all: ["admin", "pages"] as const,
  blocks: ["admin", "content-blocks"] as const,
}

type BlockType = PageBlock["type"]

/** An empty block of a type, for "Add block". */
function emptyBlock(type: BlockType): PageBlock {
  switch (type) {
    case "heading":
    case "text":
      return { type, text: "" }
    case "image":
      return { type, url: "", alt: "" }
    case "cta":
      return { type, label: "", href: "/" }
    case "product":
      return { type, listingId: "" }
    case "seller":
      return { type, sellerId: "" }
    case "category":
      return { type, categoryId: "" }
    case "campaign":
      return { type, campaignId: "", label: "", href: "/" }
    default:
      return { type: "reusable", blockId: "" }
  }
}

/** The fields one block needs, as [key, label] pairs. */
const FIELDS: Record<BlockType, Array<[string, string]>> = {
  heading: [["text", "Heading"]],
  text: [["text", "Text"]],
  image: [
    ["url", "Image URL"],
    ["alt", "Description"],
  ],
  cta: [
    ["label", "Button text"],
    ["href", "Link (/… or https://…)"],
  ],
  product: [["listingId", "Listing id"]],
  seller: [["sellerId", "Seller id"]],
  category: [["categoryId", "Category id"]],
  campaign: [
    ["campaignId", "Campaign id"],
    ["label", "Button text"],
    ["href", "Link"],
  ],
  reusable: [["blockId", "Shared block id"]],
}

/** Edits a list of blocks: one row per block, its fields, move/remove. */
export function BlocksEditor({
  blocks,
  onChange,
  allowShared = true,
}: Readonly<{
  blocks: PageBlock[]
  onChange: (blocks: PageBlock[]) => void
  allowShared?: boolean
}>) {
  const [adding, setAdding] = useState<BlockType>("text")
  const set = (index: number, key: string, value: string) =>
    onChange(blocks.map((b, i) => (i === index ? { ...b, [key]: value } : b)))
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => (
        <fieldset key={index} className="flex flex-col gap-2 rounded-lg border p-2">
          <legend className="px-1 text-xs font-medium">{block.type}</legend>
          {FIELDS[block.type].map(([key, label]) => {
            const value = (block as Record<string, string>)[key] ?? ""
            const id = `block-${index}-${key}`
            return (
              <div key={key} className="flex flex-col gap-1">
                <Label htmlFor={id} className="text-xs">
                  {label}
                </Label>
                {block.type === "text" ? (
                  <Textarea
                    id={id}
                    value={value}
                    onChange={(e) => set(index, key, e.target.value)}
                  />
                ) : (
                  <Input
                    id={id}
                    value={value}
                    onChange={(e) => set(index, key, e.target.value)}
                  />
                )}
              </div>
            )
          })}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="self-start"
            onClick={() => onChange(blocks.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </fieldset>
      ))}
      <div className="flex items-center gap-2">
        <NativeSelect
          aria-label="Block type"
          value={adding}
          onChange={(e) => setAdding(e.target.value as BlockType)}
        >
          {PAGE_BLOCK_TYPES.filter((t) => allowShared || t !== "reusable").map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...blocks, emptyBlock(adding)])}
        >
          Add block
        </Button>
      </div>
    </div>
  )
}

/** Admin › Content › Pages (FRD-09 CMS-001..020). */
export function PageList() {
  usePageTitle("Pages")
  const navigate = useNavigate()
  const [kind, setKind] = useState<PageKind>("static")
  const [slug, setSlug] = useState("")
  const { data, isPending, error } = useQuery({
    queryKey: keys.all,
    queryFn: ({ signal }) => api.get<Page<ContentPage>>("/admin/pages", { signal }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/content" className="text-muted-foreground text-sm hover:underline">
        ← Content
      </Link>
      <Heading>Pages</Heading>
      <Text variant="muted">
        Information, landing and legal pages. Edits stay in the draft until published;
        every save is a version you can go back to.
      </Text>
      <div className="flex flex-wrap items-end gap-2">
        <NativeSelect
          aria-label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as PageKind)}
        >
          {PAGE_KINDS.map((k) => (
            <option key={k} value={k}>
              {PAGE_KIND_LABELS[k]}
            </option>
          ))}
        </NativeSelect>
        <Input
          aria-label="Address (slug)"
          placeholder="spring-guide"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Button
          disabled={slug.trim().length < 2}
          onClick={async () => {
            try {
              const page = await api.post<ContentPage>("/admin/pages", {
                kind,
                slug: slug.trim(),
                title: slug.trim().replaceAll("-", " "),
                blocks: [],
                seo: { noindex: false },
              })
              void navigate(`/content/pages/${page.id}`)
            } catch (err) {
              toast.error(getErrorMessage(err, "Couldn't create the page."))
            }
          }}
        >
          New page
        </Button>
        <Link to="/content/shared-blocks" className="text-sm underline">
          Shared blocks
        </Link>
      </div>
      {error && (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load pages.")}
        </Text>
      )}
      {isPending && <Skeleton className="h-40" />}
      {data && (
        <ul
          className="flex flex-col divide-y rounded-xl border text-sm"
          aria-label="Pages"
        >
          {data.items.map((page) => (
            <li key={page.id} className="flex flex-wrap items-center gap-3 p-3">
              <Link to={page.id} className="flex-1 font-medium hover:underline">
                {page.draft.title}{" "}
                <span className="text-muted-foreground">/pages/{page.slug}</span>
              </Link>
              <Badge variant="outline">{PAGE_KIND_LABELS[page.kind]}</Badge>
              <Badge variant={page.status === "published" ? "default" : "outline"}>
                {PAGE_STATUS_LABELS[page.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}

type Draft = {
  title: string
  slug: string
  countries: string
  seoTitle: string
  seoDescription: string
  noindex: boolean
  effectiveFrom: string
  blocks: PageBlock[]
}

const draftOf = (page: ContentPage): Draft => ({
  title: page.draft.title,
  slug: page.slug,
  countries: page.countries.join(", "),
  seoTitle: page.draft.seo.title ?? "",
  seoDescription: page.draft.seo.description ?? "",
  noindex: page.draft.seo.noindex,
  effectiveFrom: page.effectiveFrom?.slice(0, 10) ?? "",
  blocks: page.draft.blocks,
})

function PageActions({
  page,
  refresh,
}: Readonly<{ page: ContentPage; refresh: () => Promise<unknown> }>) {
  const [publishAt, setPublishAt] = useState("")
  const post = async (path: string, body: object, done: string) => {
    await api.post(`/admin/pages/${page.id}/${path}`, body)
    await refresh()
    toast.success(done)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {page.status !== "pending_approval" && page.status !== "archived" && (
        <ReasonDialog
          trigger="Send for approval"
          triggerVariant="outline"
          title="Send for approval?"
          description="Someone else approves it before it can go live."
          confirmLabel="Send"
          onConfirm={() => post("submit", {}, "Sent for approval")}
        />
      )}
      {page.status === "pending_approval" && (
        <>
          <ReasonDialog
            trigger="Approve"
            title="Approve this version?"
            description="You can't approve your own changes."
            confirmLabel="Approve"
            onConfirm={(reason) => post("approve", { reason }, "Approved")}
          />
          <ReasonDialog
            trigger="Send back"
            triggerVariant="outline"
            title="Send it back?"
            description="The author sees your reason."
            confirmLabel="Send back"
            onConfirm={(reason) => post("reject", { reason }, "Sent back")}
          />
        </>
      )}
      {page.status !== "archived" && (
        <ReasonDialog
          trigger="Publish"
          title="Publish this version?"
          description="Now, or on a date. Legal pages take effect on their effective date."
          confirmLabel="Publish"
          fields={
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="publish-at">Publish on (optional)</Label>
              <Input
                id="publish-at"
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
              />
            </div>
          }
          onConfirm={(reason) =>
            post(
              "publish",
              {
                reason,
                publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
              },
              "Published or scheduled"
            )
          }
        />
      )}
      {(page.status === "published" || page.status === "scheduled") && (
        <ReasonDialog
          trigger="Take down now"
          triggerVariant="outline"
          destructive
          noteRequired
          title="Take this page down now?"
          description="It leaves the site at once. The draft and versions stay."
          confirmLabel="Take down"
          onConfirm={(reason, note) => post("unpublish", { reason, note }, "Taken down")}
        />
      )}
      {page.status !== "archived" && (
        <ReasonDialog
          trigger="Archive"
          triggerVariant="outline"
          title="Archive this page?"
          description="It leaves the site; its history and analytics stay."
          confirmLabel="Archive"
          onConfirm={(reason) => post("archive", { reason }, "Archived")}
        />
      )}
    </div>
  )
}

/** One page: draft, versions, decisions, actions and preview. */
export function PageEditor() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: [...keys.all, id],
    queryFn: ({ signal }) => api.get<AdminContentPage>(`/admin/pages/${id}`, { signal }),
  })
  usePageTitle(data?.draft.title ?? "Page")
  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.all })
  if (error)
    return (
      <Text role="alert" className="text-destructive">
        {getErrorMessage(error, "Couldn't load the page.")}
      </Text>
    )
  if (isPending) return <Skeleton className="h-64" />
  return (
    <EditorBody key={`${data.version}-${data.status}`} page={data} refresh={refresh} />
  )
}

function EditorBody({
  page,
  refresh,
}: Readonly<{ page: AdminContentPage; refresh: () => Promise<unknown> }>) {
  const [draft, setDraft] = useState(() => draftOf(page))
  const [previewCountry, setPreviewCountry] = useState("AU")
  const [preview, setPreview] = useState<{
    blocks: unknown[]
    shownInCountry: boolean
  } | null>(null)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const save = async () => {
    try {
      await api.put(`/admin/pages/${page.id}`, {
        kind: page.kind,
        slug: draft.slug.trim(),
        title: draft.title.trim(),
        locale: page.locale,
        countries: draft.countries
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean),
        effectiveFrom: draft.effectiveFrom
          ? new Date(draft.effectiveFrom).toISOString()
          : undefined,
        blocks: draft.blocks,
        seo: {
          title: draft.seoTitle.trim() || undefined,
          description: draft.seoDescription.trim() || undefined,
          noindex: draft.noindex,
        },
      })
      await refresh()
      toast.success("Saved as a new version")
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't save."))
    }
  }
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/content/pages" className="text-muted-foreground text-sm hover:underline">
        ← Pages
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Heading>{page.draft.title}</Heading>
        <Badge variant="outline">{PAGE_STATUS_LABELS[page.status]}</Badge>
        <Badge variant="outline">version {page.version}</Badge>
        {page.live && <Badge>live: version {page.live.version}</Badge>}
      </div>
      <PageActions page={page} refresh={refresh} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="pg-title"
          label="Title"
          value={draft.title}
          onChange={(v) => set({ title: v })}
        />
        <Field
          id="pg-slug"
          label="Address (/pages/…)"
          value={draft.slug}
          onChange={(v) => set({ slug: v })}
        />
        <Field
          id="pg-countries"
          label="Only in countries (codes, empty = all)"
          value={draft.countries}
          onChange={(v) => set({ countries: v })}
        />
        {page.kind === "legal" && (
          <Field
            id="pg-effective"
            label="Takes effect on (YYYY-MM-DD)"
            value={draft.effectiveFrom}
            onChange={(v) => set({ effectiveFrom: v })}
          />
        )}
        <Field
          id="pg-seo-title"
          label="Search title"
          value={draft.seoTitle}
          onChange={(v) => set({ seoTitle: v })}
        />
        <Field
          id="pg-seo-desc"
          label="Search description"
          value={draft.seoDescription}
          onChange={(v) => set({ seoDescription: v })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.noindex}
            onChange={(e) => set({ noindex: e.target.checked })}
          />
          Keep out of search engines
        </label>
      </div>
      <BlocksEditor blocks={draft.blocks} onChange={(blocks) => set({ blocks })} />
      <Button className="self-start" onClick={save}>
        Save draft
      </Button>
      <section className="flex flex-col gap-2 text-sm" aria-labelledby="preview-heading">
        <Heading as="h2" size="h3" id="preview-heading">
          Preview
        </Heading>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Preview country"
            className="w-20"
            value={previewCountry}
            onChange={(e) => setPreviewCountry(e.target.value.toUpperCase())}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={async () =>
              setPreview(
                await api.get(
                  `/admin/pages/${page.id}/preview?country=${encodeURIComponent(previewCountry)}`
                )
              )
            }
          >
            Preview in this country
          </Button>
        </div>
        {preview && (
          <Text variant="muted">
            {preview.shownInCountry ? "Shown here" : "Not shown in this country"} ·{" "}
            {preview.blocks.length} of {draft.blocks.length} blocks visible (unavailable
            products are left out)
          </Text>
        )}
      </section>
      <section className="flex flex-col gap-2 text-sm" aria-labelledby="versions-heading">
        <Heading as="h2" size="h3" id="versions-heading">
          Versions
        </Heading>
        <ul className="flex flex-col divide-y rounded-xl border">
          {[...page.versions].reverse().map((v) => (
            <li key={v.version} className="flex flex-wrap items-center gap-2 p-2">
              <span className="flex-1">
                Version {v.version} · {v.by} · {formatDateTime(v.at)}
                {v.note && ` — ${v.note}`}
              </span>
              {v.version !== page.version && (
                <ReasonDialog
                  trigger="Restore"
                  triggerVariant="outline"
                  triggerLabel={`Restore version ${v.version}`}
                  title={`Restore version ${v.version}?`}
                  description="It becomes the draft again, as a new version."
                  confirmLabel="Restore"
                  onConfirm={async (reason) => {
                    await api.post(`/admin/pages/${page.id}/restore`, {
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
          {page.decisions.map((d) => (
            <li key={`${d.at}-${d.action}`}>
              {formatDateTime(d.at)} — {d.by} {d.action} version {d.version}
              {d.reason && `: ${d.reason}`}
            </li>
          ))}
        </ol>
      </section>
      <AuditHistory entries={page.history} />
    </PageContainer>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
}: Readonly<{
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** Admin › Content › Shared blocks (CMS-017): edit once, shown on every page that uses it. */
export function SharedBlocks() {
  usePageTitle("Shared blocks")
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: keys.blocks,
    queryFn: ({ signal }) =>
      api.get<ReusableBlock[]>("/admin/content-blocks", { signal }),
  })
  const [name, setName] = useState("")
  const [blocks, setBlocks] = useState<PageBlock[]>([])
  return (
    <PageContainer maxWidth="4xl">
      <Link to="/content/pages" className="text-muted-foreground text-sm hover:underline">
        ← Pages
      </Link>
      <Heading>Shared blocks</Heading>
      <ul
        className="flex flex-col divide-y rounded-xl border text-sm"
        aria-label="Shared blocks"
      >
        {(data ?? []).map((b) => (
          <li key={b.id} className="p-2">
            {b.name}{" "}
            <span className="text-muted-foreground font-mono text-xs">{b.id}</span> ·{" "}
            {b.blocks.length} block(s)
          </li>
        ))}
      </ul>
      <Field
        id="shared-name"
        label="New shared block name"
        value={name}
        onChange={setName}
      />
      <BlocksEditor blocks={blocks} onChange={setBlocks} allowShared={false} />
      <ReasonDialog
        trigger="Save shared block"
        title="Save this shared block?"
        description="Pages that use it show the new content at once."
        confirmLabel="Save"
        onConfirm={async (reason) => {
          await api.post("/admin/content-blocks", { name, blocks, reason })
          setName("")
          setBlocks([])
          await queryClient.invalidateQueries({ queryKey: keys.blocks })
        }}
      />
    </PageContainer>
  )
}
