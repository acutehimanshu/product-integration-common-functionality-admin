import { describe, expect, it } from "vitest"
import { DEFAULT_FOOTER, DEFAULT_HOME } from "@acutehimanshu/core/domain/site-content"
import { footerProblem } from "@/modules/content/footer-editor"
import { homeProblem } from "@/modules/content/home-editor"
import { postProblem } from "@/modules/content/blog"
import { DEFAULT_HELP } from "@acutehimanshu/core/domain/help-content"
import { helpProblem, helpToSave } from "@/modules/content/help-editor"
import { seoProblem } from "@/modules/content/seo-editor"

describe("site content checks", () => {
  it("accepts the defaults", () => {
    expect(footerProblem(DEFAULT_FOOTER)).toBeNull()
    expect(homeProblem(DEFAULT_HOME)).toBeNull()
  })

  it("only allows site paths and https links", () => {
    const withLink = (href: string) =>
      footerProblem({
        ...DEFAULT_FOOTER,
        columns: [{ title: "More", links: [{ label: "Go", href }] }],
      })
    expect(withLink("/help")).toBeNull()
    expect(withLink("https://example.com")).toBeNull()
    expect(withLink("javascript:alert(1)")).toMatch(/must start with/)
    expect(withLink("//evil.example")).toMatch(/must start with/)
  })

  it("wants a title, button label and link on every banner", () => {
    const banner = {
      id: "b1",
      title: "Spring sale",
      text: "",
      ctaLabel: "Shop",
      ctaHref: "/deals",
      tone: "brand" as const,
    }
    expect(homeProblem({ ...DEFAULT_HOME, banners: [banner] })).toBeNull()
    expect(homeProblem({ ...DEFAULT_HOME, banners: [{ ...banner, title: "" }] })).toMatch(
      /needs a title/
    )
    expect(
      homeProblem({ ...DEFAULT_HOME, banners: [{ ...banner, ctaHref: "deals" }] })
    ).toMatch(/must go to/)
  })
})

describe("blog post checks", () => {
  const post = {
    title: "How offers work",
    slug: "how-offers-work",
    excerpt: "Name your price, and what happens next.",
    body: "Offers let you name your price, within limits.",
  }

  it("wants a title, a clean address, a summary and text", () => {
    expect(postProblem(post)).toBeNull()
    expect(postProblem({ ...post, slug: "How Offers" })).toMatch(/lowercase/)
    expect(postProblem({ ...post, excerpt: "" })).toMatch(/summary/)
  })

  it("wants the cover image described", () => {
    expect(postProblem({ ...post, coverUrl: "https://x/cover.png" })).toMatch(/Describe/)
    expect(
      postProblem({ ...post, coverUrl: "https://x/cover.png", coverAlt: "A teapot" })
    ).toBeNull()
  })
})

describe("help centre checks", () => {
  it("accepts the starting text and wants a title, question and answer", () => {
    expect(helpProblem(DEFAULT_HELP)).toBeNull()
    const topic = { id: "t", title: "Buying", published: true, questions: [] }
    expect(helpProblem({ topics: [{ ...topic, title: " " }] })).toMatch(/Topic 1/)
    expect(
      helpProblem({
        topics: [
          { ...topic, questions: [{ id: "q", q: "Why?", a: "", published: true }] },
        ],
      })
    ).toMatch(/needs an answer/)
  })

  it("gives new topics a readable, unique anchor", () => {
    const saved = helpToSave({
      topics: [
        { id: "buying", title: "Buying", published: true, questions: [] },
        { id: "new-abc", title: " Buying ", published: true, questions: [] },
        {
          id: "new-def",
          title: "Your account & privacy",
          published: false,
          questions: [],
        },
      ],
    })
    expect(saved.topics.map((t) => t.id)).toEqual([
      "buying",
      "buying-2",
      "your-account-privacy",
    ])
    expect(saved.topics[1]?.title).toBe("Buying")
  })
})

describe("search & sharing checks", () => {
  it("only takes uploaded or https share images", () => {
    expect(
      seoProblem({ home: { title: "Hi", description: null, image: null } })
    ).toBeNull()
    expect(
      seoProblem({
        home: { title: null, description: null, image: "http://x.test/a.png" },
      })
    ).toMatch(/Shop home page/)
  })
})
