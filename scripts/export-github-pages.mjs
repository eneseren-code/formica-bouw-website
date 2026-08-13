import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDirectory = path.join(root, "dist-pages");
const serverOrigin = (process.env.EXPORT_SERVER_ORIGIN || "http://127.0.0.1:3000").replace(/\/$/, "");
const pagesOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "https://eneseren-code.github.io/formica-bouw-website").replace(/\/$/, "");
const pagesBasePath = (process.env.PAGES_BASE_PATH || "/formica-bouw-website").replace(/\/$/, "");

const routes = [
  "/", "/diensten", "/renovaties", "/isolatie", "/keukens-kasten-op-maat",
  "/stucen-en-schilderen", "/laadpalen-en-elektra", "/projecten", "/over-ons",
  "/contact", "/offerte", "/privacybeleid", "/cookiebeleid", "/en", "/en/services",
  "/en/renovations", "/en/insulation-sustainability", "/en/custom-kitchens-cabinets",
  "/en/plastering-painting", "/en/ev-charging-electrical", "/en/projects", "/en/about",
  "/en/contact", "/en/quote", "/en/privacy", "/en/cookies",
];

function withBasePath(html) {
  return html.replace(
    /(href|src|srcSet|data-desktop-src|data-mobile-src)="\/(?!\/)/g,
    `$1="${pagesBasePath}/`,
  );
}

function makeStatic(html) {
  const deferredMetadata = [...html.matchAll(/<div hidden id="S:\d+"><div hidden="">([\s\S]*?)<\/div><\/div>/gi)]
    .map((match) => match[1])
    .join("");
  const structuredData = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi)]
    .map((match) => match[0])
    .join("");
  let staticHtml = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<div hidden id="S:\d+"><div hidden="">[\s\S]*?<\/div><\/div>/gi, "")
    .replace(/<div hidden=""><!--[\s\S]*?<\/div>/gi, "")
    .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/gi, "")
    .replace(/<link\b[^>]*href="\/@id\/[^>]*>/gi, "")
    .replace(/<link\b[^>]*href="\/app\/globals\.css"[^>]*>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<template\b[^>]*><\/template>/gi, "")
    .replace("</head>", `${deferredMetadata}${structuredData}<link rel="stylesheet" href="/assets/site.css"></head>`)
    .replace("</body>", '<script src="/assets/site.js" defer></script></body>')
    .replaceAll("http://localhost:3000", pagesOrigin)
    .replaceAll("http://127.0.0.1:3000", pagesOrigin);

  staticHtml = withBasePath(staticHtml);
  return staticHtml.replace("<html ", "<html data-static-pages=\"true\" ");
}

async function fetchText(route) {
  const response = await fetch(`${serverOrigin}${route}`);
  if (!response.ok) throw new Error(`Could not export ${route}: HTTP ${response.status}`);
  return response.text();
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(path.join(root, "public"), outputDirectory, { recursive: true });
await mkdir(path.join(outputDirectory, "assets"), { recursive: true });

const sourceCss = await readFile(path.join(root, "app", "globals.css"), "utf8");
const staticCss = `${sourceCss}\n\n.static-pages-notice { margin: 0 0 1.25rem; padding: 1rem; border-left: 3px solid var(--cobalt); background: #eef1ff; color: var(--ink); font-size: .82rem; line-height: 1.6; }\nhtml[data-static-pages="true"] .project-filters { display: none; }\n`;
await writeFile(path.join(outputDirectory, "assets", "site.css"), staticCss);
await cp(path.join(root, "scripts", "github-pages-client.js"), path.join(outputDirectory, "assets", "site.js"));
await writeFile(path.join(outputDirectory, ".nojekyll"), "");

for (const route of routes) {
  const html = makeStatic(await fetchText(route));
  const relativeDirectory = route === "/" ? "" : route.replace(/^\//, "");
  const destination = path.join(outputDirectory, relativeDirectory);
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, "index.html"), html);
}

const rootHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8");
await writeFile(path.join(outputDirectory, "404.html"), rootHtml);

for (const route of ["/robots.txt", "/sitemap.xml"]) {
  const response = await fetch(`${serverOrigin}${route}`);
  if (!response.ok) continue;
  const content = (await response.text())
    .replaceAll("http://localhost:3000", pagesOrigin)
    .replaceAll("http://127.0.0.1:3000", pagesOrigin);
  await writeFile(path.join(outputDirectory, route.slice(1)), content);
}

console.log(`Exported ${routes.length} public routes to ${outputDirectory}`);
