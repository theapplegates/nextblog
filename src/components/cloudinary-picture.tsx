const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600]

type Format = 'jxl' | 'avif' | 'webp' | 'auto'

interface CloudinaryPictureProps {
  publicId: string
  alt: string
  widths?: number[]
  sizes?: string
  loading?: 'lazy' | 'eager'
  className?: string
  onLoad?: () => void
  onError?: () => void
}

export function CloudinaryPicture({
  publicId,
  alt,
  widths,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  loading = 'lazy',
  className,
  onLoad,
  onError,
}: CloudinaryPictureProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!cloudName) {
    throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is missing')
  }

  const responsiveWidths = [
    ...(widths !== undefined && widths.length > 0 ? widths : DEFAULT_WIDTHS),
  ].sort((a, b) => a - b)

  const encodedPublicId = publicId
    .split('/')
    .map(encodeURIComponent)
    .join('/')

  const makeUrl = (format: Format, width: number) =>
    `https://res.cloudinary.com/${cloudName}/image/upload/` +
    `c_limit,w_${width},q_auto,f_${format}/${encodedPublicId}`

  const makeSrcSet = (format: Exclude<Format, 'auto'>) =>
    responsiveWidths
      .map((width) => `${makeUrl(format, width)} ${width}w`)
      .join(', ')

  const fallbackWidth = responsiveWidths[responsiveWidths.length - 1]

  return (
    <picture>
      <source
        type="image/jxl"
        srcSet={makeSrcSet('jxl')}
        sizes={sizes}
      />
      <source
        type="image/avif"
        srcSet={makeSrcSet('avif')}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={makeSrcSet('webp')}
        sizes={sizes}
      />

      <img
        src={makeUrl('auto', fallbackWidth)}
        alt={alt}
        sizes={sizes}
        loading={loading}
        decoding="async"
        className={className}
        onLoad={onLoad}
        onError={onError}
      />
    </picture>
  )
}
