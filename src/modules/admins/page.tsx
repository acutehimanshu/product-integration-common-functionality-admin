import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, Route, Routes, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"
import {
  ACCESS_LEVEL_LABELS,
  ADMIN_SECTION_LABELS,
  ADMIN_SECTIONS,
  noPermissions,
  type AdminPermissions,
  type AdminSecurity,
} from "@acutehimanshu/core/domain/admin"
import type {
  AdminAccount,
  AdminAccountDetail,
} from "@acutehimanshu/core/domain/admin-content"
import type { AuditEntry } from "@acutehimanshu/core/domain/admin-audit"
import type { Page } from "@acutehimanshu/core/types/page"
import { PageContainer } from "@acutehimanshu/ui/components/page-container"
import { Heading } from "@acutehimanshu/ui/components/heading"
import { Text } from "@acutehimanshu/ui/components/text"
import { Badge } from "@acutehimanshu/ui/components/ui/badge"
import { buttonVariants } from "@acutehimanshu/ui/components/ui/button"
import { Card, CardContent, CardHeader } from "@acutehimanshu/ui/components/ui/card"
import { Input } from "@acutehimanshu/ui/components/ui/input"
import { Label } from "@acutehimanshu/ui/components/ui/label"
import { Skeleton } from "@acutehimanshu/ui/components/ui/skeleton"
import { ActivityLog } from "@/components/activity-log"
import { AuditHistory } from "@/components/audit-history"
import { accessSummary } from "@/components/module-access"
import { Pager } from "@/components/pager"
import { PermissionsEditor } from "@/components/permissions-editor"
import { ChangeList } from "@/components/change-list"
import { ReasonDialog } from "@/components/reason-dialog"
import { AccessLimits } from "./access-limits"
import { SearchBox } from "@/components/search-box"
import { api, getErrorMessage } from "@/lib/api"
import { useAdmin } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"
import { usePageTitle } from "@/lib/use-page-title"

const adminKeys = {
  all: ["admin", "admins"] as const,
  detail: (id: string) => ["admin", "admins", id] as const,
  audit: (q: string, page: number, from = "", to = "") =>
    ["admin", "audit", q, page, from, to] as const,
}

const hasAny = (permissions: AdminPermissions) =>
  ADMIN_SECTIONS.some((section) => permissions[section] !== "none")

function InviteAdmin({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [permissions, setPermissions] = useState<AdminPermissions>(noPermissions())
  return (
    <ReasonDialog
      trigger="Add a sub-admin"
      triggerVariant="default"
      title="Add a sub-admin"
      description="They log in with a one-time code sent to this email, then set a password. Everything they do is in the activity log."
      fields={
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Work email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <PermissionsEditor
            idPrefix="invite"
            value={permissions}
            onChange={setPermissions}
          />
        </>
      }
      validate={() =>
        name.trim().length < 2
          ? "Enter their name."
          : !email.includes("@")
            ? "Enter their work email."
            : !hasAny(permissions)
              ? "Give them at least one section."
              : null
      }
      confirmLabel="Add sub-admin"
      onConfirm={async (reason) => {
        await api.post("/admin/admins", {
          name: name.trim(),
          email: email.trim(),
          permissions,
          reason,
        })
        setName("")
        setEmail("")
        setPermissions(noPermissions())
        onSaved()
        toast.success("Sub-admin added")
      }}
    />
  )
}

/** Two-step login for every admin (FRD-01 ADM-003): password, then an emailed code. */
function TwoStepSetting() {
  const queryClient = useQueryClient()
  const key = [...adminKeys.all, "security"] as const
  const { data } = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.get<AdminSecurity>("/admin/security", { signal }),
  })
  if (!data) return null
  const on = data.requireTwoStep
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div className="flex flex-col gap-1">
        <Text className="font-medium">
          Two-step login for every admin: {on ? "on" : "off"}
        </Text>
        <Text variant="muted" className="text-sm">
          Password, then a code we email them. A code alone only lets someone set a
          password. You can also turn it on for one admin from their page.
        </Text>
      </div>
      <ReasonDialog
        trigger={on ? "Turn off" : "Require two-step login"}
        triggerVariant={on ? "outline" : "default"}
        title={on ? "Stop requiring two-step login?" : "Require two-step login?"}
        description={
          on
            ? "Admins without their own two-step setting log in with a password or a code alone again."
            : "From their next login, every admin needs their password and an emailed code."
        }
        confirmLabel={on ? "Turn off" : "Require it"}
        onConfirm={async (reason) => {
          queryClient.setQueryData(
            key,
            await api.put<AdminSecurity>("/admin/security", {
              requireTwoStep: !on,
              reason,
            })
          )
          toast.success(
            on ? "Two-step login no longer required" : "Two-step login required"
          )
        }}
      />
    </div>
  )
}

