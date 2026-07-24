const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const ExcelJS = require("exceljs");
const sharp = require("sharp");

const rules = require("../../config/fertigation/data/rules.json");
const {
  loadInterfaceWorkbook,
} = require("../../src/fertigation_pipeline/data/interface-workbook.js");
const {
  loadCalculationWorkbook,
  updateCalculationWorkbook,
} = require("../../src/fertigation_pipeline/data/calculation-workbook.js");
const calculator = require("../../src/fertigation_pipeline/calculation/core.js");

const root = path.resolve(__dirname, "../..");

test("Excel sources normalize to the published design and case JSON", async () => {
  const design = await loadInterfaceWorkbook(
    path.join(root, "data/fertigation/input/system-interfaces.xlsx"),
    rules
  );
  const publishedDesign = JSON.parse(
    await fs.readFile(
      path.join(
        root,
        "config/fertigation/content/sources/system-interfaces.data.json"
      ),
      "utf8"
    )
  );
  assert.deepEqual(publishedDesign, design);

  const calculation = await loadCalculationWorkbook(
    path.join(
      root,
      "data/fertigation/input/current-design-calculation.xlsx"
    ),
    design.metadata.design_revision
  );
  const publishedCase = JSON.parse(
    await fs.readFile(
      path.join(
        root,
        "config/fertigation/content/sources/current-design-case.data.json"
      ),
      "utf8"
    )
  );
  assert.deepEqual(publishedCase, calculation.calculationCase);
  assert.equal(publishedCase.system.emitterCount, 4);
  assert.equal(publishedCase.system.emitterFlowLph, 2);
});

test("design refresh preserves yellow input values", async () => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "fertigation-workbook-")
  );
  const source = path.join(
    root,
    "data/fertigation/input/current-design-calculation.xlsx"
  );
  const target = path.join(temporaryDirectory, "case.xlsx");
  await fs.copyFile(source, target);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(target);
  const input = workbook.getWorksheet("02_工况输入");
  const emitterRow = Array.from({ length: input.rowCount - 4 }, (_, index) => index + 5)
    .find((row) => input.getCell(row, 1).value === "emitterCount");
  input.getCell(emitterRow, 3).value = 7;
  await workbook.xlsx.writeFile(target);

  const design = await loadInterfaceWorkbook(
    path.join(root, "data/fertigation/input/system-interfaces.xlsx"),
    rules
  );
  await updateCalculationWorkbook(target, design);

  const refreshed = await loadCalculationWorkbook(
    target,
    design.metadata.design_revision
  );
  assert.equal(refreshed.calculationCase.system.emitterCount, 7);
});

test("Excel formula cache matches the JavaScript calculation core", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(
    path.join(
      root,
      "data/fertigation/input/current-design-calculation.xlsx"
    )
  );
  const sheet = workbook.getWorksheet("03_管路水力");
  const jsResult = calculator.calculateHydraulics({
    system: { emitterCount: 4, emitterFlowLph: 2 },
    water: {
      densityKgM3: 1000,
      kinematicViscosityM2s: 1.004e-6,
    },
    mainPipe: {
      innerDiameterMm: 9,
      lengthM: 10,
      roughnessMm: 0,
      localK: 0,
    },
    lateralPipe: {
      innerDiameterMm: 3,
      lengthM: 1,
      roughnessMm: 0,
      localK: 0,
    },
  });
  const resultOf = (address) => sheet.getCell(address).value.result;
  assert.equal(resultOf("B5"), jsResult.systemFlow.designFlowLph.value);
  assert.ok(
    Math.abs(resultOf("B12") - jsResult.main.values.velocityMs) < 1e-12
  );
  assert.ok(
    Math.abs(resultOf("B16") - jsResult.main.values.lineLossMpa) < 1e-12
  );
  assert.ok(
    Math.abs(resultOf("B21") - jsResult.totalVolumeL.value) < 1e-12
  );
  for (const address of ["B5", "B12", "B16", "B21"]) {
    assert.equal(typeof sheet.getCell(address).value.formula, "string");
  }
});

test("generated topology is a 2400px PNG and current SVG has all points", async () => {
  const png = path.join(
    root,
    "docs/assets/generated/fertigation-system-topology-v3.png"
  );
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, 2400);
  assert.equal(metadata.format, "png");

  const svg = await fs.readFile(
    path.join(
      root,
      "docs/assets/generated/fertigation-system-topology-v3.svg"
    ),
    "utf8"
  );
  for (const point of ["P0", "P1", "P2", "P3"]) {
    assert.match(svg, new RegExp(`>${point}<`));
  }
  assert.doesNotMatch(svg, /corrected|原图|旧图|修正版/);
});

test("README entry points and the website runner stay valid", async () => {
  const readme = await fs.readFile(path.join(root, "README.md"), "utf8");
  const localLinks = Array.from(readme.matchAll(/\]\(([^)]+)\)/g))
    .map((match) => match[1])
    .filter((target) => !target.includes("://") && !target.startsWith("#"));

  for (const target of localLinks) {
    await fs.access(path.join(root, target));
  }

  const packageJson = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8")
  );
  assert.match(packageJson.scripts["docs:serve"], /serve-docs\.ps1/);
  await fs.access(path.join(root, "scripts/serve-docs.ps1"));
});
