import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const {
  loadInterfaceWorkbook,
} = require("../src/fertigation_pipeline/data/interface-workbook.js");
const {
  updateCalculationWorkbook,
} = require("../src/fertigation_pipeline/data/calculation-workbook.js");
const {
  renderDesignSummary,
  renderInterfaceSchedule,
  renderMeasurementPoints,
  renderProcurementList,
} = require("../src/fertigation_pipeline/render/markdown.js");
const {
  renderTopologySvg,
} = require("../src/fertigation_pipeline/render/svg.js");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const execFileAsync = promisify(execFile);

const paths = {
  rules: path.join(root, "config/fertigation/data/rules.json"),
  layout: path.join(root, "config/fertigation/presentation/diagram-layout.json"),
  interfaceWorkbook: path.join(
    root,
    "data/fertigation/input/system-interfaces.xlsx"
  ),
  calculationWorkbook: path.join(
    root,
    "data/fertigation/input/current-design-calculation.xlsx"
  ),
  interfaceJson: path.join(
    root,
    "config/fertigation/content/sources/system-interfaces.data.json"
  ),
  caseJson: path.join(
    root,
    "config/fertigation/content/sources/current-design-case.data.json"
  ),
  generatedDocs: path.join(root, "docs/_generated"),
  referenceSchedule: path.join(root, "docs/reference/interface-schedule.md"),
  procurementList: path.join(root, "docs/reference/procurement-list.md"),
  generatedAssets: path.join(root, "docs/assets/generated"),
  publicCase: path.join(
    root,
    "docs/assets/generated/current-design-case.data.json"
  ),
  downloads: path.join(root, "docs/downloads"),
  generatedJs: path.join(root, "docs/javascripts/generated"),
};

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.replace(/\r\n/g, "\n"), "utf8");
}

async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function publishJavascript(sourceRelative, outputName) {
  const sourcePath = path.join(root, sourceRelative);
  const source = await fs.readFile(sourcePath, "utf8");
  const header =
    "// GENERATED FILE — edit the source under src/fertigation_pipeline instead.\n";
  await writeText(path.join(paths.generatedJs, outputName), `${header}${source}`);
}

async function synchronize() {
  const runtimeCache = path.join(root, "data/fertigation/output/runtime");
  const fontCache = path.join(runtimeCache, "fontconfig/cache");
  await fs.mkdir(fontCache, {
    recursive: true,
  });
  const fontConfigPath = path.join(runtimeCache, "fontconfig/fonts.conf");
  await writeText(
    fontConfigPath,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>C:/Windows/Fonts</dir>
  <dir>/usr/share/fonts</dir>
  <cachedir>${fontCache.replace(/\\/g, "/")}</cachedir>
</fontconfig>
`
  );
  const rules = await readJson(paths.rules);
  const layout = await readJson(paths.layout);
  const systemData = await loadInterfaceWorkbook(paths.interfaceWorkbook, rules);

  await fs.mkdir(path.dirname(paths.interfaceJson), { recursive: true });
  await writeJson(paths.interfaceJson, systemData);

  const calculationCase = await updateCalculationWorkbook(
    paths.calculationWorkbook,
    systemData
  );
  await writeJson(paths.caseJson, calculationCase);

  await writeText(
    path.join(paths.generatedDocs, "measurement-points.md"),
    renderMeasurementPoints(systemData)
  );
  await writeText(
    path.join(paths.generatedDocs, "current-design-summary.md"),
    renderDesignSummary(systemData, calculationCase)
  );
  await writeText(
    paths.referenceSchedule,
    renderInterfaceSchedule(systemData)
  );
  await writeText(
    paths.procurementList,
    renderProcurementList(systemData)
  );

  const svg = renderTopologySvg(systemData, layout);
  const svgPath = path.join(
    paths.generatedAssets,
    "fertigation-system-topology-v5.svg"
  );
  const pngPath = path.join(
    paths.generatedAssets,
    "fertigation-system-topology-v5.png"
  );
  await writeText(svgPath, svg);
  await fs.mkdir(path.dirname(pngPath), { recursive: true });
  await execFileAsync(
    process.execPath,
    [path.join(scriptDir, "render-png.mjs"), svgPath, pngPath, "2400"],
    {
      cwd: root,
      env: {
        ...process.env,
        LOCALAPPDATA: runtimeCache,
        XDG_CACHE_HOME: path.join(runtimeCache, "cache"),
        FONTCONFIG_FILE: fontConfigPath,
        FONTCONFIG_PATH: path.dirname(fontConfigPath),
      },
    }
  );

  await writeJson(paths.publicCase, calculationCase);
  await fs.mkdir(paths.downloads, { recursive: true });
  await fs.copyFile(
    paths.interfaceWorkbook,
    path.join(paths.downloads, "system-interfaces.xlsx")
  );
  await fs.copyFile(
    paths.calculationWorkbook,
    path.join(paths.downloads, "current-design-calculation.xlsx")
  );

  await publishJavascript(
    "src/fertigation_pipeline/calculation/core.js",
    "fertigation-calculator-core.js"
  );
  await publishJavascript(
    "src/fertigation_pipeline/web/calculator.js",
    "fertigation-calculator.js"
  );

  for (const warning of systemData.validation.warnings) {
    process.stdout.write(`WARN ${warning}\n`);
  }
  process.stdout.write(
    `SYNC_OK revision=${systemData.metadata.design_revision} hash=${systemData.source_hash.slice(0, 12)}\n`
  );
}

synchronize().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
