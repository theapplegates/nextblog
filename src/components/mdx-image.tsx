import { PostImage } from '@/components/post-image'
import { CloudinaryPicture } from '@/components/cloudinary-picture'
import { cn } from '@/lib/utils'

interface MDXImageProps {
  src?: string
  alt?: string
  title?: string
  className?: string
  width?: number
  height?: number
}

// Temporary, single-image test. All other images keep the existing behavior.
const CLOUDINARY_TEST_IMAGES: Record<string, string> = {
  '/thumbnails/laptop-computer-on-table.jpg':
    'thumbnails/laptop-computer-on-table',
}

export function MDXImage({ src, alt = 'Image', title, className }: MDXImageProps) {
  const cloudinaryId = src ? CLOUDINARY_TEST_IMAGES[src] : undefined

  return (
    <figure className="prose-img:m-0 text-center">
      <span className="relative block h-128 w-full overflow-hidden">
        {cloudinaryId ? (
          <CloudinaryPicture
            publicId={cloudinaryId}
            alt={alt}
            sizes="(max-width: 768px) 100vw, 768px"
            className={cn(
              'absolute inset-0 h-full w-full object-contain',
              className,
            )}
          />
        ) : (
          <PostImage
            src={src}
            alt={alt}
            placeholder="No Image Available"
            unoptimized
            className={cn('object-contain', className)}
          />
        )}
      </span>
      {title !== undefined && title !== '' && (
        <figcaption data-testid="mdx-image-title" className="line-clamp-3">
          {title}
        </figcaption>
      )}
    </figure>
  )
}
