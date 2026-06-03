# Naghedi Immigration website

Static site built with [Eleventy](https://www.11ty.dev/). Deploys to GitHub Pages
via `.github/workflows/deploy.yml`.

## Layout

```
naghedi-new/
  _data/site.json              Site config: nav, external links
  _includes/
    layouts/base.njk           <html>, <head>, includes header + footer
    layouts/page.njk           extends base
    partials/header.njk        ONE shared header (auto-extracted)
    partials/footer.njk        ONE shared footer (auto-extracted)
  src/
    pages/                     One folder per URL, index.html each
    assets/
      css/site.css static.css  Reused stylesheets from the legacy site
      cdn-images/              Image originals
      vendor-sqs/ site-sqs/    Legacy JS / fonts / icons
  scripts/
    copy-assets.sh             Re-pull assets from ../naghedi-dev
    extract-partials.mjs       Re-extract header/footer/main from legacy HTML
```

**Every page renders through `base.njk`, which is the only file that includes
`header.njk` and `footer.njk`. Edit those two files to change site-wide chrome.**

## Develop

```bash
cd naghedi-new
npm install
npm run serve    # http://localhost:8080
```

## Build

```bash
npm run build    # outputs to _site/
```

## Regenerate from legacy source

```bash
scripts/copy-assets.sh             # rsync assets from ../naghedi-dev
node scripts/extract-partials.mjs  # rebuild header.njk, footer.njk, pages/**
```

## Audit shared header/footer

```bash
# Pages must not inline their own header/footer:
grep -rE '<header|<footer' src/pages/   # expect: nothing

# After build, every page must have identical header/footer markup:
for f in _site/**/*.html(.); do case "$f" in _site/assets/*) ;; *) \
  awk '/<header/,/<\/header>/' "$f" | md5 ; esac; done | sort -u  # expect 1 hash
```

