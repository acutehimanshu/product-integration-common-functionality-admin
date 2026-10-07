import { format, formatDistanceToNowStrict, parseISO } from "date-fns"

/** "28 Sep 2026, 14:05" */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy, HH:mm")
}

/** "5 hours ago" — for queues, where waiting time matters. */
export function timeAgo(iso: string): string {
  return `${formatDistanceToNowStrict(parseISO(iso))} ago`
}

/** The admin's own zone (their browser's) — admin screens show times in it. */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