/** Maker-checker for rules (FRD-02 CFG-052): a second admin publishes each rule. */
function RuleApprovalSetting() {
  const queryClient = useQueryClient()
  const key = [...adminKeys.all, "security"] as const
  const { data } = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.get<AdminSecurity>("/admin/security", { signal }),
  })
  if (!data) return null
  const on = data.rulesNeedApproval
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div className="flex flex-col gap-1">
        <Text className="font-medium">
          Rules need a second admin: {on ? "on" : "off"}
        </Text>
        <Text variant="muted" className="text-sm">
          A submitted rule waits until another admin with Rules access approves it. Give
          at least one sub-admin the Rules section so someone can approve yours.
        </Text>
      </div>
      <ReasonDialog
        trigger={on ? "Turn off" : "Require approval"}
        triggerVariant={on ? "outline" : "default"}
        title={on ? "Stop requiring rule approval?" : "Require a second admin for rules?"}
        description={
          on
            ? "Submitted rules apply from their start without approval. Rules already waiting stay waiting."
            : "From now on, every submitted rule waits for another admin's approval."
        }
        confirmLabel={on ? "Turn off" : "Require it"}
        onConfirm={async (reason) => {
          queryClient.setQueryData(
            key,
            await api.put<AdminSecurity>("/admin/security", {
              rulesNeedApproval: !on,
              reason,
            })
          )
          toast.success(
            on ? "Rule approval no longer required" : "Rule approval required"
          )
        }}
      />
    </div>
  )
}

