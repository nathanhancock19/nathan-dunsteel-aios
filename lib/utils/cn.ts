/**
 * Class-name joiner. Skips falsy values. Avoids pulling in clsx + tailwind-merge
 * for a small utility that only needs to filter falsy.
 */
export function cn(...parts: Array<string | undefined | null | false | 0>): string {
  return parts.filter(Boolean).join(" ")
}
