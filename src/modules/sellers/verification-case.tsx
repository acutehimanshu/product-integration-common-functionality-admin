import {
  CASE_STATUS_LABELS,
  REGISTRY_KIND_LABELS,
  type VerificationCaseView,
} from "@acutehimanshu/core/domain/verification"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { formatDateTime } from "@/lib/format"

const REGISTRY_LABELS = {
  active: "Active on the register",
  inactive: "Inactive on the register",
  not_found: "Not on the register",
  error: "Register couldn't be checked",
} as const

/**
 * The seller's verification case (FRD-03 03-012): every submission as it was
 * sent — with the requirements that applied, registry results and private
 * documents (signed links) — and every review, newest first.
 */
export function VerificationCase({ value }: Readonly<{ value: VerificationCaseView }>) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-2">
        <Heading as="h2" size="h3">
          Verification case
        </Heading>
        <Badge variant="outline">{CASE_STATUS_LABELS[value.status]}</Badge>
        {value.expiresAt && (
          <Text variant="muted" className="text-sm">
            {value.status === "expired" ? "Expired" : "Valid until"}{" "}
            {formatDateTime(value.expiresAt)}
          </Text>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {value.submissions.length === 0 && (
          <Text variant="muted">Nothing submitted yet.</Text>
        )}
        {value.submissions.map((submission) => (
          <section
            key={submission.id}
            aria-label={`Submission ${formatDateTime(submission.submittedAt)}`}
            className="flex flex-col gap-1 rounded-lg border p-3"
          >
            <Text className="font-medium">
              Submitted {formatDateTime(submission.submittedAt)} · requirements v
              {submission.requirements.version}
              {submission.requirements.manualReview && " · needs a person"}
            </Text>
            {submission.identifiers.map((identifier) => (
              <Text key={identifier.kind}>
                {REGISTRY_KIND_LABELS[identifier.kind]}{" "}
                <span className="font-mono">{identifier.number}</span>:{" "}
                {identifier.registry
                  ? `${REGISTRY_LABELS[identifier.registry.status]}${
                      identifier.registry.legalName
                        ? ` (${identifier.registry.legalName})`
                        : ""
                    }`
                  : "not checked"}
              </Text>
            ))}
            {submission.documents.map((document) => (
              <a
                key={document.file}
                href={document.file}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {document.label}
              </a>
            ))}
            {submission.partnerFailed && (
              <Text className="text-destructive">
                Partner couldn&apos;t confirm: {submission.partnerFailed.join(", ")}
              </Text>
            )}
          </section>
        ))}
        {value.reviews.length > 0 && (
          <ul aria-label="Reviews" className="flex flex-col gap-1">
            {value.reviews.map((review) => (
              <li key={review.at}>
                {CASE_STATUS_LABELS[review.decision]} by {review.by.name},{" "}
                {formatDateTime(review.at)}: “{review.note}”
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
