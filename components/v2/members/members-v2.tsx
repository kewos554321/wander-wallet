"use client"

import { useState, type ReactNode } from "react"
import { AddMemberDialog } from "@/components/members/add-member-dialog"
import { InviteDialog } from "@/components/project/invite-dialog"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { useProjectMembers } from "@/lib/hooks/useProjectMembers"
import { MembersV2View } from "./members-v2-view"

export function MembersV2({ projectId }: { projectId: string }) {
  const m = useProjectMembers(projectId)
  const [showInvite, setShowInvite] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  async function removeOne(memberId: string) {
    if (!confirm("確定要移除這位成員嗎？")) return
    await m.removeMember(memberId)
  }

  let content: ReactNode
  if (m.loading) {
    content = (
      <>
        <V2TopBar title="成員" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />
        <div data-testid="v2-members-skeleton" className="space-y-3 p-4">
          <div className="h-64 animate-pulse rounded-2xl bg-v2-sand" />
        </div>
      </>
    )
  } else if (!m.project) {
    content = (
      <>
        <V2TopBar title="成員" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />
        <p className="py-8 text-center text-v2-ink-muted">專案不存在</p>
      </>
    )
  } else {
    content = (
      <>
        <MembersV2View
          project={m.project}
          currentUserId={m.currentUserId}
          isOwner={m.isOwner}
          removing={m.removing}
          onInvite={() => setShowInvite(true)}
          onAdd={() => setShowAdd(true)}
          onRemove={removeOne}
        />
        <InviteDialog open={showInvite} onOpenChange={setShowInvite} projectId={m.project.id} projectName={m.project.name} />
        <AddMemberDialog open={showAdd} onOpenChange={setShowAdd} onAdd={m.addMember} />
      </>
    )
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">{content}</div>
    </UiV2Scope>
  )
}