function AdminList() {
  usePageTitle("Admin accounts")
  const queryClient = useQueryClient()
  const { data: me } = useAdmin()
  const { data, isPending, error } = useQuery({
    queryKey: adminKeys.all,
    queryFn: ({ signal }) => api.get<AdminAccount[]>("/admin/admins", { signal }),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.all })

  return (
    <PageContainer maxWidth="4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading>Admin accounts</Heading>
          <Text variant="muted">
            Your sub-admins, the sections each one can use, and what they&apos;ve been
            doing.
          </Text>
        </div>
        <div className="flex gap-2">
          <Link to="audit" className={buttonVariants({ variant: "outline" })}>
            Audit log
          </Link>
          <InviteAdmin onSaved={refresh} />
        </div>
      </div>
      <TwoStepSetting />
      <RuleApprovalSetting />
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load admins.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border" aria-label="Admins">
          {data.map((account) => (
            <li
              key={account.id}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  <Link to={account.id} className="hover:underline">
                    {account.name}
                  </Link>
                  {account.id === me?.id && <Badge variant="secondary">You</Badge>}
                  {account.status === "deactivated" && (
                    <Badge variant="destructive">Deactivated</Badge>
                  )}
                  {!account.hasPassword && account.status === "active" && (
                    <Badge variant="outline">No password yet</Badge>
                  )}
                  {account.activeSessions > 0 && (
                    <Badge variant="outline">
                      Online · {account.activeSessions} session
                      {account.activeSessions === 1 ? "" : "s"}
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {account.email} · {accessSummary(account)}
                  {account.lastActiveAt &&
                    ` · Last active ${formatDateTime(account.lastActiveAt)}`}
                </span>
              </div>
              <Link
                to={account.id}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {account.isSuperAdmin ? "Your activity" : "Access and activity"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}

function EditPermissions({
  account,
  onSaved,
}: {
  account: AdminAccountDetail
  onSaved: (updated: AdminAccountDetail) => void
}) {
  const [permissions, setPermissions] = useState(account.permissions)
  return (
    <div className="flex flex-col gap-3">
      <PermissionsEditor
        idPrefix={`perm-${account.id}`}
        value={permissions}
        onChange={setPermissions}
      />
      <div>
        <ReasonDialog
          trigger="Save access"
          triggerVariant="default"
          title={`Change ${account.name}'s access?`}
          description="They're logged out at once and see the new sections when they log back in."
          validate={() =>
            !hasAny(permissions)
              ? "Give them at least one section — or deactivate them instead."
              : JSON.stringify(permissions) === JSON.stringify(account.permissions)
                ? "Nothing has changed."
                : null
          }
          confirmLabel="Save access"
          onConfirm={async (reason) => {
            onSaved(
              await api.patch<AdminAccountDetail>(`/admin/admins/${account.id}`, {
                permissions,
                reason,
              })
            )
            toast.success("Access saved — they've been logged out")
          }}
        />
      </div>
    </div>
  )
}

function AdminDetail() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery({
    queryKey: adminKeys.detail(id),
    queryFn: ({ signal }) =>
      api.get<AdminAccountDetail>(`/admin/admins/${id}`, { signal }),
  })
  usePageTitle(data?.name ?? "Admin")
  const stored = (updated: AdminAccountDetail) => {
    queryClient.setQueryData(adminKeys.detail(id), updated)
    void queryClient.invalidateQueries({ queryKey: adminKeys.all, exact: true })
    void queryClient.invalidateQueries({ queryKey: ["admin", "activity"] })
  }

  return (
    <PageContainer maxWidth="6xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Admin accounts
      </Link>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load this admin.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Heading>{data.name}</Heading>
            <Badge variant="outline">{accessSummary(data)}</Badge>
            {data.status === "deactivated" && (
              <Badge variant="destructive">Deactivated</Badge>
            )}
          </div>
          <Text variant="muted">
            {data.email} · Added {formatDateTime(data.createdAt)}
          </Text>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Access
                </Heading>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {data.isSuperAdmin ? (
                  <Text>
                    The super admin has every section, plus settings, admin accounts and
                    the activity log. There is only one, and it can&apos;t be limited.
                  </Text>
                ) : (
                  <>
                    <ul
                      aria-label="Current access"
                      className="flex flex-col gap-0.5 text-sm"
                    >
                      {ADMIN_SECTIONS.filter((s) => data.permissions[s] !== "none").map(
                        (section) => (
                          <li key={section}>
                            {ADMIN_SECTION_LABELS[section]}:{" "}
                            <span className="font-medium">
                              {ACCESS_LEVEL_LABELS[data.permissions[section]]}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                    <EditPermissions
                      key={JSON.stringify(data.permissions)}
                      account={data}
                      onSaved={stored}
                    />
                    <AccessLimits
                      key={JSON.stringify([data.restrictedActions, data.countries])}
                      account={data}
                      onSaved={stored}
                    />
                    <div>
                      <ReasonDialog
                        trigger={data.status === "active" ? "Deactivate" : "Reactivate"}
                        triggerVariant={
                          data.status === "active" ? "destructive" : "outline"
                        }
                        title={`${data.status === "active" ? "Deactivate" : "Reactivate"} ${data.name}?`}
                        description={
                          data.status === "active"
                            ? "They're logged out at once and can't log in. Their activity stays in the log."
                            : "They can log in again with the access they had."
                        }
                        confirmLabel={
                          data.status === "active" ? "Deactivate" : "Reactivate"
                        }
                        destructive={data.status === "active"}
                        noteRequired={data.status === "active"}
                        onConfirm={async (reason, note) => {
                          stored(
                            await api.patch<AdminAccountDetail>(
                              `/admin/admins/${data.id}`,
                              {
                                status:
                                  data.status === "active" ? "deactivated" : "active",
                                reason,
                                note,
                              }
                            )
                          )
                          toast.success(
                            data.status === "active"
                              ? "Admin deactivated"
                              : "Admin reactivated"
                          )
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Text className="text-sm">
                        Two-step login for {data.name}: {data.twoStep ? "on" : "off"}
                      </Text>
                      <ReasonDialog
                        trigger={data.twoStep ? "Turn off two-step" : "Turn on two-step"}
                        triggerVariant="outline"
                        title={`Two-step login for ${data.name}`}
                        description={
                          data.twoStep
                            ? "They log in with a password or a code alone again (unless it's required for everyone)."
                            : "From their next login: password, then a code we email them."
                        }
                        confirmLabel={data.twoStep ? "Turn off" : "Turn on"}
                        onConfirm={async (reason) => {
                          stored(
                            await api.patch<AdminAccountDetail>(
                              `/admin/admins/${data.id}`,
                              { twoStep: !data.twoStep, reason }
                            )
                          )
                          toast.success("Saved")
                        }}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Heading as="h2" size="h3">
                  Logged in now
                </Heading>
              </CardHeader>
              <CardContent>
                {data.sessions.length === 0 ? (
                  <Text variant="muted">Not logged in anywhere.</Text>
                ) : (
                  <ul aria-label="Sessions" className="flex flex-col gap-3 text-sm">
                    {data.sessions.map((session) => (
                      <li key={session.id} className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">
                            {session.device ?? "Unknown device"}
                          </span>
                          {session.ip && ` · ${session.ip}`}
                          <br />
                          <span className="text-muted-foreground text-xs">
                            Since {formatDateTime(session.startedAt)} (
                            {session.method === "password" ? "password" : "one-time code"}
                            ) · last seen {formatDateTime(session.lastSeenAt)} ·{" "}
                            <Link to={`?sessionId=${session.id}`} className="underline">
                              This session&apos;s activity
                            </Link>
                          </span>
                        </span>
                        {!data.isSuperAdmin && (
                          <ReasonDialog
                            trigger="End session"
                            title={`End this session of ${data.name}?`}
                            description="They're logged out of this device at once."
                            confirmLabel="End session"
                            destructive
                            onConfirm={async (reason) => {
                              stored(
                                await api.post<AdminAccountDetail>(
                                  `/admin/admins/${data.id}/sessions/${session.id}/end`,
                                  { reason }
                                )
                              )
                              toast.success("Session ended")
                            }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <section aria-labelledby="admin-activity" className="flex flex-col gap-3">
            <Heading as="h2" size="h3" id="admin-activity">
              Activity
            </Heading>
            <ActivityLog adminId={data.id} />
          </section>

          <AuditHistory entries={data.history} />
        </>
      )}
    </PageContainer>
  )
}

function AuditLog() {
  usePageTitle("Audit log")
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const from = params.get("from") ?? ""
  const to = params.get("to") ?? ""
  const page = Number(params.get("page")) || 1
  const setDate = (key: "from" | "to", value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete("page")
      return next
    })
  const { data, isPending, error } = useQuery({
    queryKey: adminKeys.audit(q, page, from, to),
    queryFn: ({ signal }) =>
      api.get<Page<AuditEntry>>(
        `/admin/audit?${new URLSearchParams({ q, page: String(page), from, to })}`,
        {
          signal,
        }
      ),
  })
  return (
    <PageContainer maxWidth="4xl">
      <Link
        to=".."
        relative="path"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Admin accounts
      </Link>
      <div className="flex flex-col gap-1">
        <Heading>Audit log</Heading>
        <Text variant="muted">
          Every admin action with its reason, newest first. For logins and everything
          opened, see the{" "}
          <Link to="/activity" className="underline">
            activity log
          </Link>
          .
        </Text>
      </div>
      <SearchBox
        label="Search the audit log"
        placeholder="Admin, record, action or reason"
      />
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-from">From</Label>
          <Input
            id="audit-from"
            type="date"
            value={from}
            onChange={(e) => setDate("from", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="audit-to">To</Label>
          <Input
            id="audit-to"
            type="date"
            value={to}
            onChange={(e) => setDate("to", e.target.value)}
          />
        </div>
      </div>
      {error ? (
        <Text role="alert" className="text-destructive">
          {getErrorMessage(error, "Couldn't load the audit log.")}
        </Text>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Text variant="muted">No actions match.</Text>
      ) : (
        <>
          <ol
            className="flex flex-col divide-y rounded-xl border text-sm"
            aria-label="Audit log"
          >
            {data.items.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 p-3">
                <span>
                  <span className="font-medium">{entry.admin.name}</span> ·{" "}
                  {entry.summary}{" "}
                  <span className="text-muted-foreground">
                    ({entry.target.kind} {entry.target.label})
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(entry.at)}
                  {entry.reason && ` · “${entry.reason}”`}
                </span>
                <ChangeList changes={entry.changes} />
              </li>
            ))}
          </ol>
          <Pager page={data} />
        </>
      )}
    </PageContainer>
  )
}

/** Admin accounts: sub-admins, their access and activity, and the audit log. */
export default function AdminsPage() {
  return (
    <Routes>
      <Route index element={<AdminList />} />
      <Route path="audit" element={<AuditLog />} />
      <Route path=":id" element={<AdminDetail />} />
    </Routes>
  )
}
