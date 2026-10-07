import { moveItem } from "@/lib/move-item"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import type { AdminCategory } from "@acutehimanshu/core/domain/admin-content"
import {
  isAllowedHref,
  MAX_HOME_BANNERS,
  type AdminSiteContent,
  type HomeBanner,
  type HomeContent,
} from "@acutehimanshu/core/domain/site-content"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"

export const homeKey = ["admin", "content", "site", "home"] as const

const SECTION_LABELS: Record<keyof HomeContent["sections"], string> = {
  trending: "Trending (most bought and saved lately)",
  deals: "Deals (listings open to offers)",
  featuredShops: "Featured shops (bought with credits)",
  fresh: "Fresh listings (newest first)",
}

/** What's wrong with the home content before saving, or null. The backend checks again. */
export function homeProblem(home: HomeContent): string | null {
  for (const [i, banner] of home.banners.entries()) {
    if (banner.title.trim().length < 3) return `Banner ${i + 1} needs a title.`
    if (!banner.ctaLabel.trim()) return `Banner ${i + 1} needs a button label.`
    if (!isAllowedHref(banner.ctaHref.trim()))
      return `Banner ${i + 1}'s button must go to /… (this site) or https://….`
  }
  return null
}

function Editor({
  saved,
  categories,
}: {
  saved: HomeContent
  categories: AdminCategory[]
}) {
  const queryClient = useQueryClient()
  const [home, setHome] = useState<HomeContent>(saved)
  const visible = categories.filter((c) => !c.hidden)

  const setBanner = (index: number, change: Partial<HomeBanner>) =>
    setHome((h) => ({
      ...h,
      banners: h.banners.map((b, i) => (i === index ? { ...b, ...change } : b)),
    }))
  const chosen = home.categoryIds
  const toggleCategory = (id: string, on: boolean) =>
    setHome((h) => ({
      ...h,
      categoryIds: on ? [...h.categoryIds, id] : h.categoryIds.filter((c) => c !== id),
    }))

  return (
    <>
      <section aria-labelledby="home-banners" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="home-banners">
          Banners
        </Heading>
        <Text variant="muted" className="text-sm">
          Shown in this order under the search box. None = just the welcome.
        </Text>
        {home.banners.map((banner, index) => (
          <fieldset
            key={banner.id}
            className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
          >
            <legend className="px-1 text-sm font-medium">Banner {index + 1}</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`banner-${index}-title`}>Title</Label>
              <Input
                id={`banner-${index}-title`}
                value={banner.title}
                maxLength={80}
                onChange={(e) => setBanner(index, { title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`banner-${index}-tone`}>Style</Label>
              <NativeSelect
                id={`banner-${index}-tone`}
                value={banner.tone}
                onChange={(e) =>
                  setBanner(index, { tone: e.target.value as HomeBanner["tone"] })
                }
              >
                <option value="brand">Brand colour</option>
                <option value="muted">Quiet grey</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`banner-${index}-text`}>Text</Label>
              <Input
                id={`banner-${index}-text`}
                value={banner.text}
                maxLength={200}
                onChange={(e) => setBanner(index, { text: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`banner-${index}-cta`}>Button label</Label>
              <Input
                id={`banner-${index}-cta`}
                value={banner.ctaLabel}
                maxLength={30}
                onChange={(e) => setBanner(index, { ctaLabel: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`banner-${index}-href`}>Button goes to</Label>
              <Input
                id={`banner-${index}-href`}
                value={banner.ctaHref}
                placeholder="/deals or https://…"
                onChange={(e) => setBanner(index, { ctaHref: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button
                variant="outline"
                size="sm"
                aria-label={`Move banner ${index + 1} up`}
                disabled={index === 0}
                onClick={() =>
                  setHome((h) => ({
                    ...h,
                    banners: moveItem(h.banners, index, index - 1),
                  }))
                }
              >
                Move up
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Remove banner ${index + 1}`}
                onClick={() =>
                  setHome((h) => ({
                    ...h,
                    banners: h.banners.filter((_, i) => i !== index),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          </fieldset>
        ))}
        <div>
          <Button
            variant="outline"
            disabled={home.banners.length >= MAX_HOME_BANNERS}
            onClick={() =>
              setHome((h) => ({
                ...h,
                banners: [
                  ...h.banners,
                  {
                    id: `banner-${Date.now()}`,
                    title: "",
                    text: "",
                    ctaLabel: "",
                    ctaHref: "",
                    tone: "brand",
                  },
                ],
              }))
            }
          >
            Add a banner
          </Button>
        </div>
      </section>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-lg font-semibold">Sections</legend>
        {(Object.keys(SECTION_LABELS) as Array<keyof HomeContent["sections"]>).map(
          (section) => (
            <label key={section} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={home.sections[section]}
                onChange={(e) =>
                  setHome((h) => ({
                    ...h,
                    sections: { ...h.sections, [section]: e.target.checked },
                  }))
                }
              />
              {SECTION_LABELS[section]}
            </label>
          )
        )}
      </fieldset>

      <section aria-labelledby="home-tiles" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="home-tiles">
          Category tiles
        </Heading>
        <Text variant="muted" className="text-sm">
          Tick the categories to show, in the order you tick them. None ticked = every
          category.
        </Text>
        {chosen.length > 0 && (
          <ol aria-label="Tile order" className="flex flex-col gap-1 text-sm">
            {chosen.map((id, index) => (
              <li key={id} className="flex items-center gap-2">
                <span className="flex-1">
                  {index + 1}. {categories.find((c) => c.id === id)?.name ?? id}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  aria-label={`Move ${categories.find((c) => c.id === id)?.name} up`}
                  disabled={index === 0}
                  onClick={() =>
                    setHome((h) => ({
                      ...h,
                      categoryIds: moveItem(h.categoryIds, index, index - 1),
                    }))
                  }
                >
                  Up
                </Button>
              </li>
            ))}
          </ol>
        )}
        <div className="grid gap-1 sm:grid-cols-3">
          {visible.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={chosen.includes(category.id)}
                onChange={(e) => toggleCategory(category.id, e.target.checked)}
              />
              {category.name}
            </label>
          ))}
        </div>
      </section>

      <div>
        <ReasonDialog
          trigger="Publish home page"
          triggerVariant="default"
          title="Publish the home page?"
          description="The marketplace home page changes straight away."
          reasonLabel="What changed?"
          confirmLabel="Publish"
          validate={() => homeProblem(home)}
          onConfirm={async (reason) => {
            const updated = await api.put<AdminSiteContent<HomeContent>>(
              "/admin/content/home",
              {
                banners: home.banners.map((b) => ({
                  ...b,
                  title: b.title.trim(),
                  text: b.text.trim(),
                  ctaLabel: b.ctaLabel.trim(),
                  ctaHref: b.ctaHref.trim(),
                })),
                sections: home.sections,
                categoryIds: home.categoryIds,
                reason,
              }
            )
            queryClient.setQueryData(homeKey, updated)
            toast.success("Home page published")
          }}
        />
      </div>
    </>
  )
}

/** Content › Home page. */
export function HomeEditor() {
  usePageTitle("Home page")
  const home = useQuery({
    queryKey: homeKey,
    queryFn: ({ signal }) =>
      api.get<AdminSiteContent<HomeContent>>("/admin/content/home", { signal }),
  })
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: ({ signal }) => api.get<AdminCategory[]>("/admin/categories", { signal }),
  })
  const error = home.error ?? categories.error
  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Content
      </Link>
      <Heading>Home page</Heading>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the home page.")}
        </Text>
      ) : !home.data || !categories.data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Editor
            key={home.data.history[0]?.id ?? "initial"}
            saved={home.data.content}
            categories={categories.data}
          />
          <AuditHistory entries={home.data.history} />
        </>
      )}
    </PageContainer>
  )
}
