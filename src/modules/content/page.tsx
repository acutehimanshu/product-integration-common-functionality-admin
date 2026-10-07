import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, Route, Routes, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"
import type { AdminLegalPage } from "@acutehimanshu/core/domain/admin-content"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"
import { FooterEditor } from "@/modules/content/footer-editor"
import { HomeEditor } from "@/modules/content/home-editor"
import { BlogEditor, BlogList } from "@/modules/content/blog"
import { HelpEditor } from "@/modules/content/help-editor"
import { SeoEditor } from "@/modules/content/seo-editor"

const contentKeys = {
  all: ["admin", "content"] as const,
  page: (slug: string, country: string | null = null) =>
    [...contentKeys.all, slug, country ?? "global"] as const,
}

const SITE_PAGES = [
  { to: "home", title: "Home page", about: "Banners, sections, category tiles" },
  { to: "footer", title: "Footer", about: "Link columns, social media" },
  { to: "blog", title: "Blog", about: "Posts, drafts, publishing" },
  { to: "help", title: "Help centre", about: "Topics, questions and answers" },
  { to: "seo", title: "Search & sharing", about: "Titles, descriptions, share images" },
]

function LegalPages() {
  usePageTitle("Content")
  const { data, isPending, error } = useQuery({
    queryKey: contentKeys.all,
    queryFn: ({ signal }) =>
      api.get<AdminLegalPage[]>("/admin/content/legal", { signal }),
  })
  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-col gap-1">
        <Heading>Content</Heading>
        <Text variant="muted">
          What the marketplace says: its home page, footer, help centre, search text and
          legal pages.
        </Text>
      </div>
      <section aria-labelledby="content-site" className="flex flex-col gap-2">
        <Heading as="h2" size="h3" id="content-site">
          Site
        </Heading>
        <ul
          className="flex flex-col divide-y rounded-xl border"
          aria-label="Site content"
        >
          {SITE_PAGES.map((page) => (
            <li key={page.to} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <Link to={page.to} className="flex-1 font-medium hover:underline">
                {page.title}
              </Link>
              <span className="text-muted-foreground">{page.about}</span>
            </li>
          ))}
        </ul>
      </section>
      <Heading as="h2" size="h3">
        Legal pages
      </Heading>
      <Text variant="muted" className="text-sm">
        Linked from every page of the marketplace. Publishing takes effect within a
        minute.
      </Text>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load pages.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Legal pages">
          {data.map((page) => (
            <li key={page.slug} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <Link to={page.slug} className="flex-1 font-medium hover:underline">
                {page.title}
              </Link>
              {page.published ? (
                <span className="text-muted-foreground">
                  Version {page.published.version} ·{" "}
                  {formatDateTime(page.published.publishedAt)}
                </span>
              ) : (
                <Badge variant="outline">Not published</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}

function Editor({ page }: { page: AdminLegalPage }) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState(page.published?.body ?? "")
  const changed = body.trim() !== (page.published?.body ?? "").trim()
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="legal-body">Text</Label>
        <Textarea
          id="legal-body"
          value={body}
          rows={18}
          onChange={(event) => setBody(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Plain text. Leave a blank line between paragraphs.
        </p>
      </div>
      <div>
        <ReasonDialog
          trigger={page.published ? "Publish changes" : "Publish"}
          triggerVariant="default"
          title={`Publish “${page.title}”?`}
          description="It replaces what's live on the marketplace. Earlier versions stay in the history."
          reasonLabel="What changed?"
          confirmLabel="Publish"
          validate={() =>
            body.trim().length < 20
              ? "The page needs some text."
              : !changed
                ? "Nothing has changed since the live version."
                : null
          }
          onConfirm={async (reason) => {
            const updated = await api.put<AdminLegalPage>(
              `/admin/content/legal/${page.slug}${page.country ? `?country=${page.country}` : ""}`,
              {
                body,
                reason,
              }
            )
            queryClient.setQueryData(contentKeys.page(page.slug, page.country), updated)
            await queryClient.invalidateQueries({
              queryKey: contentKeys.all,
              exact: true,
            })
            toast.success(`Version ${updated.published?.version} published`)
          }}
        />
      </div>
    </>
  )
}

function LegalPageEditor() {
  const { slug = "" } = useParams()
  // ?country=AU: that country's own version (from Settings › Countries).
  const country = useSearchParams()[0].get("country")
  const { data, isPending, error } = useQuery({
    queryKey: contentKeys.page(slug, country),
    queryFn: ({ signal }) =>
      api.get<AdminLegalPage>(
        `/admin/content/legal/${slug}${country ? `?country=${country}` : ""}`,
        { signal }
      ),
  })
  usePageTitle(data?.title ?? "Content")
  return (
    <PageContainer maxWidth="4xl">
      {country ? (
        <Link
          to={`/settings/countries/${country}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← {country} settings
        </Link>
      ) : (
        <Link
          to=".."
          relative="path"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Content
        </Link>
      )}
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this page.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>
              {data.title}
              {data.country && ` — ${data.country} version`}
            </Heading>
            {data.published ? (
              <Badge variant="outline">Version {data.published.version} live</Badge>
            ) : (
              <Badge variant="outline">Not published</Badge>
            )}
          </div>
          {data.country && (
            <Text variant="muted" className="text-sm">
              People in {data.country} see this instead of the global text. Until it's
              published they see the global text.
            </Text>
          )}
          <Editor key={`${data.country}-${data.published?.version ?? 0}`} page={data} />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}

/** Content: the home page, the footer, the blog and the legal pages. */
export default function ContentPage() {
  return (
    <Routes>
      <Route index element={<LegalPages />} />
      <Route path="home" element={<HomeEditor />} />
      <Route path="footer" element={<FooterEditor />} />
      <Route path="help" element={<HelpEditor />} />
      <Route path="seo" element={<SeoEditor />} />
      <Route path="blog" element={<BlogList />} />
      <Route path="blog/:id" element={<BlogEditor />} />
      <Route path=":slug" element={<LegalPageEditor />} />
    </Routes>
  )
}
