import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import {
  BLOG_SLUG_PATTERN,
  slugify,
  type AdminBlogPost,
  type BlogPostInput,
  type BlogPostSummary,
} from "@acutehimanshu/core/domain/blog"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Button, buttonVariants } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { Textarea } from "@acutehimanshu/ui/components/ui/textarea"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

const blogKeys = {
  all: ["admin", "blog"] as const,
  post: (id: string) => [...blogKeys.all, id] as const,
}

const EMPTY: BlogPostInput = { title: "", slug: "", excerpt: "", body: "" }

/** What's missing before saving, or null. The backend checks again. */
export function postProblem(post: BlogPostInput): string | null {
  if (post.title.trim().length < 5) return "Give the post a title."
  if (!BLOG_SLUG_PATTERN.test(post.slug))
    return "The web address uses lowercase letters, numbers and dashes."
  if (post.excerpt.trim().length < 10) return "Add a short summary."
  if (post.body.trim().length < 20) return "The post needs some text."
  if (post.coverUrl && !post.coverAlt?.trim()) return "Describe the cover image."
  return null
}

/** Content › Blog: every post, drafts first by date. */
export function BlogList() {
  usePageTitle("Blog")
  const { data, isPending, error } = useQuery({
    queryKey: blogKeys.all,
    queryFn: ({ signal }) => api.get<BlogPostSummary[]>("/admin/blog", { signal }),
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading>Blog</Heading>
        <Link to="new" className={buttonVariants()}>
          New post
        </Link>
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the blog.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.length === 0 ? (
        <Text>No posts yet.</Text>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Posts">
          {data.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <Link to={post.id} className="flex-1 font-medium hover:underline">
                {post.title}
              </Link>
              <Badge variant={post.status === "published" ? "secondary" : "outline"}>
                {post.status === "published" ? "Published" : "Draft"}
              </Badge>
              <span className="text-muted-foreground">
                {formatDateTime(post.publishedAt ?? post.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}

function Editor({ post }: { post: AdminBlogPost | null }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [values, setValues] = useState<BlogPostInput>(
    post
      ? {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          body: post.body,
          coverUrl: post.coverUrl,
          coverAlt: post.coverAlt,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
        }
      : EMPTY
  )
  // New posts follow the title until someone edits the address themselves.
  const [slugTouched, setSlugTouched] = useState(!!post)
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const live = post?.status === "published"

  const set = (field: keyof BlogPostInput, value: string) =>
    setValues((v) => ({ ...v, [field]: value }))

  const cleaned = (): BlogPostInput => ({
    title: values.title.trim(),
    slug: values.slug.trim(),
    excerpt: values.excerpt.trim(),
    body: values.body.trim(),
    coverUrl: values.coverUrl || undefined,
    coverAlt: values.coverAlt?.trim() || undefined,
    seoTitle: values.seoTitle?.trim() || undefined,
    seoDescription: values.seoDescription?.trim() || undefined,
  })

  const stored = (updated: AdminBlogPost) => {
    queryClient.setQueryData(blogKeys.post(updated.id), updated)
    void queryClient.invalidateQueries({ queryKey: blogKeys.all, exact: true })
  }

  const save = async () => {
    const found = postProblem(cleaned())
    setProblem(found)
    if (found) return
    setSaving(true)
    try {
      const updated = post
        ? await api.put<AdminBlogPost>(`/admin/blog/${post.id}`, cleaned())
        : await api.post<AdminBlogPost>("/admin/blog", cleaned())
      stored(updated)
      toast.success(live ? "Live post updated" : "Draft saved")
      if (!post) void navigate(`../${updated.id}`, { relative: "path", replace: true })
    } catch (error) {
      setProblem(getErrorMessage(error, "Couldn't save the post."))
    } finally {
      setSaving(false)
    }
  }

  const uploadCover = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const { url } = await api.upload<{ url: string }>("/admin/blog/cover", file)
      setValues((v) => ({ ...v, coverUrl: url }))
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't upload the image."))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="post-title">Title</Label>
        <Input
          id="post-title"
          value={values.title}
          maxLength={120}
          onChange={(e) => {
            set("title", e.target.value)
            if (!slugTouched) set("slug", slugify(e.target.value))
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="post-slug">Web address</Label>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">/blog/</span>
          <Input
            id="post-slug"
            value={values.slug}
            disabled={live}
            onChange={(e) => {
              setSlugTouched(true)
              set("slug", e.target.value.toLowerCase())
            }}
          />
        </div>
        {live && (
          <Text variant="muted" className="text-xs">
            Live posts keep their address — links to them are out there. Unpublish to
            change it.
          </Text>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="post-excerpt">Summary</Label>
        <Textarea
          id="post-excerpt"
          rows={2}
          maxLength={300}
          value={values.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="post-body">Text</Label>
        <Textarea
          id="post-body"
          rows={16}
          value={values.body}
          onChange={(e) => set("body", e.target.value)}
        />
        <Text variant="muted" className="text-xs">
          Plain text. A blank line starts a new paragraph; start a line with ## for a
          subheading.
        </Text>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">Cover image</legend>
        {values.coverUrl && (
          <img
            src={values.coverUrl}
            alt={values.coverAlt ?? ""}
            className="aspect-video w-full max-w-sm rounded-lg object-cover"
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="post-cover">
            {values.coverUrl ? "Replace image" : "Upload an image"}
          </Label>
          <input
            id="post-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
            disabled={uploading}
            onChange={(e) => void uploadCover(e.target.files?.[0])}
          />
          {values.coverUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setValues((v) => ({ ...v, coverUrl: undefined, coverAlt: undefined }))
              }
            >
              Remove image
            </Button>
          )}
        </div>
        {values.coverUrl && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="post-cover-alt">Describe the image</Label>
            <Input
              id="post-cover-alt"
              value={values.coverAlt ?? ""}
              maxLength={200}
              onChange={(e) => set("coverAlt", e.target.value)}
            />
          </div>
        )}
      </fieldset>

      <fieldset className="grid gap-3 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">Search engines (optional)</legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="post-seo-title">Title for search results</Label>
          <Input
            id="post-seo-title"
            value={values.seoTitle ?? ""}
            maxLength={70}
            placeholder={values.title}
            onChange={(e) => set("seoTitle", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="post-seo-description">Description for search results</Label>
          <Textarea
            id="post-seo-description"
            rows={2}
            maxLength={160}
            value={values.seoDescription ?? ""}
            placeholder={values.excerpt}
            onChange={(e) => set("seoDescription", e.target.value)}
          />
        </div>
      </fieldset>

      {problem && (
        <p role="alert" className="text-destructive text-sm">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving || uploading}>
          {saving ? "Saving..." : live ? "Save changes" : "Save draft"}
        </Button>
        {post && !live && (
          <ReasonDialog
            trigger="Publish"
            triggerVariant="default"
            title={`Publish “${post.title}”?`}
            description="It appears on the blog and in the sitemap straight away. Save your latest changes first."
            reasonLabel="Why now?"
            confirmLabel="Publish"
            onConfirm={async (reason) => {
              stored(
                await api.post<AdminBlogPost>(`/admin/blog/${post.id}/publish`, {
                  reason,
                })
              )
              toast.success("Published")
            }}
          />
        )}
        {post && live && (
          <ReasonDialog
            trigger="Unpublish"
            title={`Unpublish “${post.title}”?`}
            description="It leaves the blog; links to it stop working until it's published again."
            confirmLabel="Unpublish"
            noteRequired
            onConfirm={async (reason, note) => {
              stored(
                await api.post<AdminBlogPost>(`/admin/blog/${post.id}/unpublish`, {
                  reason,
                  note,
                })
              )
              toast.success("Unpublished")
            }}
          />
        )}
        {post && !live && (
          <ReasonDialog
            trigger="Delete draft"
            title={`Delete “${post.title}”?`}
            description="It can't be brought back."
            confirmLabel="Delete draft"
            destructive
            noteRequired
            onConfirm={async (reason, note) => {
              await api.delete(`/admin/blog/${post.id}`, { reason, note })
              await queryClient.invalidateQueries({ queryKey: blogKeys.all })
              toast.success("Draft deleted")
              void navigate("..", { relative: "path" })
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Content › Blog › a post (or a new one). */
export function BlogEditor() {
  const { id = "new" } = useParams()
  const creating = id === "new"
  const { data, isPending, error } = useQuery({
    queryKey: blogKeys.post(id),
    queryFn: ({ signal }) => api.get<AdminBlogPost>(`/admin/blog/${id}`, { signal }),
    enabled: !creating,
  })
  usePageTitle(creating ? "New post" : (data?.title ?? "Blog"))
  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Blog
      </Link>
      {creating ? (
        <>
          <Heading>New post</Heading>
          <Editor post={null} />
        </>
      ) : error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this post.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>{data.title}</Heading>
            <Badge variant="outline">
              {data.status === "published" ? "Published" : "Draft"}
            </Badge>
            {data.status === "published" && (
              <Text variant="muted" className="text-sm">
                /blog/{data.slug}
              </Text>
            )}
          </div>
          <Editor key={`${data.id}-${data.status}`} post={data} />
          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}
