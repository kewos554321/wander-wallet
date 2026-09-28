import { Share2, UserMinus, UserPlus, User } from "lucide-react"
import type { MembersProject } from "@/lib/hooks/useProjectMembers"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

const AVATAR_TONES = [
  "bg-v2-lake-tint text-v2-lake",
  "bg-v2-coral-soft text-v2-coral-strong",
  "bg-v2-plum-soft text-v2-plum",
  "bg-v2-rose-soft text-v2-rose",
  "bg-v2-gold-soft text-v2-gold",
]

export interface MembersV2ViewProps {
  project: MembersProject
  currentUserId: string | null
  isOwner: boolean
  removing: string | null
  batchMode: boolean
  selected: Set<string>
  onInvite: () => void
  onAdd: () => void
  onRemove: (memberId: string) => void
  onToggleBatch: () => void
  onToggleSelect: (memberId: string) => void
  onRequestBatchRemove: () => void
}

const squareButton =
  "flex h-8 w-8 items-center justify-center rounded-[9px] border border-v2-line bg-v2-surface text-v2-lake"
const badge = "rounded-full px-[7px] py-0.5 text-xs font-bold"

export function MembersV2View(props: MembersV2ViewProps) {
  const { project } = props

  return (
    <>
      <V2TopBar title="成員" backHref={`/projects/${project.id}`} />
      <div className="mx-4 mb-2.5 mt-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-v2-ink-muted">{project.members.length} 位旅伴</span>
          {props.isOwner && (
            <button type="button" onClick={props.onToggleBatch} className="text-xs font-bold text-v2-link">
              {props.batchMode ? "取消" : "批次"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="邀請成員" title="邀請成員" onClick={props.onInvite} className={squareButton}>
            <Share2 className="h-[15px] w-[15px]" strokeWidth={1.7} />
          </button>
          <button type="button" aria-label="手動新增成員" title="手動新增" onClick={props.onAdd} className={squareButton}>
            <UserPlus className="h-[15px] w-[15px]" strokeWidth={1.7} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-28">
        <div className="overflow-hidden rounded-2xl border border-v2-line bg-v2-surface">
          {project.members.map((member, i) => {
            const isMe = member.user?.id === props.currentUserId
            const isCreator = member.role === "owner"
            const isPlaceholder = !member.userId
            const canManage = props.isOwner && !isMe
            return (
              <div
                key={member.id}
                data-testid={`member-${member.id}`}
                className={`flex items-center gap-3 p-3.5 ${i < project.members.length - 1 ? "border-b border-v2-line-soft" : ""}`}
              >
                {props.batchMode && canManage && (
                  <input
                    type="checkbox"
                    checked={props.selected.has(member.id)}
                    onChange={() => props.onToggleSelect(member.id)}
                    aria-label={`選取${member.displayName}`}
                    className="h-4 w-4 shrink-0 accent-v2-lake"
                  />
                )}
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isPlaceholder ? "bg-v2-sand text-v2-ink-subtle" : AVATAR_TONES[i % AVATAR_TONES.length]
                  }`}
                  aria-hidden="true"
                >
                  {isPlaceholder ? <User className="h-[19px] w-[19px]" strokeWidth={1.7} /> : member.displayName.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-bold">{member.displayName}</span>
                    {isCreator && <span className={`${badge} bg-v2-lake-soft text-v2-lake`}>建立者</span>}
                    {isMe && <span className={`${badge} border border-v2-lake-border bg-v2-paper py-px text-v2-lake`}>你</span>}
                    {isPlaceholder && <span className={`${badge} bg-v2-sand text-v2-ink-muted`}>佔位成員</span>}
                  </span>
                  <span className={`mt-0.5 block text-xs ${isPlaceholder ? "text-v2-ink-subtle" : "text-v2-ink-muted"}`}>
                    {isPlaceholder ? "尚未加入" : member.user?.email}
                  </span>
                </span>
                {!props.batchMode && canManage && (
                  <button
                    type="button"
                    aria-label={`移除${member.displayName}`}
                    disabled={props.removing === member.id}
                    onClick={() => props.onRemove(member.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-v2-danger disabled:opacity-40"
                  >
                    <UserMinus className="h-4 w-4" strokeWidth={1.7} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {props.batchMode && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-v2-line bg-v2-surface px-4 py-3">
          <button
            type="button"
            disabled={props.selected.size === 0 || props.removing === "batch"}
            onClick={props.onRequestBatchRemove}
            className="mx-auto block w-full max-w-md rounded-full bg-v2-danger py-3 text-[15px] font-bold text-v2-on-lake disabled:opacity-40"
          >
            移除 {props.selected.size} 位
          </button>
        </div>
      )}
    </>
  )
}
