import { moveItem } from "@/lib/move-item"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"
import {
  HELP_ANSWER_MAX,
  HELP_QUESTION_MAX,
  MAX_HELP_QUESTIONS,
  MAX_HELP_TOPICS,
  helpAnchor,
  type HelpContent,
  type HelpQuestion,
  type HelpTopicContent,
} from "@acutehimanshu/core/domain/help-content"
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

export const helpKey = ["admin", "content", "site", "help"] as const

/** New topics get a temporary id; it becomes the anchor (/help#…) when saved. */
const NEW_TOPIC = "new-"

function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** What's wrong with the help centre before saving, or null. The backend checks again. */
export function helpProblem(help: HelpContent): string | null {
  for (const [t, topic] of help.topics.entries()) {
    if (topic.title.trim().length < 2) return `Topic ${t + 1} needs a title.`
    for (const [q, item] of topic.questions.entries()) {
      if (item.q.trim().length < 3)
        return `“${topic.title}”: question ${q + 1} needs text.`
      if (item.a.trim().length < 3)
        return `“${topic.title}”: question ${q + 1} needs an answer.`
    }
  }
  return null
}

/** Trimmed, with new topics given a readable, unique anchor. */
export function helpToSave(help: HelpContent): HelpContent {
  const taken = new Set(
    help.topics.filter((t) => !t.id.startsWith(NEW_TOPIC)).map((t) => t.id)
  )
  return {
    topics: help.topics.map((topic) => {
      let id = topic.id
      if (id.startsWith(NEW_TOPIC)) {
        const base = helpAnchor(topic.title)
        id = base
        for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
        taken.add(id)
      }
      return {
        ...topic,
        id,
        title: topic.title.trim(),
        questions: topic.questions.map((item) => ({
          ...item,
          q: item.q.trim(),
          a: item.a.trim(),
        })),
      }
    }),
  }
}

function Editor({ saved }: { saved: HelpContent }) {
  const queryClient = useQueryClient()
  const [help, setHelp] = useState<HelpContent>(saved)

  const setTopic = (index: number, change: Partial<HelpTopicContent>) =>
    setHelp((h) => ({
      topics: h.topics.map((t, i) => (i === index ? { ...t, ...change } : t)),
    }))
  const setQuestions = (index: number, update: (q: HelpQuestion[]) => HelpQuestion[]) =>
    setHelp((h) => ({
      topics: h.topics.map((t, i) =>
        i === index ? { ...t, questions: update(t.questions) } : t
      ),
    }))

  return (
    <>
      {help.topics.map((topic, t) => {
        const name = topic.title.trim() || `Topic ${t + 1}`
        return (
          <fieldset key={topic.id} className="flex flex-col gap-3 rounded-xl border p-4">
            <legend className="px-1 text-sm font-medium">{name}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`topic-${t}-title`}>Topic title</Label>
                <Input
                  id={`topic-${t}-title`}
                  value={topic.title}
                  maxLength={60}
                  onChange={(e) => setTopic(t, { title: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={topic.published}
                  onChange={(e) => setTopic(t, { published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <ol className="flex flex-col gap-3" aria-label={`${name} questions`}>
              {topic.questions.map((item, q) => (
                <li
                  key={item.id}
                  className="bg-muted/30 flex flex-col gap-2 rounded-lg p-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`q-${item.id}`}>Question {q + 1}</Label>
                    <Input
                      id={`q-${item.id}`}
                      value={item.q}
                      maxLength={HELP_QUESTION_MAX}
                      onChange={(e) =>
                        setQuestions(t, (list) =>
                          list.map((x, i) => (i === q ? { ...x, q: e.target.value } : x))
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`a-${item.id}`}>Answer</Label>
                    <Textarea
                      id={`a-${item.id}`}
                      value={item.a}
                      rows={3}
                      maxLength={HELP_ANSWER_MAX}
                      onChange={(e) =>
                        setQuestions(t, (list) =>
                          list.map((x, i) => (i === q ? { ...x, a: e.target.value } : x))
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={item.published}
                        onChange={(e) =>
                          setQuestions(t, (list) =>
                            list.map((x, i) =>
                              i === q ? { ...x, published: e.target.checked } : x
                            )
                          )
                        }
                      />
                      Published
                    </label>
                    <Button
                      variant="outline"
                      size="xs"
                      aria-label={`Move question ${q + 1} of ${name} up`}
                      disabled={q === 0}
                      onClick={() => setQuestions(t, (list) => moveItem(list, q, q - 1))}
                    >
                      Move up
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      aria-label={`Remove question ${q + 1} of ${name}`}
                      onClick={() =>
                        setQuestions(t, (list) => list.filter((_, i) => i !== q))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={topic.questions.length >= MAX_HELP_QUESTIONS}
                onClick={() =>
                  setQuestions(t, (list) => [
                    ...list,
                    { id: newId("q-"), q: "", a: "", published: true },
                  ])
                }
              >
                Add a question to {name}
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Move ${name} up`}
                disabled={t === 0}
                onClick={() => setHelp((h) => ({ topics: moveItem(h.topics, t, t - 1) }))}
              >
                Move topic up
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Remove ${name}`}
                onClick={() =>
                  setHelp((h) => ({ topics: h.topics.filter((_, i) => i !== t) }))
                }
              >
                Remove topic
              </Button>
            </div>
          </fieldset>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={help.topics.length >= MAX_HELP_TOPICS}
          onClick={() =>
            setHelp((h) => ({
              topics: [
                ...h.topics,
                { id: newId(NEW_TOPIC), title: "", published: true, questions: [] },
              ],
            }))
          }
        >
          Add a topic
        </Button>
        <ReasonDialog
          trigger="Publish help centre"
          triggerVariant="default"
          title="Publish the help centre?"
          description="The marketplace's help page shows the change within 5 minutes."
          reasonLabel="What changed?"
          confirmLabel="Publish"
          validate={() => helpProblem(help)}
          onConfirm={async (reason) => {
            const updated = await api.put<AdminSiteContent<HelpContent>>(
              "/admin/content/help",
              { ...helpToSave(help), reason }
            )
            queryClient.setQueryData(helpKey, updated)
            toast.success("Help centre published")
          }}
        />
      </div>
    </>
  )
}

/** Content › Help centre: topics and questions on the buyer site's /help. */
export function HelpEditor() {
  usePageTitle("Help centre")
  const { data, error } = useQuery({
    queryKey: helpKey,
    queryFn: ({ signal }) =>
      api.get<AdminSiteContent<HelpContent>>("/admin/content/help", { signal }),
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
        <Heading>Help centre</Heading>
        <Text variant="muted">
          Questions and answers on the marketplace&apos;s Help page, in this order.
          Unpublished ones stay here until you publish them. Plain text; describe rules
          you can change in Settings rather than quoting numbers.
        </Text>
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the help centre.")}
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
