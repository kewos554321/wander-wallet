import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "full" | "simple" | "icon"
  className?: string
}

const sizeMap = {
  sm: { icon: "h-6 w-6", container: "h-8 w-8", text: "text-sm" },
  md: { icon: "h-8 w-8", container: "h-12 w-12", text: "text-base" },
  lg: { icon: "h-10 w-10", container: "h-16 w-16", text: "text-lg" },
  xl: { icon: "h-12 w-12", container: "h-20 w-20", text: "text-xl" },
}

function LogoIconFull({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-current", className)}
    >
      {/* Wallet outline */}
      <rect
        x="6"
        y="14"
        width="36"
        height="24"
        rx="5"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Wallet fold line */}
      <path
        d="M6 22 H42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Card slot */}
      <rect
        x="28"
        y="28"
        width="10"
        height="5"
        rx="1.5"
        fill="currentColor"
        opacity="0.3"
      />
      {/* Compass element */}
      <circle
        cx="14"
        cy="12"
        r="5"
        stroke="currentColor"
        strokeWidth="2"
        className="fill-brand-50"
      />
      {/* Compass markers */}
      <path
        d="M14 8.5 L14 10 M14 14 L14 15.5 M10.5 12 L12 12 M16 12 L17.5 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Compass center */}
      <circle cx="14" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function LogoIconSimple({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-current", className)}
    >
      {/* Simplified wallet */}
      <rect
        x="4"
        y="8"
        width="24"
        height="18"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path d="M4 14 H28" stroke="currentColor" strokeWidth="2" />
      {/* Compass dot */}
      <circle cx="22" cy="19" r="3" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

export function Logo({ size = "md", variant = "full", className }: LogoProps) {
  const sizes = sizeMap[size]

  if (variant === "icon") {
    return (
      <div className={cn("text-primary", className)}>
        <LogoIconSimple className={sizes.icon} />
      </div>
    )
  }

  if (variant === "simple") {
    return (
      <div
        className={cn(
          "rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25",
          sizes.container,
          className
        )}
      >
        <LogoIconSimple className={sizes.icon} />
      </div>
    )
  }

  // Full variant with text
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25",
          sizes.container
        )}
      >
        <LogoIconFull className={sizes.icon} />
      </div>
      <div>
        <h1 className={cn("font-bold text-foreground", sizes.text)}>
          Wander Wallet
        </h1>
        <p className="text-xs text-muted-foreground">旅行分帳好幫手</p>
      </div>
    </div>
  )
}
