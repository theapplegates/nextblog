'use client'

import * as React from 'react'

type AiProvider = 'chatgpt' | 'claude' | 'perplexity' | 'gemini'

function resolveUrl(url: string | null): string {
  if (!url) return ''
  try {
	return new URL(url, window.location.href).href
  } catch {
	return url
  }
}

function convertTable(tableEl: Element): string {
  const rows = Array.from(tableEl.querySelectorAll('tr'))
  if (!rows.length) return ''

  const matrix = rows.map((tr) =>
	Array.from(tr.querySelectorAll('th, td')).map((cell) =>
	  nodeToMarkdown(cell).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim()
	)
  )

  const colCount = Math.max(...matrix.map((r) => r.length))
  const normalized = matrix.map((r) => {
	while (r.length < colCount) r.push('')
	return `| ${r.join(' | ')} |`
  })

  const separator = `| ${Array(colCount).fill('---').join(' | ')} |`
  normalized.splice(1, 0, separator)
  return `\n\n${normalized.join('\n')}\n\n`
}

function nodeToMarkdown(node: Node, depth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
	return (node.textContent || '').replace(/\s+/g, ' ')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()

  if (['script', 'style', 'noscript', 'template'].includes(tag)) return ''
  if (el.hasAttribute('data-copy-ignore')) return ''

  if (tag === 'br') return '\n'
  if (tag === 'hr') return '\n\n---\n\n'

  if (tag === 'pre') {
	const codeEl = el.querySelector('code')
	const raw = (codeEl || el).textContent?.replace(/\n$/, '') || ''
	const langMatch = (codeEl?.className || el.className || '').match(/language-([a-zA-Z0-9_-]+)/)
	const lang = langMatch ? langMatch[1] : ''
	return `\n\n\`\`\`${lang}\n${raw}\n\`\`\`\n\n`
  }

  if (tag === 'code') {
	return `\`${(el.textContent || '').trim()}\``
  }

  if (tag === 'img') {
	const alt = (el.getAttribute('alt') || '').trim()
	const src = resolveUrl(el.getAttribute('src'))
	return src ? `![${alt}](${src})` : ''
  }

  if (tag === 'table') {
	return convertTable(el)
  }

  const inner = () =>
	Array.from(el.childNodes)
	  .map((child) => nodeToMarkdown(child, depth))
	  .join('')

  if (/^h[1-6]$/.test(tag)) {
	const level = Number(tag[1])
	const text = inner().trim()
	return text ? `\n\n${'#'.repeat(level)} ${text}\n\n` : ''
  }

  if (tag === 'p') {
	const text = inner().trim()
	return text ? `\n\n${text}\n\n` : ''
  }

  if (tag === 'strong' || tag === 'b') {
	const text = inner().trim()
	return text ? `**${text}**` : ''
  }

  if (tag === 'em' || tag === 'i') {
	const text = inner().trim()
	return text ? `*${text}*` : ''
  }

  if (tag === 'a') {
	const text = inner().trim()
	const href = resolveUrl(el.getAttribute('href'))
	if (!href || href.startsWith('javascript:')) return text
	return text ? `[${text}](${href})` : href
  }

  if (tag === 'blockquote') {
	const text = inner().trim()
	if (!text) return ''
	const quoted = text
	  .split('\n')
	  .map((line) => `> ${line}`)
	  .join('\n')
	return `\n\n${quoted}\n\n`
  }

  if (tag === 'ul' || tag === 'ol') {
	const items = Array.from(el.children).filter((child) => child.tagName.toLowerCase() === 'li')
	const lines = items.map((li, idx) => {
	  const prefix = tag === 'ol' ? `${idx + 1}. ` : '- '
	  const indent = '  '.repeat(depth)
	  const content = Array.from(li.childNodes)
		.map((child) => nodeToMarkdown(child, depth + 1))
		.join('')
		.trim()
		.replace(/\n{2,}/g, '\n' + indent + '  ')
	  return `${indent}${prefix}${content}`
	})
	return `\n\n${lines.join('\n')}\n\n`
  }

  return inner()
}

