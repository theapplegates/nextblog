import breakpointManifest from '@/data/cloudinary-breakpoints.json'
import { CloudinaryPicture } from '@/components/cloudinary-picture'
import { cn } from '@/lib/utils'

interface ManifestEntry {
  width?: number
  height?: number
  breakpoints: number[]
}

interface PictureProps {
  /** Exact public-ID key from cloudinary-breakpoints.json */
  src: string
  alt?: string
  width?: number | string
  height?: number | string
  sizes?: string
  className?: string
}

const manifest = breakpointManifest as unknown as Record<
  string,
  ManifestEntry | number[]
>

function positiveNumber(value: number | string | undefined) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

export function Picture({
  src,
  alt = '',
  width,
  height,
  sizes = '(max-width: 768px) calc(100vw - 3rem), (max-width: 1280px) 720px, 814px',
  className,
}: PictureProps) {
  const storedEntry = manifest[src]

  // Supports both the new object format and our original width-array test.
  const entry: ManifestEntry | undefined = Array.isArray(storedEntry)
    ? { breakpoints: storedEntry }
    : storedEntry

  if (
    entry === undefined
    || !Array.isArray(entry.breakpoints)
    || entry.breakpoints.length === 0
  ) {
    throw new Error(
      `No Cloudinary breakpoints found for "${src}". Run the breakpoint script first.`,
    )
  }

  const resolvedWidth = positiveNumber(width) ?? positiveNumber(entry.width)
  const resolvedHeight = positiveNumber(height) ?? positiveNumber(entry.height)

  if (resolvedWidth === undefined || resolvedHeight === undefined) {
    throw new Error(`Missing original image dimensions for "${src}".`)
  }

  return (
    <span
      className="relative mx-auto block w-full"
      style={{
        aspectRatio: `${resolvedWidth} / ${resolvedHeight}`,
        maxWidth: resolvedWidth,
      }}
    >
      <CloudinaryPicture
        publicId={src}
        alt={alt}
        widths={entry.breakpoints}
        sizes={sizes}
        className={cn(
          'absolute inset-0 h-full w-full object-contain',
          className,
        )}
      />
    </span>
  )
}
