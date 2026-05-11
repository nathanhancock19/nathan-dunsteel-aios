import Image from "next/image"
import { cn } from "@/lib/utils/cn"

/**
 * Dunsteel mark.
 *
 * Always renders the same: navy mark on a white rounded chip. Identical in
 * both themes; no filter trickery. The chip gives it a clean, polished
 * presentation regardless of surrounding surface colour.
 */
export function Logo({
  size = "md",
  showName = true,
  className,
}: {
  size?: "sm" | "md" | "lg"
  showName?: boolean
  className?: string
}) {
  const dims = { sm: 28, md: 32, lg: 44 }
  const dim = dims[size]
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        className="flex items-center justify-center overflow-hidden rounded-lg bg-white"
        style={{ width: dim, height: dim, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <Image
          src="/logo-mark.png"
          alt="Dunsteel"
          width={dim - 4}
          height={dim - 4}
          priority
          className="object-contain"
        />
      </div>
      {showName ? (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-fg">Dunsteel</p>
          <p className="text-[10px] uppercase tracking-wider text-fg-subtle">AIOS</p>
        </div>
      ) : null}
    </div>
  )
}
