// Both entry points are rendered from the same authored HTML and styles.
const fs = require("node:fs/promises");
const path = require("node:path");

async function webArtifacts(root) {
  const sourceDir = path.join(root, "src/fertigation_pipeline/web");
  const sourceHtml = (await fs.readFile(path.join(sourceDir, "index.html"), "utf8")).replace(/\r\n/g, "\n");
  const css = await fs.readFile(path.join(sourceDir, "workbench.css"), "utf8");
  const header = await fs.readFile(path.join(sourceDir, "header.html"), "utf8");
  const shellCss = await fs.readFile(path.join(sourceDir, "shared-shell.css"), "utf8");
  const shellJs = await fs.readFile(path.join(sourceDir, "docs-shell.js"), "utf8");
  function renderHeader(documentation) {
    const replacements = {
      ROOT: documentation ? "{{ base_url }}/" : "../../",
      COMPONENT: documentation ? 'data-md-component="header"' : "",
      MD_CLASS: documentation ? "md-header" : "",
      TOOL_ACTIVE: documentation ? '{% if page and page.file.src_uri == "calculations/engineering-calculator.md" %}aria-current="page"{% endif %}' : 'aria-current="page"',
      DOCS_ACTIVE: documentation ? '{% if page and page.file.src_uri != "calculations/engineering-calculator.md" %}aria-current="page"{% endif %}' : "",
      NATIVE_SEARCH: documentation ? '{% include "partials/search.html" %}<div hidden data-md-component="header-title"><span data-md-component="header-topic">{{ page.title }}</span></div>' : "",
      MENU: documentation ? '{% if page and page.file.src_uri != "calculations/engineering-calculator.md" %}<button type="button" data-doc-menu aria-expanded="false" aria-label="打开文档目录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg></button>{% endif %}' : "",
    };
    return header.replace(/@@([A-Z_]+)@@/g, (_, name) => {
      if (!(name in replacements)) throw new Error(`未知公共横栏占位符：${name}`);
      return replacements[name];
    });
  }
  if (!sourceHtml.includes("<!-- SHARED_HEADER -->")) throw new Error("工具源缺少公共横栏插槽。");
  const html = sourceHtml.replace("<!-- SHARED_HEADER -->", renderHeader(false));
  const notice = "<!-- GENERATED FILE: edit src/fertigation_pipeline/web/index.html -->\n";
  return [
    ["docs/tools/calculator/index.html", notice + html],
    ["overrides/workbench.html", notice + html.replace(/((?:href|src|action|data-case-url)=")\.\.\/\.\.\//g, "$1./")],
    ["docs/stylesheets/generated/workbench.css", "/* GENERATED FILE: edit src/fertigation_pipeline/web/workbench.css */\n" + css],
    ["overrides/partials/header.html", "<!-- GENERATED FILE: edit src/fertigation_pipeline/web/header.html -->\n" + renderHeader(true)],
    ["docs/stylesheets/generated/shared-shell.css", "/* GENERATED FILE: edit src/fertigation_pipeline/web/shared-shell.css */\n" + shellCss],
    ["docs/javascripts/generated/docs-shell.js", "// GENERATED FILE: edit src/fertigation_pipeline/web/docs-shell.js\n" + shellJs],
  ];
}

module.exports = { webArtifacts };

