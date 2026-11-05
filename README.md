# Peng Luo — Academic Website

Static academic website, deployable to GitHub Pages.

## File structure

```
peng-luo-site/
├── index.html          # Homepage
├── research.html       # Research projects
├── publications.html   # Papers (with filter)
├── lab.html            # Lab members & openings
├── teaching.html       # Courses
├── contact.html        # Contact & collaborations
├── css/
│   └── style.css       # All shared styles
└── assets/
    ├── photo.jpg       # Your profile photo (add manually)
    └── cv.pdf          # Your CV (add manually)
```

## How to deploy to GitHub Pages

### Option A — Simplest (recommended)

1. Create a GitHub repository named `yourusername.github.io`
2. Upload all files (keep the folder structure)
3. Go to Settings → Pages → Source: `main` branch, `/ (root)`
4. Your site will be live at `https://yourusername.github.io`

### Option B — Custom domain (e.g. pengluo.com)

1. Follow Option A first
2. In Settings → Pages → Custom domain: enter your domain
3. Add a `CNAME` file in the root with your domain name on one line
4. Update your domain's DNS: add a CNAME record pointing to `yourusername.github.io`

---

## What to customize before publishing

### Essential
- [ ] Replace `your@email.com` / `your@ecnu.edu.cn` with real email
- [ ] Add `assets/photo.jpg` (recommended: 300×300px or larger, square crop)
- [ ] Add `assets/cv.pdf`
- [ ] Update Google Scholar, GitHub, ORCID links
- [ ] Fill in real publications in `publications.html`

### Recommended
- [ ] Update bio text in `index.html`
- [ ] Add real course names in `teaching.html`
- [ ] Add lab student names in `lab.html`
- [ ] Add news entries as they happen

---

## How to add a publication

In `publications.html`, copy this block and add it to the correct year group:

```html
<div class="pub-item" data-type="journal">  <!-- or: conference / preprint -->
  <div class="pub-title">Your Paper Title</div>
  <div class="pub-authors"><span class="me">Peng Luo</span>, Co-author A, Co-author B</div>
  <div class="pub-venue">Journal Name, 2025</div>
  <div class="pub-links">
    <a class="pub-link pdf" href="link-to-pdf">PDF</a>
    <a class="pub-link" href="doi-link">DOI</a>
    <a class="pub-link" href="code-link">Code</a>
  </div>
</div>
```

`data-type` controls which filter tab shows it: `journal`, `conference`, or `preprint`.

---

No build step required. Pure HTML/CSS/JS.
