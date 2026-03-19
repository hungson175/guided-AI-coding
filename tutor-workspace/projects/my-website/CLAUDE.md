# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

```bash
python3 -m http.server 8080
```

No build step, no dependencies, no package manager. Open `http://localhost:8080` in a browser.

## Architecture

Personal portfolio site for "Tuong Nguyen" — vanilla HTML/CSS/JS, no frameworks.

### Files

- `index.html` — Main portfolio page (hero, about, leadership roles, contact, blog preview). Contains all JS inline in a `<script>` tag at bottom.
- `blog.html` — Full blog page with list/single-post views. Also contains all JS inline.
- `style.css` — Global styles + admin panel styles. Uses CSS custom properties for theming.
- `blog.css` — Blog-specific styles (cards, post content typography, editor modal).

### Theming

Dark/light mode via `data-theme="dark"` attribute on `<html>`. CSS custom properties defined in `:root` and `[data-theme="dark"]` in `style.css`. Theme preference stored in `localStorage('theme')` and respects `prefers-color-scheme`.

### Data & State

All content is stored in `localStorage` — no backend, no database:
- `siteContent` — Hero text (name, title, tagline) and leadership roles array
- `blogPosts` — Array of blog post objects (`{id, title, date, tags, content, excerpt}`)
- `theme` — `"dark"` or `"light"`

Both pages have an admin edit button (pencil icon, bottom-right) that opens a modal editor for content. Default content is hardcoded in `defaultContent` object inside `index.html`.

### Routing

Blog uses hash-based routing: `blog.html#post-{id}` shows a single post, empty hash shows the list. Handled by `hashchange` event listener.

### Content Rendering

Blog posts use a custom lightweight markdown renderer (`renderMarkdown()` in `blog.html`) supporting: bold, italic, headings (h2/h3), links, images, blockquotes, code/code blocks, unordered lists. HTML is escaped before rendering via `escapeHTML()`.

### Fonts

Google Fonts loaded externally: **Playfair Display** (headings) and **Inter** (body text).

### Language

All UI text is in Vietnamese (without diacritics). Content uses `lang="vi"`.