function getPageMarkdown(): string {
  const sourceEl =
	document.querySelector('[data-copy-content]') ||
	document.querySelector('article') ||
	document.querySelector('main') ||
	document.body

  const clone = sourceEl.cloneNode(true) as HTMLElement
  clone.querySelectorAll('nav, footer, [data-copy-ignore]').forEach((el) => el.remove())

  let markdown = nodeToMarkdown(clone)
	.replace(/[ \t]+\n/g, '\n')
	.replace(/\n{3,}/g, '\n\n')
	.trim()

  const pageTitle = document.title?.trim()
  if (pageTitle && !markdown.startsWith('# ')) {
	markdown = `# ${pageTitle}\n\nSource: ${window.location.href}\n\n${markdown}`
  }

  return markdown
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
	await navigator.clipboard.writeText(text)
	return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function buildAiUrl(provider: AiProvider): string {
  const pageUrl = window.location.href
  const encoded = encodeURIComponent(`Read from ${pageUrl} so I can ask questions about it.`)

  switch (provider) {
	case 'chatgpt':
	  return `https://chatgpt.com/?hints=search&q=${encoded}`
	case 'claude':
	  return `https://claude.ai/new?q=${encoded}`
	case 'perplexity':
	  return `https://www.perplexity.ai/search/new?q=${encoded}`
	case 'gemini':
	  return `https://gemini.google.com/app?q=${encoded}`
  }
}

export function CopyPageButton() {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
	const handleOutsideClick = (e: MouseEvent) => {
	  if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
		setOpen(false)
	  }
	}
	const handleEscape = (e: KeyboardEvent) => {
	  if (e.key === 'Escape') setOpen(false)
	}
	document.addEventListener('mousedown', handleOutsideClick)
	document.addEventListener('keydown', handleEscape)
	return () => {
	  document.removeEventListener('mousedown', handleOutsideClick)
	  document.removeEventListener('keydown', handleEscape)
	}
  }, [])

  const handleCopy = async () => {
	try {
	  await copyToClipboard(getPageMarkdown())
	  setCopied(true)
	  setOpen(false)
	  setTimeout(() => setCopied(false), 2000)
	} catch (err) {
	  console.error('Failed to copy page as Markdown:', err)
	}
  }

  const handleViewAsMarkdown = () => {
	setOpen(false)
	const blob = new Blob([getPageMarkdown()], { type: 'text/plain;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleOpenAi = (provider: AiProvider) => {
	setOpen(false)
	window.open(buildAiUrl(provider), '_blank', 'noopener,noreferrer')
  }

  return (
	<div ref={wrapperRef} data-copy-ignore="true" className="relative z-40 inline-flex items-center text-sm">
	  <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
		<button
		  type="button"
		  onClick={handleCopy}
		  aria-label="Copy page as Markdown"
		  className={`inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
			copied ? 'text-green-600 dark:text-green-400' : 'text-zinc-900 dark:text-zinc-100'
		  }`}
		>
		  {copied ? (
			<svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
			  <polyline points="20 6 9 17 4 12" />
			</svg>
		  ) : (
			<svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			  <rect x="9" y="9" width="13" height="13" rx="2" />
			  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
			</svg>
		  )}
		  <span>{copied ? 'Copied!' : 'Copy page'}</span>
		</button>

		<button
		  type="button"
		  onClick={() => setOpen((prev) => !prev)}
		  aria-haspopup="menu"
		  aria-expanded={open}
		  aria-label="More page actions"
		  className="inline-flex cursor-pointer items-center border-l border-zinc-200 px-2 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
		>
		  <svg
			className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		  >
			<polyline points="6 9 12 15 18 9" />
		  </svg>
		</button>
	  </div>

	  {open && (
		<div
		  role="menu"
		  className="absolute top-full right-0 mt-1.5 flex min-w-60 flex-col gap-0.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
		>
		  <button
			type="button"
			role="menuitem"
			onClick={handleCopy}
			className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
		  >
			<svg className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			  <rect x="9" y="9" width="13" height="13" rx="2" />
			  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
			</svg>
			<div className="flex flex-col">
			  <span className="font-medium text-zinc-900 dark:text-zinc-100">Copy page</span>
			  <span className="text-xs text-zinc-500 dark:text-zinc-400">Markdown</span>
			</div>
		  </button>

		  <button
			type="button"
			role="menuitem"
			onClick={handleViewAsMarkdown}
			className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
		  >
			<svg className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			  <polyline points="14 2 14 8 20 8" />
			  <line x1="16" y1="13" x2="8" y2="13" />
			  <line x1="16" y1="17" x2="8" y2="17" />
			</svg>
			<div className="flex flex-1 flex-col">
			  <span className="font-medium text-zinc-900 dark:text-zinc-100">View as Markdown</span>
			  <span className="text-xs text-zinc-500 dark:text-zinc-400">View this page as plain text</span>
			</div>
			<ExternalArrow />
		  </button>

		  <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />

		  {(
			[
			  ['chatgpt', 'Open in ChatGPT'],
			  ['claude', 'Open in Claude'],
			  ['perplexity', 'Open in Perplexity'],
			  ['gemini', 'Open in Gemini'],
			] as const
		  ).map(([id, label]) => (
			<button
			  key={id}
			  type="button"
			  role="menuitem"
			  onClick={() => handleOpenAi(id)}
			  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
			>
			  <svg className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.6-6.4-2.1 2.1m-6.6 6.6-2.1 2.1m0-10.8 2.1 2.1m6.6 6.6 2.1 2.1" />
			  </svg>
			  <span className="flex-1 font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
			  <ExternalArrow />
			</button>
		  ))}
		</div>
	  )}
	</div>
  )
}

function ExternalArrow() {
  return (
	<svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
	  <path d="M7 17 17 7" />
	  <path d="M7 7h10v10" />
	</svg>
  )
}