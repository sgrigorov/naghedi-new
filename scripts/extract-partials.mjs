#!/usr/bin/env node
/**
 * Extract shared header + footer from naghedi-dev/www.naghedi-immigration.ca/index.html
 * and write them as Nunjucks partials. Also extract the <main> body of every source
 * HTML page and write it under src/pages/ (with .html extension), rewriting paths
 * along the way.
 *
 * Single pass. Idempotent. Re-run any time.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_SITE = path.resolve(ROOT, "../naghedi-dev/www.naghedi-immigration.ca");
const OUT_PARTIALS = path.resolve(ROOT, "_includes/partials");
const OUT_PAGES = path.resolve(ROOT, "src/pages");

// -------- path rewrites applied to every extracted chunk -----------------
const PATH_REWRITES = [
  // Strip Squarespace CDN resize directives — they have no meaning for static files
  // and any %3F form breaks GH Pages path matching (literal ? in path != query).
  [/(\.(?:png|jpe?g|gif|webp|svg|ico|css|js))(?:%3F|\?)format=[0-9]+w/gi, "$1"],
  // CDN folder remaps (handle ../ and plain forms).
  [/\.\.\/assets\.squarespace\.com\//g, "/assets/vendor-sqs/"],
  [/\.\.\/static1\.squarespace\.com\//g, "/assets/site-sqs/"],
  [/\.\.\/images\.squarespace-cdn\.com\//g, "/assets/cdn-images/"],
  // Internal page links (relative .html -> clean URLs)
  [/href="index\.html"/g, 'href="/"'],
  [/href="our-team\.html"/g, 'href="/our-team/"'],
  [/href="services-2\.html"/g, 'href="/services/"'],
  [/href="permanent-residence\.html"/g, 'href="/permanent-residence/"'],
  [/href="temporary-residence\.html"/g, 'href="/temporary-residence/"'],
  [/href="other\.html"/g, 'href="/other/"'],
  [/href="cart\.html"/g, 'href="#"'], // cart removed
  // Child paths (also rename typos)
  [/href="permanent-residence\/businness-class\.html"/g, 'href="/permanent-residence/business-class/"'],
  [/href="permanent-residence\/economic-class\.html"/g, 'href="/permanent-residence/economic-class/"'],
  [/href="permanent-residence\/family-class\.html"/g, 'href="/permanent-residence/family-class/"'],
  [/href="permanent-residence\/humanitarianandcompassionategrounds\.html"/g, 'href="/permanent-residence/humanitarian-compassionate/"'],
  [/href="permanent-residence\/refugee-class\.html"/g, 'href="/permanent-residence/refugee-class/"'],
  [/href="temporary-residence1\/study-in-canada1\.html"/g, 'href="/temporary-residence/study-in-canada/"'],
  [/href="temporary-residence1\/work-in-canada\.html"/g, 'href="/temporary-residence/work-in-canada/"'],
  [/href="temporary-residence1\/visit-canada\.html"/g, 'href="/temporary-residence/visit-canada/"'],
  [/href="other\/appeals\.html"/g, 'href="/other/appeals/"'],
  [/href="other\/citizenship\.html"/g, 'href="/other/citizenship/"'],
  [/href="other\/inadmissibility\.html"/g, 'href="/other/inadmissibility/"'],
  [/href="other\/pr-card\.html"/g, 'href="/other/pr-card/"'],
  // Sibling links from child pages: "../foo.html" patterns
  [/href="\.\.\/index\.html"/g, 'href="/"'],
  [/href="\.\.\/our-team\.html"/g, 'href="/our-team/"'],
  [/href="\.\.\/services-2\.html"/g, 'href="/services/"'],
  [/href="\.\.\/permanent-residence\.html"/g, 'href="/permanent-residence/"'],
  [/href="\.\.\/temporary-residence\.html"/g, 'href="/temporary-residence/"'],
  [/href="\.\.\/other\.html"/g, 'href="/other/"'],
  [/href="\.\.\/cart\.html"/g, 'href="#"'],
];

function rewrite(s) {
  for (const [re, to] of PATH_REWRITES) s = s.replace(re, to);
  return s;
}

function readLines(file) {
  return fs.readFileSync(file, "utf8").split("\n");
}

function sliceLines(lines, start, end) {
  return lines.slice(start - 1, end).join("\n");
}

// Find header & footer boundaries in a source HTML.
function findBoundaries(lines) {
  let headerStart = -1, headerEnd = -1, footerStart = -1, footerEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (headerStart < 0 && /^\s*<header\b/.test(L)) headerStart = i + 1;
    else if (headerStart > 0 && headerEnd < 0 && /^\s*<\/header>/.test(L)) headerEnd = i + 1;
    else if (footerStart < 0 && /^\s*<footer\b/.test(L)) footerStart = i + 1;
    else if (footerStart > 0 && footerEnd < 0 && /^\s*<\/footer>/.test(L)) footerEnd = i + 1;
  }
  return { headerStart, headerEnd, footerStart, footerEnd };
}

// -------- step 1: header + footer partials from index.html ----------------
const indexFile = path.join(SRC_SITE, "index.html");
const indexLines = readLines(indexFile);
const b = findBoundaries(indexLines);
if (b.headerStart < 0 || b.footerEnd < 0) {
  console.error("Could not locate header/footer in", indexFile, b);
  process.exit(1);
}
console.log("index.html boundaries:", b);

let headerHtml = sliceLines(indexLines, b.headerStart, b.headerEnd);
let footerHtml = sliceLines(indexLines, b.footerStart, b.footerEnd);

// Strip the cart widget block out of header markup.
headerHtml = headerHtml.replace(
  /<div[^>]*class="[^"]*sqs-custom-cart[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/a>\s*<\/div>/g,
  ""
);
// Also clip the floating-cart div if present in header range.
headerHtml = headerHtml.replace(
  /<div\s+id="floatingCart"[\s\S]*?<\/div>\s*<\/div>\s*<\/a>\s*<\/div>\s*<\/div>/g,
  ""
);

headerHtml = rewrite(headerHtml);
footerHtml = rewrite(footerHtml);

fs.mkdirSync(OUT_PARTIALS, { recursive: true });
fs.writeFileSync(
  path.join(OUT_PARTIALS, "header.njk"),
  "{# Auto-extracted from naghedi-dev/www.naghedi-immigration.ca/index.html. Edit freely. #}\n" + headerHtml + "\n"
);
fs.writeFileSync(
  path.join(OUT_PARTIALS, "footer.njk"),
  "{# Auto-extracted from naghedi-dev/www.naghedi-immigration.ca/index.html. Edit freely. #}\n" + footerHtml + "\n"
);
console.log("Wrote header.njk and footer.njk");

// -------- step 2: extract <main> body from every source page --------------
// Pages map: source relative path -> output relative path (without .html)
const PAGES = [
  ["index.html",                                          "index"],
  ["our-team.html",                                       "our-team/index"],
  ["services-2.html",                                     "services/index"],
  ["permanent-residence.html",                            "permanent-residence/index"],
  ["temporary-residence.html",                            "temporary-residence/index"],
  ["other.html",                                          "other/index"],
  ["permanent-residence/economic-class.html",             "permanent-residence/economic-class/index"],
  ["permanent-residence/family-class.html",               "permanent-residence/family-class/index"],
  ["permanent-residence/businness-class.html",            "permanent-residence/business-class/index"],
  ["permanent-residence/humanitarianandcompassionategrounds.html", "permanent-residence/humanitarian-compassionate/index"],
  ["permanent-residence/refugee-class.html",              "permanent-residence/refugee-class/index"],
  ["temporary-residence1/study-in-canada1.html",          "temporary-residence/study-in-canada/index"],
  ["temporary-residence1/work-in-canada.html",            "temporary-residence/work-in-canada/index"],
  ["temporary-residence1/visit-canada.html",              "temporary-residence/visit-canada/index"],
  ["other/appeals.html",                                  "other/appeals/index"],
  ["other/citizenship.html",                              "other/citizenship/index"],
  ["other/inadmissibility.html",                          "other/inadmissibility/index"],
  ["other/pr-card.html",                                  "other/pr-card/index"],
];

const TITLE_BY_OUT = {
  "index":                                          "Home",
  "our-team/index":                                 "Our Team",
  "services/index":                                 "Services",
  "permanent-residence/index":                      "Permanent Residence",
  "temporary-residence/index":                      "Temporary Residence",
  "other/index":                                    "Other Services",
  "permanent-residence/economic-class/index":       "Economic Class",
  "permanent-residence/family-class/index":         "Family Class",
  "permanent-residence/business-class/index":       "Business Class",
  "permanent-residence/humanitarian-compassionate/index": "Humanitarian & Compassionate",
  "permanent-residence/refugee-class/index":        "Refugee Class",
  "temporary-residence/study-in-canada/index":      "Study in Canada",
  "temporary-residence/work-in-canada/index":       "Work in Canada",
  "temporary-residence/visit-canada/index":         "Visit Canada",
  "other/appeals/index":                            "Appeals",
  "other/citizenship/index":                        "Citizenship",
  "other/inadmissibility/index":                    "Inadmissibility",
  "other/pr-card/index":                            "PR Card",
};

fs.mkdirSync(OUT_PAGES, { recursive: true });

for (const [src, out] of PAGES) {
  const srcFile = path.join(SRC_SITE, src);
  if (!fs.existsSync(srcFile)) {
    console.warn("MISSING source:", srcFile);
    continue;
  }
  const lines = readLines(srcFile);
  const bb = findBoundaries(lines);
  if (bb.headerEnd < 0 || bb.footerStart < 0) {
    console.warn("Skipping (no header/footer):", src, bb);
    continue;
  }
  let body = sliceLines(lines, bb.headerEnd + 1, bb.footerStart - 1);
  body = rewrite(body);
  // Drop any stray floating-cart placeholder in body
  body = body.replace(/<div\s+id="floatingCart"[\s\S]*?<\/div>\s*<\/div>\s*<\/a>\s*<\/div>\s*<\/div>/g, "");

  const outFile = path.join(OUT_PAGES, out + ".html");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const title = TITLE_BY_OUT[out] || out;
  const fm = `---\nlayout: page\ntitle: ${JSON.stringify(title)}\n---\n`;
  fs.writeFileSync(outFile, fm + body + "\n");
  console.log("wrote", path.relative(ROOT, outFile));
}

console.log("Done.");
