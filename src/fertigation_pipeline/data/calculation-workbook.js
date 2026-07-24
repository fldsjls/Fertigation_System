"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const ExcelJS = require("exceljs");

const INPUT_SHEET = "02_工况输入";
const BASELINE_SHEET = "01_当前设计基准";
const META_SHEET = "_meta";
const WORKBOOK_SCHEMA_VERSION = "1.0.0";
const MANAGED_BASELINE_MARKER = "fertigation-baseline:v1";

function normalizeCellValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "result")) {
    return value.result;
  }
  return value;
}

function numberOrNull(value) {
  const normalized = normalizeCellValue(value);
  if (normalized === null || normalized === false) {
    return normalized === false ? false : null;
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function booleanValue(value) {
  const normalized = normalizeCellValue(value);
  if (typeof normalized === "boolean") {
    return normalized;
  }
  if (typeof normalized === "number") {
    return normalized === 1;
  }
  if (typeof normalized === "string") {
    return ["true", "1", "是", "yes"].includes(normalized.trim().toLowerCase());
  }
  return false;
}

function readInputMap(sheet) {
  const values = {};
  for (let row = 5; row <= sheet.rowCount; row += 1) {
    const key = normalizeCellValue(sheet.getCell(row, 1).value);
    if (key) {
      values[String(key)] = normalizeCellValue(sheet.getCell(row, 3).value);
    }
  }
  return values;
}

function buildCaseFromInputs(values, designRevision) {
  const samples = [];
  for (let index = 1; index <= 16; index += 1) {
    const value = numberOrNull(values[`sampleVolumeMl${index}`]);
    if (value !== null) {
      samples.push(value);
    }
  }
  return {
    schema_version: WORKBOOK_SCHEMA_VERSION,
    design_revision: designRevision,
    scenario: {
      name: values.scenarioName || "当前设计工况",
      date: values.scenarioDate || null,
      operator: values.operator || ""
    },
    system: {
      emitterCount: numberOrNull(values.emitterCount),
      emitterFlowLph: numberOrNull(values.emitterFlowLph)
    },
    water: {
      densityKgM3: numberOrNull(values.densityKgM3),
      kinematicViscosityM2s: numberOrNull(values.kinematicViscosityM2s)
    },
    pipes: {
      main: {
        innerDiameterMm: numberOrNull(values.mainInnerDiameterMm),
        outerDiameterMm: numberOrNull(values.mainOuterDiameterMm),
        lengthM: numberOrNull(values.mainLengthM),
        roughnessMm: numberOrNull(values.mainRoughnessMm),
        localK: numberOrNull(values.mainLocalK)
      },
      lateral: {
        innerDiameterMm: numberOrNull(values.lateralInnerDiameterMm),
        outerDiameterMm: numberOrNull(values.lateralOuterDiameterMm),
        lengthM: numberOrNull(values.lateralLengthM),
        roughnessMm: numberOrNull(values.lateralRoughnessMm),
        localK: numberOrNull(values.lateralLocalK)
      }
    },
    pressure_points: {
      sourceDynamicMpa: numberOrNull(values.sourceDynamicMpa),
      P0: numberOrNull(values.fieldP0Mpa),
      P1: numberOrNull(values.fieldP1Mpa),
      P2: numberOrNull(values.fieldP2Mpa),
      P3: numberOrNull(values.fieldP3Mpa),
      heightDifferenceM: numberOrNull(values.heightDifferenceM),
      downstreamLossMpa: numberOrNull(values.downstreamLossMpa),
      emitterMinPressureMpa: numberOrNull(values.emitterMinPressureMpa),
      emitterMaxPressureMpa: numberOrNull(values.emitterMaxPressureMpa)
    },
    component_losses: {
      regulatorSetMpa: numberOrNull(values.regulatorSetMpa),
      regulatorMinDifferentialMpa: numberOrNull(values.regulatorMinDifferentialMpa),
      backflowLossMpa: numberOrNull(values.backflowLossMpa),
      filterCleanLossMpa: numberOrNull(values.filterCleanLossMpa),
      filterDirtyLossMpa: numberOrNull(values.filterDirtyLossMpa),
      controllerALossMpa: numberOrNull(values.controllerALossMpa),
      checkALossMpa: numberOrNull(values.checkALossMpa),
      fittingsALossMpa: numberOrNull(values.fittingsALossMpa),
      controllerBLossMpa: numberOrNull(values.controllerBLossMpa),
      venturiLossMpa: numberOrNull(values.venturiLossMpa),
      checkBLossMpa: numberOrNull(values.checkBLossMpa),
      fittingsBLossMpa: numberOrNull(values.fittingsBLossMpa)
    },
    venturi: {
      model: values.venturiModel || "",
      sourceReference: values.venturiSourceReference || "",
      maxPressureMpa: numberOrNull(values.venturiMaxPressureMpa),
      minMotiveFlowLph: numberOrNull(values.venturiMinMotiveLph),
      maxMotiveFlowLph: numberOrNull(values.venturiMaxMotiveLph),
      curveP1Mpa: numberOrNull(values.venturiCurveP1Mpa),
      curveP2Mpa: numberOrNull(values.venturiCurveP2Mpa),
      curveMotiveFlowLph: numberOrNull(values.venturiCurveMotiveLph),
      curveSuctionFlowLph: numberOrNull(values.venturiCurveSuctionLph),
      curvePointConfirmed: booleanValue(values.venturiCurveConfirmed)
    },
    fertigation: {
      waterConcentration: numberOrNull(values.waterConcentration),
      motherConcentration: numberOrNull(values.motherConcentration),
      targetConcentration: numberOrNull(values.targetConcentration),
      durationMinutes: numberOrNull(values.fertigationDurationMinutes),
      unusableResidualL: numberOrNull(values.unusableResidualL),
      measuredSuctionLph: numberOrNull(values.measuredSuctionLph)
    },
    flushing: {
      actualFlushFlowLph: numberOrNull(values.actualFlushFlowLph),
      collectionMinutes: numberOrNull(values.collectionMinutes)
    },
    uniformity_samples: samples
  };
}

function setBaselineValues(sheet, systemData) {
  const mainPipe = systemData.pipes.find((pipe) => pipe.pipe_id === "PIPE-MAIN");
  const lateralPipe = systemData.pipes.find(
    (pipe) => pipe.pipe_id === "PIPE-LATERAL"
  );
  const filter = systemData.filters[0];
  const rows = [
    ["设计版本", systemData.metadata.design_revision, "来自接口规格工作簿"],
    ["核对日期", systemData.metadata.checked_date, "事实层核对日期"],
    ["权威拓扑", "水源→倒流防止器→过滤器→双路控制器→A/B止回后合流→减压→主管", "B路完整串联文丘里"],
    ["主水路候选接口", "G1/2（俗称4分）", "内牙/外牙及密封待厂家确认"],
    ["测压口候选接口", "G1/4（俗称2分）", "P0–P3端口形式待厂家确认"],
    ["过滤等级", filter ? `${filter.mesh || "—"}目` : "—", filter && filter.nominal_micron ? `${filter.nominal_micron} μm` : "厂家标称微米待确认"],
    ["主管", mainPipe ? `${mainPipe.inner_diameter_mm}/${mainPipe.outer_diameter_mm} mm` : "—", "内径/外径"],
    ["支管", lateralPipe ? `${lateralPipe.inner_diameter_mm}/${lateralPipe.outer_diameter_mm} mm` : "—", "内径/外径"],
    ["P0", "过滤器后、控制器前", "共用上游动态压力"],
    ["P1", "文丘里入口前", "B路入口压力"],
    ["P2", "文丘里出口后、B止回阀前", "与P1计算文丘里压差"],
    ["P3", "减压阀后、主管前", "验证滴头可用压力"]
  ];
  rows.forEach((row, index) => {
    const excelRow = 5 + index;
    sheet.getCell(excelRow, 1).value = row[0];
    sheet.getCell(excelRow, 2).value = row[1];
    sheet.getCell(excelRow, 3).value = row[2];
  });
}

function assignDefinedNames(workbook, inputSheet) {
  const existingNames = new Set(
    (workbook.definedNames.model || []).map((item) => item.name)
  );
  for (let row = 5; row <= inputSheet.rowCount; row += 1) {
    const key = inputSheet.getCell(row, 1).value;
    if (!key || existingNames.has(String(key))) {
      continue;
    }
    workbook.definedNames.add(`'${INPUT_SHEET}'!$C$${row}`, String(key));
  }
}

function normalizeInputFormats(inputSheet) {
  const textKeys = new Set([
    "scenarioName",
    "scenarioDate",
    "operator",
    "venturiModel",
    "venturiSourceReference",
  ]);
  for (let row = 5; row <= inputSheet.rowCount; row += 1) {
    const key = inputSheet.getCell(row, 1).value;
    if (!key) {
      continue;
    }
    const valueCell = inputSheet.getCell(row, 3);
    let numberFormat;
    if (textKeys.has(String(key))) {
      numberFormat = "@";
    } else if (key === "venturiCurveConfirmed") {
      // A blank cell means "not yet confirmed" and avoids presenting FALSE
      // as if it were a measured field value. TRUE is preserved explicitly.
      valueCell.value = booleanValue(valueCell.value) ? true : null;
      numberFormat = "General";
    } else if (key === "emitterCount") {
      numberFormat = "0";
    } else {
      numberFormat = "0.000000";
    }
    // Artifact-authored input cells intentionally share a base style. Clone
    // the style object before changing the number format so a later numeric
    // cell cannot mutate an earlier text/boolean cell through that shared
    // reference.
    valueCell.style = { ...valueCell.style, numFmt: numberFormat };
  }
}

function normalizeWorkbookFormulas(workbook, inputSheet) {
  const venturiSheet = workbook.worksheets.find((sheet) =>
    sheet.name.startsWith("05_")
  );
  if (!venturiSheet) {
    return;
  }
  const confirmed = booleanValue(
    readInputMap(inputSheet).venturiCurveConfirmed
  );
  venturiSheet.getCell("B18").value = {
    formula:
      'IF(B17<>TRUE,"待厂家确认",IF(OR(B5="",B6="",B10="",B11="",C12="",D12="",D13="",D14="",D15="",D16=""),"待确认",IF(OR(B5>B11,B10<C12,B10>D12,B9>D16),"不适用","已计算")))',
    result: confirmed ? "待确认" : "待厂家确认",
  };
}

function baselineHash(sheet) {
  const values = [];
  for (let row = 5; row <= 16; row += 1) {
    values.push([
      normalizeCellValue(sheet.getCell(row, 1).value),
      normalizeCellValue(sheet.getCell(row, 2).value),
      normalizeCellValue(sheet.getCell(row, 3).value),
    ]);
  }
  return crypto.createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

function validateManagedBaseline(workbook) {
  const sheet = workbook.getWorksheet(BASELINE_SHEET);
  if (!sheet) {
    throw new Error(`工程计算工作簿缺少“${BASELINE_SHEET}”工作表。`);
  }
  const meta = workbook.getWorksheet(META_SHEET);
  const marker = normalizeCellValue(
    meta ? meta.getCell("A1").value : sheet.getCell("G2").value
  );
  const storedHash = normalizeCellValue(
    meta ? meta.getCell("A2").value : sheet.getCell("G3").value
  );
  if (marker && marker !== MANAGED_BASELINE_MARKER) {
    throw new Error("工程计算工作簿包含未知的设计基准管理标记。");
  }
  if (marker === MANAGED_BASELINE_MARKER && storedHash) {
    const actualHash = baselineHash(sheet);
    if (actualHash !== storedHash) {
      throw new Error(
        "“01_当前设计基准”的锁定区域已被人工修改；请恢复该页或从下载页取得当前版本后再同步。"
      );
    }
  }
  return sheet;
}

async function protectWorkbook(workbook, inputSheet) {
  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.protection = { locked: true };
      });
    });
  }
  for (let row = 5; row <= inputSheet.rowCount; row += 1) {
    const key = inputSheet.getCell(row, 1).value;
    if (key) {
      inputSheet.getCell(row, 3).protection = { locked: false };
    }
  }
  for (const sheet of workbook.worksheets) {
    if (sheet.sheetProtection) {
      sheet.unprotect();
    }
    await sheet.protect("", {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertRows: false,
      deleteRows: false,
    });
  }
}

