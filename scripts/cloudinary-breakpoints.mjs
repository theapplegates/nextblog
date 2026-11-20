// Upload a local image to Cloudinary, generate responsive breakpoints,
// update src/data/cloudinary-breakpoints.json, and print a Next.js MDX snippet.
//
// Examples:
//   pnpm cloudinary:breakpoints src/assets/images/photo.jpg
//   pnpm cloudinary:breakpoints public/thumbnails/photo.jpg --sizes="100vw"
//   pnpm cloudinary:breakpoints src/assets/images/photo.jpg --overwrite

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, parse, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'src', 'data')
const JSON_PATH = join(DATA_DIR, 'cloudinary-breakpoints.json')
const PUBLIC_DIR = join(ROOT, 'public')
const ASSETS_DIR = join(ROOT, 'src', 'assets', 'images')

const DEFAULT_SIZES =
  '(max-width: 768px) calc(100vw - 3rem), (max-width: 1280px) 720px, 814px'

// Existing shell variables take priority. .env.local takes priority over .env.
dotenv.config({ path: join(ROOT, '.env.local'), quiet: true })
dotenv.config({ path: join(ROOT, '.env'), quiet: true })

const cloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
  process.env.CLOUDINARY_CLOUD_NAME ??
  process.env.PUBLIC_CLOUDINARY_CLOUD_NAME

cloudinary.config({
  cloud_name: cloudName,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const RESPONSIVE_BREAKPOINTS = [
  {
    create_derived: true,
    bytes_step: 200,
    min_width: 200,
    max_width: 1920,
    max_images: 20,
  },
]

function printHelp() {
  console.log(`
Usage:
  pnpm cloudinary:breakpoints <image> [--sizes="..."] [--overwrite]

Examples:
  pnpm cloudinary:breakpoints src/assets/images/photo.jpg
  pnpm cloudinary:breakpoints public/thumbnails/photo.jpg --sizes="100vw"

Images must be inside public/ or src/assets/images/.

Without --overwrite, an existing Cloudinary public ID is reused.
Use --overwrite only when deliberately replacing that existing image.

No images are processed when this command is run without an image path.
`)
}

function pathToPublicId(filePath) {
  const absolutePath = resolve(ROOT, filePath)

  const fromPublic = relative(PUBLIC_DIR, absolutePath).replace(/\\/g, '/')
  if (!fromPublic.startsWith('..')) {
    const { dir, name } = parse(fromPublic)
    return dir === '' ? name : `${dir}/${name}`
  }

  const fromAssets = relative(ASSETS_DIR, absolutePath).replace(/\\/g, '/')
  if (!fromAssets.startsWith('..')) {
    const { dir, name } = parse(fromAssets)
    return dir === ''
      ? `assets/images/${name}`
      : `assets/images/${dir}/${name}`
  }

  throw new Error(
    `Image must be inside public/ or src/assets/images/. Received: ${filePath}`,
  )
}

function isNotFound(error) {
  return (
    error?.http_code === 404 ||
    error?.statusCode === 404 ||
    error?.error?.http_code === 404
  )
}

function extractEntry(result) {
  const breakpoints = result.responsive_breakpoints?.[0]?.breakpoints

  if (!Array.isArray(breakpoints) || breakpoints.length === 0) {
    throw new Error('Cloudinary returned no responsive breakpoints')
  }

  const widths = [
    ...new Set(
      breakpoints
        .map((breakpoint) => Number(breakpoint.width))
        .filter((width) => Number.isFinite(width) && width > 0),
    ),
  ].sort((a, b) => a - b)

  const width = Number(result.width)
  const height = Number(result.height)

  if (
    widths.length === 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error('Cloudinary returned incomplete image metadata')
  }

  return { width, height, breakpoints: widths }
}

async function ensureEntry(publicId, localPath, overwrite) {
  if (!overwrite) {
    try {
      const existing = await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        responsive_breakpoints: RESPONSIVE_BREAKPOINTS,
      })
      return extractEntry(existing)
    } catch (error) {
      if (!isNotFound(error)) {
        throw error
      }
    }
  }

  const uploaded = await cloudinary.uploader.upload(localPath, {
    public_id: publicId,
    overwrite,
    invalidate: overwrite,
    responsive_breakpoints: RESPONSIVE_BREAKPOINTS,
  })

  return extractEntry(uploaded)
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(JSON_PATH, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {}
    }
    throw error
  }
}

async function writeManifest(manifest) {
  const sorted = Object.fromEntries(
    Object.keys(manifest)
      .sort()
      .map((key) => [key, manifest[key]]),
  )

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(JSON_PATH, `${JSON.stringify(sorted, null, 2)}\n`)
}

function buildSnippet(publicId, entry, sizes) {
  return [
    '<Picture',
    `  src="${publicId}"`,
    '  alt="TODO: describe this image"',
    `  width={${entry.width}}`,
    `  height={${entry.height}}`,
    `  sizes="${sizes}"`,
    '/>',
  ].join('\n')
}

function parseArgs(args) {
  let sizes = DEFAULT_SIZES
  let overwrite = false
  const files = []

  for (const arg of args) {
    if (arg.startsWith('--sizes=')) {
      sizes = arg.slice('--sizes='.length).replace(/^["']|["']$/g, '')
    } else if (arg === '--overwrite') {
      overwrite = true
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    } else {
      files.push(arg)
    }
  }

  if (files.length === 0) {
    throw new Error('Provide at least one image path. Use --help for examples.')
  }

  return { files, sizes, overwrite }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp()
    return
  }

  if (!cloudName) {
    throw new Error('Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local')
  }

  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error(
      'Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET in .env.local',
    )
  }

  const { files, sizes, overwrite } = parseArgs(args)
  const manifest = await loadManifest()
  let completed = 0

  for (const file of files) {
    const publicId = pathToPublicId(file)
    console.log(`\nProcessing ${publicId}...`)

    const entry = await ensureEntry(publicId, resolve(ROOT, file), overwrite)
    manifest[publicId] = entry
    await writeManifest(manifest)
    completed += 1

    console.log(`Breakpoints: ${entry.breakpoints.join(', ')}`)
    console.log('\nPaste this into an MDX post and replace the alt text:\n')
    console.log(buildSnippet(publicId, entry, sizes))
  }

  console.log(`\nSaved ${completed} image(s) to ${JSON_PATH}`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nCloudinary breakpoint generation failed: ${message}`)
  process.exit(1)
})
