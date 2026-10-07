/* global console, process, URL -- a Node script, linted by app configs too */
// SonarJS quality gate without a SonarQube server (code audit, phase 8).
//
// Runs SonarSource's rules (eslint.sonar.config.mjs) and compares each rule's
// issue count with sonar-baseline.json. It fails when any rule has more
// issues than its baseline, so new code can't add Sonar issues; fixing
// issues is always allowed. After fixing some, lock the lower numbers in:
//
//   pnpm lint:sonar:gate            check (CI runs this)
//   pnpm lint:sonar:gate --update   rewrite the baseline to today's counts
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { ESLint } from "eslint"

const BASELINE = new URL("../sonar-baseline.json", import.meta.url)
const update = process.argv.includes("--update")

const eslint = new ESLint({
  cwd: new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  overrideConfigFile: "eslint.sonar.config.mjs",
})
// The monorepo (and the shared repo) have apps/packages/e2e; an app repo has src.
const targets = ["apps", "packages", "e2e", "src"].filter((dir) =>
  existsSync(new URL(`../${dir}`, import.meta.url))
)
const results = await eslint.lintFiles(targets)

const counts = {}
for (const result of results)
  for (const message of result.messages) {
    const rule = message.ruleId ?? "(parse error)"
    counts[rule] = (counts[rule] ?? 0) + 1
  }
const sorted = Object.fromEntries(
  Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
)
const total = Object.values(sorted).reduce((sum, n) => sum + n, 0)

if (update) {
  writeFileSync(BASELINE, JSON.stringify({ total, rules: sorted }, null, 2) + "\n")
  console.log(`Sonar baseline updated: ${total} issues.`)
  process.exit(0)
}

if (!existsSync(BASELINE)) {
  console.error("No sonar-baseline.json — run `pnpm lint:sonar:gate --update` once.")
  process.exit(1)
}
const baseline = JSON.parse(readFileSync(BASELINE, "utf8"))

const worse = Object.entries(sorted).filter(
  ([rule, n]) => n > (baseline.rules[rule] ?? 0)
)
const better = Object.entries(baseline.rules).filter(
  ([rule, n]) => (sorted[rule] ?? 0) < n
)

if (worse.length > 0) {
  console.error("Sonar gate failed — new issues (run `pnpm lint:sonar` to see them):")
  for (const [rule, n] of worse)
    console.error(`  ${rule}: ${n} (baseline ${baseline.rules[rule] ?? 0})`)
  process.exit(1)
}
console.log(`Sonar gate passed: ${total} issues (baseline ${baseline.total}).`)
if (better.length > 0)
  console.log(
    "Fewer issues than the baseline — run `pnpm lint:sonar:gate --update` to lock that in."
  )