async function loadCalculationWorkbook(workbookPath, designRevision) {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`找不到工程计算工作簿：${workbookPath}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const inputSheet = workbook.getWorksheet(INPUT_SHEET);
  if (!inputSheet) {
    throw new Error(`工程计算工作簿缺少“${INPUT_SHEET}”工作表。`);
  }
  const schemaCell = workbook.getWorksheet("00_使用说明")?.getCell("B5").value;
  if (schemaCell !== WORKBOOK_SCHEMA_VERSION) {
    throw new Error(
      `未知工程计算工作簿版本：${schemaCell || "空"}；期望 ${WORKBOOK_SCHEMA_VERSION}。`
    );
  }
  validateManagedBaseline(workbook);
  return {
    workbook,
    inputSheet,
    values: readInputMap(inputSheet),
    calculationCase: buildCaseFromInputs(
      readInputMap(inputSheet),
      designRevision
    )
  };
}

async function updateCalculationWorkbook(workbookPath, systemData) {
  const loaded = await loadCalculationWorkbook(
    workbookPath,
    systemData.metadata.design_revision
  );
  const baseline = loaded.workbook.getWorksheet(BASELINE_SHEET);
  setBaselineValues(baseline, systemData);
  baseline.getCell("G2").value = null;
  baseline.getCell("G3").value = null;
  baseline.getColumn(7).hidden = false;
  const meta =
    loaded.workbook.getWorksheet(META_SHEET) ||
    loaded.workbook.addWorksheet(META_SHEET);
  meta.getCell("A1").value = MANAGED_BASELINE_MARKER;
  meta.getCell("A2").value = baselineHash(baseline);
  meta.getCell("A3").value = systemData.metadata.design_revision;
  meta.state = "veryHidden";
  assignDefinedNames(loaded.workbook, loaded.inputSheet);
  await protectWorkbook(loaded.workbook, loaded.inputSheet);
  // Apply number formats after worksheet protection. ExcelJS rebuilds cell
  // styles while protecting sheets, so formatting before this point can be
  // replaced by the original numeric style.
  normalizeInputFormats(loaded.inputSheet);
  normalizeWorkbookFormulas(loaded.workbook, loaded.inputSheet);
  loaded.workbook.calcProperties.fullCalcOnLoad = true;
  loaded.workbook.calcProperties.forceFullCalc = true;
  loaded.workbook.calcProperties.calcMode = "auto";
  loaded.workbook.creator = "Codex";
  loaded.workbook.modified = new Date("2026-07-24T00:00:00+08:00");
  await loaded.workbook.xlsx.writeFile(workbookPath);
  return buildCaseFromInputs(
    readInputMap(loaded.inputSheet),
    systemData.metadata.design_revision
  );
}

module.exports = {
  BASELINE_SHEET,
  INPUT_SHEET,
  WORKBOOK_SCHEMA_VERSION,
  buildCaseFromInputs,
  loadCalculationWorkbook,
  readInputMap,
  updateCalculationWorkbook
};
