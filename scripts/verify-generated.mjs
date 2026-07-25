import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const {
  loadInterfaceWorkbook,
} = require("../src/fertigation_pipeline/data/interface-workbook.js");
const {
  loadCalculationWorkbook,
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function json(relative) {
  return JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
}

function canonical(value) {
  return JSON.stringify(value);
}

async function assertEqualFile(relative, expected) {
  const actual = await fs.readFile(path.join(root, relative), "utf8");
  if (actual.replace(/\r\n/g, "\n") !== expected.replace(/\r\n/g, "\n")) {
    throw new Error(`生成文件已过期：${relative}`);
  }
}

async function sha256(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function verify() {
  const runtimeCache = path.join(root, "data/fertigation/output/runtime");
  const fontCache = path.join(runtimeCache, "fontconfig/cache");
  await fs.mkdir(fontCache, {
    recursive: true,
  });
  process.env.LOCALAPPDATA = runtimeCache;
  process.env.XDG_CACHE_HOME = path.join(runtimeCache, "cache");
  const fontConfigPath = path.join(runtimeCache, "fontconfig/fonts.conf");
  await fs.writeFile(
    fontConfigPath,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>C:/Windows/Fonts</dir>
  <dir>/usr/share/fonts</dir>
  <cachedir>${fontCache.replace(/\\/g, "/")}</cachedir>
</fontconfig>
`,
    "utf8"
  );
  process.env.FONTCONFIG_FILE = fontConfigPath;
  const { default: sharp } = await import("sharp");

  const rules = await json("config/fertigation/data/rules.json");
  const layout = await json("config/fertigation/presentation/diagram-layout.json");
  const interfaceWorkbook = path.join(
    root,
    "data/fertigation/input/system-interfaces.xlsx"
  );
  const calculationWorkbook = path.join(
    root,
    "data/fertigation/input/current-design-calculation.xlsx"
  );
  const systemData = await loadInterfaceWorkbook(interfaceWorkbook, rules);
  const calculation = await loadCalculationWorkbook(
    calculationWorkbook,
    systemData.metadata.design_revision
  );

  const writtenSystem = await json(
    "config/fertigation/content/sources/system-interfaces.data.json"
  );
  const writtenCase = await json(
    "config/fertigation/content/sources/current-design-case.data.json"
  );
  if (canonical(writtenSystem) !== canonical(systemData)) {
    throw new Error("system-interfaces.data.json 与接口规格工作簿不一致。");
  }
  if (canonical(writtenCase) !== canonical(calculation.calculationCase)) {
    throw new Error("current-design-case.data.json 与工程计算工作簿不一致。");
  }

  await assertEqualFile(
    "docs/_generated/measurement-points.md",
    renderMeasurementPoints(systemData)
  );
  await assertEqualFile(
    "docs/_generated/current-design-summary.md",
    renderDesignSummary(systemData, calculation.calculationCase)
  );
  await assertEqualFile(
    "docs/reference/interface-schedule.md",
    renderInterfaceSchedule(systemData)
  );
  await assertEqualFile(
    "docs/reference/procurement-list.md",
    renderProcurementList(systemData)
  );
  await assertEqualFile(
    "docs/assets/generated/fertigation-system-topology-v5.svg",
    renderTopologySvg(systemData, layout)
  );

  const pngMetadata = await sharp(
    path.join(
      root,
      "docs/assets/generated/fertigation-system-topology-v5.png"
    )
  ).metadata();
  if (pngMetadata.width !== 2400 || pngMetadata.format !== "png") {
    throw new Error("工程图PNG尺寸或格式不符合生成规则。");
  }

  const downloads = [
    ["data/fertigation/input/system-interfaces.xlsx", "docs/downloads/system-interfaces.xlsx"],
    ["data/fertigation/input/current-design-calculation.xlsx", "docs/downloads/current-design-calculation.xlsx"],
  ];
  for (const [source, published] of downloads) {
    if (
      (await sha256(path.join(root, source))) !==
      (await sha256(path.join(root, published)))
    ) {
      throw new Error(`下载文件不是输入工作簿的当前副本：${published}`);
    }
  }

  const publishedScripts = [
    ["src/fertigation_pipeline/calculation/core.js", "docs/javascripts/generated/fertigation-calculator-core.js"],
    ["src/fertigation_pipeline/web/calculator.js", "docs/javascripts/generated/fertigation-calculator.js"],
  ];
  const header =
    "// GENERATED FILE — edit the source under src/fertigation_pipeline instead.\n";
  for (const [source, published] of publishedScripts) {
    const sourceText = await fs.readFile(path.join(root, source), "utf8");
    await assertEqualFile(published, `${header}${sourceText}`);
  }

  for (const forbidden of [
    "docs/assets/generated/fertigation-system-topology-v3.svg",
    "docs/assets/generated/fertigation-system-topology-v3.png",
    "docs/assets/fertigation-system-topology-v2.svg",
    "docs/assets/fertigation-system-topology-v2.png",
    "docs/javascripts/fertigation-calculator-core.js",
    "docs/javascripts/fertigation-calculator.js",
  ]) {
    try {
      await fs.access(path.join(root, forbidden));
      throw new Error(`应删除的旧发布文件仍存在：${forbidden}`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  process.stdout.write(
    `GENERATED_OK revision=${systemData.metadata.design_revision} files=12\n`
  );
}

verify().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
