import Image from "next/image"

/**
 * Dunsteel logo. The JPG source is steel-navy on transparent white. In
 * dark mode we drop it on a slightly lighter chip; in light mode it sits
 * naturally on the surface.
 */
export function Logo({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: "sm" | "md" | "lg"
  showWordmark?: boolean
  className?: string
}) {
  const heights = { sm: 28, md: 36, lg: 56 }
  const widths = { sm: 100, md: 130, lg: 200 }
  return (
    <div className={`inline-flex items-center ${className ?? ""}`}>
      <Image
        src="/logo.png"
        alt="Dunsteel"
        width={showWordmark ? widths[size] : heights[size]}
        height={heights[size]}
        priority
        className="dark-logo-tint"
      />
    </div>
  )
}
