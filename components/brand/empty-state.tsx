import { cn } from "@/lib/utils"
import Image from "next/image"
import { ReactNode } from "react"

type EmptyStateVariant = "no-projects" | "no-expenses" | "no-photos" | "no-activity"

interface EmptyStateProps {
  variant: EmptyStateVariant
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

const illustrationMap: Record<EmptyStateVariant, string> = {
  "no-projects": "/illustrations/empty-projects.svg",
  "no-expenses": "/illustrations/empty-expenses.svg",
  "no-photos": "/illustrations/empty-photos.svg",
  "no-activity": "/illustrations/empty-activity.svg",
}

export function EmptyState({
  variant,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "py-12 text-center animate-fade-in",
        className
      )}
    >
      {/* Illustration */}
      <div className="w-48 h-36 mx-auto mb-6 text-muted-foreground">
        <Image
          src={illustrationMap[variant]}
          alt={title}
          width={192}
          height={144}
          className="w-full h-full object-contain"
          priority={false}
        />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
