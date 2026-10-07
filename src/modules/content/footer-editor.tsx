import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import {
  isAllowedHref,
  MAX_FOOTER_COLUMNS,
  SOCIAL_NETWORK_LABELS,
  SOCIAL_NETWORKS,
  type AdminSiteContent,
  type FooterContent,
  type SocialNetwork,
} from "@acutehimanshu/core/domain/site-content"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { AuditHistory } from "@/components/audit-history"
import { ReasonDialog } from "@/components/reason-dialog"
import { api, getErrorMessage } from "@/lib/api"
import { usePageTitle } from "@/lib/use-page-title"

export const footerKey = ["admin", "content", "site", "footer"] as const

/** What's wrong with a footer before saving, or null. The backend checks again. */
export function footerProblem(footer: FooterContent): string | null {
  for (const column of footer.columns) {
    if (!column.title.trim()) return "Every column needs a title."
    if (column.links.length === 0) return `“${column.title}” needs at least one link.`
    for (const link of column.links) {
      if (!link.label.trim()) return `A link in “${column.title}” has no label.`
      if (!isAllowedHref(link.href.trim()))
        return `“${link.label || "A link"}” must start with / (this site) or https://.`
    }
  }
  for (const item of footer.social) {
    if (!/^https:\/\//.test(item.url))
      return `The ${SOCIAL_NETWORK_LABELS[item.network]} link must start with https://.`
  }
  return null
}

function Editor({ saved }: { saved: FooterContent }) {
  const queryClient = useQueryClient()
  const [footer, setFooter] = useState<FooterContent>(saved)
  const social = new Map(footer.social.map((s) => [s.network, s.url]))

  const setColumn = (index: number, change: Partial<FooterContent["columns"][number]>) =>
    setFooter((f) => ({
      ...f,
      columns: f.columns.map((c, i) => (i === index ? { ...c, ...change } : c)),
    }))
  const setSocial = (network: SocialNetwork, url: string) =>
    setFooter((f) => ({
      ...f,
      social: SOCIAL_NETWORKS.flatMap((n) => {
        const value = n === network ? url.trim() : (social.get(n) ?? "")
        return value ? [{ network: n, url: value }] : []
      }),
    }))

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="footer-tagline">Tagline</Label>
        <Input
          id="footer-tagline"
          value={footer.tagline}
          maxLength={120}
          onChange={(e) => setFooter((f) => ({ ...f, tagline: e.target.value }))}
        />
      </div>

      <section aria-labelledby="footer-columns" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="footer-columns">
          Link columns
        </Heading>
        <Text variant="muted" className="text-sm">
          Links start with / for a page on the marketplace (e.g. /help) or https:// for
          another site. The legal pages are always added as their own column.
        </Text>
        {footer.columns.map((column, index) => (
          <fieldset key={index} className="flex flex-col gap-2 rounded-xl border p-4">
            <legend className="px-1 text-sm font-medium">Column {index + 1}</legend>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`column-${index}-title`}>Title</Label>
                <Input
                  id={`column-${index}-title`}
                  value={column.title}
                  maxLength={30}
                  onChange={(e) => setColumn(index, { title: e.target.value })}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Remove column ${index + 1}`}
                onClick={() =>
                  setFooter((f) => ({
                    ...f,
                    columns: f.columns.filter((_, i) => i !== index),
                  }))
                }
              >
                Remove column
              </Button>
            </div>
            {column.links.map((link, li) => (
              <div key={li} className="flex flex-wrap items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`column-${index}-link-${li}-label`}>Link label</Label>
                  <Input
                    id={`column-${index}-link-${li}-label`}
                    value={link.label}
                    maxLength={40}
                    onChange={(e) =>
                      setColumn(index, {
                        links: column.links.map((l, i) =>
                          i === li ? { ...l, label: e.target.value } : l
                        ),
                      })
                    }
                  />
                </div>
                <div className="flex flex-[2] flex-col gap-1.5">
                  <Label htmlFor={`column-${index}-link-${li}-href`}>Goes to</Label>
                  <Input
                    id={`column-${index}-link-${li}-href`}
                    value={link.href}
                    placeholder="/help or https://…"
                    onChange={(e) =>
                      setColumn(index, {
                        links: column.links.map((l, i) =>
                          i === li ? { ...l, href: e.target.value } : l
                        ),
                      })
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Remove ${link.label || "link"}`}
                  onClick={() =>
                    setColumn(index, { links: column.links.filter((_, i) => i !== li) })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={column.links.length >= 8}
                onClick={() =>
                  setColumn(index, { links: [...column.links, { label: "", href: "" }] })
                }
              >
                Add a link
              </Button>
            </div>
          </fieldset>
        ))}
        <div>
          <Button
            variant="outline"
            disabled={footer.columns.length >= MAX_FOOTER_COLUMNS}
            onClick={() =>
              setFooter((f) => ({
                ...f,
                columns: [...f.columns, { title: "", links: [{ label: "", href: "" }] }],
              }))
            }
          >
            Add a column
          </Button>
        </div>
      </section>

      <section aria-labelledby="footer-social" className="flex flex-col gap-3">
        <Heading as="h2" size="h3" id="footer-social">
          Social media
        </Heading>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_NETWORKS.map((network) => (
            <div key={network} className="flex flex-col gap-1.5">
              <Label htmlFor={`social-${network}`}>
                {SOCIAL_NETWORK_LABELS[network]}
              </Label>
              <Input
                id={`social-${network}`}
                placeholder="https://… (blank = not shown)"
                defaultValue={social.get(network) ?? ""}
                onChange={(e) => setSocial(network, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <div>
        <ReasonDialog
          trigger="Publish footer"
          triggerVariant="default"
          title="Publish the footer?"
          description="It replaces the footer on every page of the marketplace within a few minutes."
          reasonLabel="What changed?"
          confirmLabel="Publish"
          validate={() => footerProblem(footer)}
          onConfirm={async (reason) => {
            const updated = await api.put<AdminSiteContent<FooterContent>>(
              "/admin/content/footer",
              {
                tagline: footer.tagline.trim(),
                columns: footer.columns.map((c) => ({
                  title: c.title.trim(),
                  links: c.links.map((l) => ({
                    label: l.label.trim(),
                    href: l.href.trim(),
                  })),
                })),
                social: footer.social,
                reason,
              }
            )
            queryClient.setQueryData(footerKey, updated)
            toast.success("Footer published")
          }}
        />
      </div>
    </>
  )
}

/** Content › Footer. */
export function FooterEditor() {
  usePageTitle("Footer")
  const { data, isPending, error } = useQuery({
    queryKey: footerKey,
    queryFn: ({ signal }) =>
      api.get<AdminSiteContent<FooterContent>>("/admin/content/footer", { signal }),
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
      <Heading>Footer</Heading>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the footer.")}
        </Text>
      ) : isPending ? (
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
