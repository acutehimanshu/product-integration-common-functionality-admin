import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import {
  SEO_DESCRIPTION_MAX,
  SEO_PAGES,
  SEO_TITLE_MAX,
  type SeoContent,
  type SeoOverride,
} from "@acutehimanshu/core/domain/seo"
import type { AdminSiteContent } from "@acutehimanshu/core/domain/site-content"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"

export const seoKey = ["admin", "content", "site", "seo"] as const

const EMPTY: SeoOverride = { title: null, description: null, image: null }

/** What's wrong before saving, or null. The backend checks again. */
export function seoProblem(seo: SeoContent): string | null {
  for (const page of SEO_PAGES) {
    const image = seo[page.key]?.image?.trim()
    if (image && !/^https:\/\//.test(image) && !image.includes("/uploads/"))
      return `${page.label}: the share image must be uploaded or start with https://.`
  }
  return null
}

function Row({
  label,
  path,
  value,
  onChange,
}: {
  label: string
  path: string
  value: SeoOverride
  onChange: (value: SeoOverride) => void
}) {
  const [uploading, setUploading] = useState(false)
  const id = path.replace(/[^a-z0-9]+/gi, "-") || "home"
  const upload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const { url } = await api.upload<{ url: string }>("/admin/content/image", file)
      onChange({ ...value, image: url })
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't upload the image."))
    } finally {
      setUploading(false)
    }
  }
  return (
    <fieldset className="grid gap-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-medium">
        {label} <span className="text-muted-foreground font-normal">{path}</span>
      </legend>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`seo-${id}-title`}>Title</Label>
        <Input
          id={`seo-${id}-title`}
          value={value.title ?? ""}
          maxLength={SEO_TITLE_MAX}
          placeholder="The page's own title"
          aria-describedby={`seo-${id}-title-count`}
          onChange={(e) => onChange({ ...value, title: e.target.value || null })}
        />
        <p id={`seo-${id}-title-count`} className="text-muted-foreground text-xs">
          {(value.title ?? "").length}/{SEO_TITLE_MAX} · “| Marketbase” is added
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`seo-${id}-description`}>Description</Label>
        <Textarea
          id={`seo-${id}-description`}
          value={value.description ?? ""}
          rows={2}
          maxLength={SEO_DESCRIPTION_MAX}
          placeholder="The page's own description"
          aria-describedby={`seo-${id}-description-count`}
          onChange={(e) => onChange({ ...value, description: e.target.value || null })}
        />
        <p id={`seo-${id}-description-count`} className="text-muted-foreground text-xs">
          {(value.description ?? "").length}/{SEO_DESCRIPTION_MAX}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`seo-${id}-image`}>Share image</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={`seo-${id}-image`}
            className="min-w-0 flex-1"
            value={value.image ?? ""}
            placeholder="https://… or upload"
            onChange={(e) => onChange({ ...value, image: e.target.value || null })}
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            aria-label={`Upload a share image for ${label}`}
            className="text-sm"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </div>
      </div>
      {(value.title || value.description || value.image) && (
        <div>
          <Button
            variant="outline"
            size="xs"
            aria-label={`Clear ${label}`}
            onClick={() => onChange(EMPTY)}
          >
            Use the page&apos;s own text
          </Button>
        </div>
      )}
    </fieldset>
  )
}

function Editor({ saved }: { saved: SeoContent }) {
  const queryClient = useQueryClient()
  const [seo, setSeo] = useState<SeoContent>(saved)
  return (
    <>
      {SEO_PAGES.map((page) => (
        <Row
          key={page.key}
          label={page.label}
          path={page.path}
          value={seo[page.key] ?? EMPTY}
          onChange={(value) => setSeo((s) => ({ ...s, [page.key]: value }))}
        />
      ))}
      <div>
        <ReasonDialog
          trigger="Publish search & sharing text"
          triggerVariant="default"
          title="Publish search & sharing text?"
          description="Search engines and link previews pick it up within 5 minutes."
          reasonLabel="What changed?"
          confirmLabel="Publish"
          validate={() => seoProblem(seo)}
          onConfirm={async (reason) => {
            const pages = Object.fromEntries(
              Object.entries(seo).map(([key, value]) => [
                key,
                {
                  title: value.title?.trim() || null,
                  description: value.description?.trim() || null,
                  image: value.image?.trim() || null,
                },
              ])
            )
            const updated = await api.put<AdminSiteContent<SeoContent>>(
              "/admin/content/seo",
              { pages, reason }
            )
            queryClient.setQueryData(seoKey, updated)
            toast.success("Search & sharing text published")
          }}
        />
      </div>
    </>
  )
}

/** Content › Search & sharing: title, description and image per fixed page. */
export function SeoEditor() {
  usePageTitle("Search & sharing")
  const { data, error } = useQuery({
    queryKey: seoKey,
    queryFn: ({ signal }) =>
      api.get<AdminSiteContent<SeoContent>>("/admin/content/seo", { signal }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Content
      </Link>
      <div className="flex flex-col gap-1">
        <Heading>Search &amp; sharing</Heading>
        <Text variant="muted">
          What Google and link previews show for the marketplace&apos;s main pages. Leave
          a field empty to keep the page&apos;s own text.
        </Text>
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load search & sharing text.")}
        </Text>
      ) : !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Editor key={data.history[0]?.id ?? "initial"} saved={data.content} />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
