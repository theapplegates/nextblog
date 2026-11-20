(() => {
  const ICONS = {
	copy: `<svg class="cpb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
	check: `<svg class="cpb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
	chevron: `<svg class="cpb-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
	fileText: `<svg class="cpb-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
	spark: `<svg class="cpb-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.6-6.4-2.1 2.1m-6.6 6.6-2.1 2.1m0-10.8 2.1 2.1m6.6 6.6 2.1 2.1"/></svg>`,
	external: `<svg class="cpb-external-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>`
  };

  function resolveUrl(url, attr) {
	if (!url) return "";
	try {
	  return new URL(url, window.location.href).href;
	} catch {
	  return url;
	}
  }

  function convertTable(tableEl) {
	const rows = Array.from(tableEl.querySelectorAll("tr"));
	if (!rows.length) return "";

	const matrix = rows.map((tr) =>
	  Array.from(tr.querySelectorAll("th, td")).map((cell) =>
		nodeToMarkdown(cell).replace(/\n+/g, " ").replace(/\|/g, "\\|").trim()
	  )
	);

	const colCount = Math.max(...matrix.map((r) => r.length));
	const normalized = matrix.map((r) => {
	  while (r.length < colCount) r.push("");
	  return `| ${r.join(" | ")} |`;
	});

	const separator = `| ${Array(colCount).fill("---").join(" | ")} |`;
	normalized.splice(1, 0, separator);
	return `\n\n${normalized.join("\n")}\n\n`;
  }

  function nodeToMarkdown(node, depth = 0) {
	if (node.nodeType === Node.TEXT_NODE) {
	  return node.textContent.replace(/\s+/g, " ");
	}
	if (node.nodeType !== Node.ELEMENT_NODE) return "";

	const tag = node.tagName.toLowerCase();
	if (["script", "style", "noscript", "template"].includes(tag)) return "";
	if (node.hasAttribute("data-copy-ignore") || node.classList.contains("cpb-wrapper")) {
	  return "";
	}

	if (tag === "br") return "\n";
	if (tag === "hr") return "\n\n---\n\n";

	if (tag === "pre") {
	  const codeEl = node.querySelector("code");
	  const raw = (codeEl || node).textContent.replace(/\n$/, "");
	  const langMatch = (codeEl?.className || node.className || "").match(/language-([a-zA-Z0-9_-]+)/);
	  const lang = langMatch ? langMatch[1] : "";
	  return `\n\n\`\`\`${lang}\n${raw}\n\`\`\`\n\n`;
	}

	if (tag === "code") {
	  return `\`${node.textContent.trim()}\``;
	}

	if (tag === "img") {
	  const alt = (node.getAttribute("alt") || "").trim();
	  const src = resolveUrl(node.getAttribute("src"));
	  return src ? `![${alt}](${src})` : "";
	}

	if (tag === "table") {
	  return convertTable(node);
	}

	const inner = () =>
	  Array.from(node.childNodes)
		.map((child) => nodeToMarkdown(child, depth))
		.join("");

	if (/^h[1-6]$/.test(tag)) {
	  const level = Number(tag[1]);
	  const text = inner().trim();
	  return text ? `\n\n${"#".repeat(level)} ${text}\n\n` : "";
	}

	if (tag === "p") {
	  const text = inner().trim();
	  return text ? `\n\n${text}\n\n` : "";
	}

	if (tag === "strong" || tag === "b") {
	  const text = inner().trim();
	  return text ? `**${text}**` : "";
	}

	if (tag === "em" || tag === "i") {
	  const text = inner().trim();
	  return text ? `*${text}*` : "";
	}

	if (tag === "a") {
	  const text = inner().trim();
	  const href = resolveUrl(node.getAttribute("href"));
	  if (!href || href.startsWith("javascript:")) return text;
	  return text ? `[${text}](${href})` : href;
	}

	if (tag === "blockquote") {
	  const text = inner().trim();
	  if (!text) return "";
	  const quoted = text
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
	  return `\n\n${quoted}\n\n`;
	}

	if (tag === "ul" || tag === "ol") {
	  const items = Array.from(node.children).filter((el) => el.tagName.toLowerCase() === "li");
	  const lines = items.map((li, idx) => {
		const prefix = tag === "ol" ? `${idx + 1}. ` : "- ";
		const indent = "  ".repeat(depth);
		const content = Array.from(li.childNodes)
		  .map((child) => nodeToMarkdown(child, depth + 1))
		  .join("")
		  .trim()
		  .replace(/\n{2,}/g, "\n" + indent + "  ");
		return `${indent}${prefix}${content}`;
	  });
	  return `\n\n${lines.join("\n")}\n\n`;
	}

	return inner();
  }

  function findContentRoot() {
	const selectors = [
	  "[data-copy-content]",
	  "article",
	  ".post-content",
	  ".entry-content",
	  ".markdown-body",
	  "main",
	  ".content"
	];
	for (const sel of selectors) {
	  const el = document.querySelector(sel);
	  if (el) return el;
	}
	return document.body;
  }

  function getPageMarkdown() {
	const root = findContentRoot().cloneNode(true);
	root.querySelectorAll("nav, footer, .cpb-wrapper, [data-copy-ignore]").forEach((el) => el.remove());

	let markdown = nodeToMarkdown(root)
	  .replace(/[ \t]+\n/g, "\n")
	  .replace(/\n{3,}/g, "\n\n")
	  .trim();

	const pageTitle = document.title?.trim();
	if (pageTitle && !markdown.startsWith("# ")) {
	  markdown = `# ${pageTitle}\n\nSource: ${window.location.href}\n\n${markdown}`;
	}

	return markdown;
  }

  async function copyToClipboard(text) {
	if (navigator.clipboard && window.isSecureContext) {
	  await navigator.clipboard.writeText(text);
	  return;
	}
	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand("copy");
	document.body.removeChild(textarea);
  }

  function openAsPlainTextMarkdown() {
	const markdown = getPageMarkdown();
	const blob = new Blob([markdown], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	window.open(url, "_blank", "noopener,noreferrer");
  }

  function buildAiUrl(provider) {
	const pageUrl = window.location.href;
	const prompt = `Read from ${pageUrl} so I can ask questions about it.`;
	const encoded = encodeURIComponent(prompt);

	switch (provider) {
	  case "chatgpt":
		return `https://chatgpt.com/?hints=search&q=${encoded}`;
	  case "claude":
		return `https://claude.ai/new?q=${encoded}`;
	  case "perplexity":
		return `https://www.perplexity.ai/search/new?q=${encoded}`;
	  case "gemini":
		return `https://gemini.google.com/app?q=${encoded}`;
	  default:
		return pageUrl;
	}
  }

  function createWidget() {
	const wrapper = document.createElement("div");
	wrapper.className = "cpb-wrapper";
	wrapper.setAttribute("data-open", "false");
	wrapper.setAttribute("data-copy-ignore", "true");

	wrapper.innerHTML = `
	  <div class="cpb-split">
		<button type="button" class="cpb-btn cpb-primary" aria-label="Copy page as Markdown">
		  <span class="cpb-primary-icon">${ICONS.copy}</span>
		  <span class="cpb-primary-label">Copy page</span>
		</button>
		<button type="button" class="cpb-btn cpb-toggle" aria-haspopup="menu" aria-expanded="false" aria-label="More page actions">
		  ${ICONS.chevron}
		</button>
	  </div>
	  <div class="cpb-menu" role="menu">
		<button type="button" class="cpb-item" role="menuitem" data-action="copy">
		  ${ICONS.copy.replace('class="cpb-icon"', 'class="cpb-item-icon"')}
		  <div class="cpb-item-content">
			<span class="cpb-item-title">Copy page</span>
			<span class="cpb-item-subtitle">Markdown</span>
		  </div>
		</button>
		<button type="button" class="cpb-item" role="menuitem" data-action="view-markdown">
		  ${ICONS.fileText}
		  <div class="cpb-item-content">
			<span class="cpb-item-title">View as Markdown</span>
			<span class="cpb-item-subtitle">View this page as plain text</span>
		  </div>
		  ${ICONS.external}
		</button>
		<div class="cpb-divider" role="separator"></div>
		<a class="cpb-item" role="menuitem" target="_blank" rel="noopener noreferrer" data-ai="chatgpt">
		  ${ICONS.spark}
		  <div class="cpb-item-content">
			<span class="cpb-item-title">Open in ChatGPT</span>
		  </div>
		  ${ICONS.external}
		</a>
		<a class="cpb-item" role="menuitem" target="_blank" rel="noopener noreferrer" data-ai="claude">
		  ${ICONS.spark}
		  <div class="cpb-item-content">
			<span class="cpb-item-title">Open in Claude</span>
		  </div>
		  ${ICONS.external}
		</a>
		<a class="cpb-item" role="menuitem" target="_blank" rel="noopener noreferrer" data-ai="perplexity">
		  ${ICONS.spark}
		  <div class="cpb-item-content">
			<span class="cpb-item-title">Open in Perplexity</span>
		  </div>
		  ${ICONS.external}
		</a>
		<a class="cpb-item" role="menuitem" target="_blank" rel="noopener noreferrer" data-ai="gemini">
		  ${ICONS.spark}
		  <div class="cpb-item-content">
			<span class="cpb-item-title">Open in Gemini</span>
		  </div>
		  ${ICONS.external}
		</a>
	  </div>
	`;

	const primaryBtn = wrapper.querySelector(".cpb-primary");
	const primaryIcon = wrapper.querySelector(".cpb-primary-icon");
	const primaryLabel = wrapper.querySelector(".cpb-primary-label");
	const toggleBtn = wrapper.querySelector(".cpb-toggle");

	const setOpen = (isOpen) => {
	  wrapper.setAttribute("data-open", String(isOpen));
	  toggleBtn.setAttribute("aria-expanded", String(isOpen));
	  if (isOpen) {
		wrapper.querySelectorAll("[data-ai]").forEach((link) => {
		  link.href = buildAiUrl(link.getAttribute("data-ai"));
		});
	  }
	};

	const handleCopy = async () => {
	  try {
		await copyToClipboard(getPageMarkdown());
		primaryBtn.classList.add("cpb-btn--copied");
		primaryIcon.innerHTML = ICONS.check;
		primaryLabel.textContent = "Copied!";
		setOpen(false);
		setTimeout(() => {
		  primaryBtn.classList.remove("cpb-btn--copied");
		  primaryIcon.innerHTML = ICONS.copy;
		  primaryLabel.textContent = "Copy page";
		}, 2000);
	  } catch (err) {
		console.error("Failed to copy Markdown:", err);
	  }
	};

	primaryBtn.addEventListener("click", handleCopy);

	toggleBtn.addEventListener("click", (e) => {
	  e.stopPropagation();
	  const currentlyOpen = wrapper.getAttribute("data-open") === "true";
	  setOpen(!currentlyOpen);
	});

	wrapper.querySelector('[data-action="copy"]').addEventListener("click", handleCopy);

	wrapper.querySelector('[data-action="view-markdown"]').addEventListener("click", () => {
	  setOpen(false);
	  openAsPlainTextMarkdown();
	});

	document.addEventListener("click", (e) => {
	  if (!wrapper.contains(e.target)) setOpen(false);
	});

	document.addEventListener("keydown", (e) => {
	  if (e.key === "Escape") setOpen(false);
	});

	return wrapper;
  }

  function init() {
	if (document.querySelector(".cpb-wrapper")) return;

	const explicitMount = document.getElementById("copy-page-button");
	if (explicitMount) {
	  explicitMount.appendChild(createWidget());
	  return;
	}

	const contentRoot = findContentRoot();
	if (!contentRoot || contentRoot === document.body) return;

	const bar = document.createElement("div");
	bar.className = "cpb-auto-bar";
	bar.setAttribute("data-copy-ignore", "true");
	bar.appendChild(createWidget());
	contentRoot.insertBefore(bar, contentRoot.firstChild);
  }

  if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
  } else {
	init();
  }

  window.CopyPageButton = { init, getPageMarkdown };
})();