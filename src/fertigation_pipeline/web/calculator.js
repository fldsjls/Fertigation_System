// Source module. Published copies under docs/javascripts/generated are build artifacts.
(function () {
  "use strict";

  const STORAGE_KEY = "fertigation-calculator.v1";
  const STORAGE_VERSION = 1;
  const STATUS_LABELS = {
    calculated: "已计算",
    pending: "待确认",
    "not-applicable": "不适用",
  };
  const STATUS_PRIORITY = {
    calculated: 0,
    pending: 1,
    "not-applicable": 2,
  };

  function initializeCalculator() {
    const app = document.getElementById("fertigation-calculator");
    const core = window.FertigationCalculatorCore;

    if (!app || !core || app.dataset.initialized === "true") {
      return;
    }

    app.dataset.initialized = "true";
    const form = app.querySelector("#fertigation-calculator-form");
    const sampleGrid = app.querySelector("#calc-sample-grid");
    const saveStatus = app.querySelector("#calc-save-status");
    const importInput = app.querySelector("[data-calc-import]");
    let saveTimer = null;
    let currentDesignRevision = "unknown";

    function field(name) {
      return form.elements.namedItem(name);
    }

    function rawValue(name) {
      const element = field(name);
      return element ? element.value : "";
    }

    function numberValue(name) {
      const value = rawValue(name);
      if (value === "") {
        return null;
      }
      const number = Number(value);
      return Number.isFinite(number) ? number : NaN;
    }

    function textValue(name) {
      const value = rawValue(name);
      return value ? value.trim() : "";
    }

    function checkboxValue(name) {
      const element = field(name);
      return Boolean(element && element.checked);
    }

    function setField(name, value) {
      const element = field(name);
      if (!element) {
        return;
      }
      if (element.type === "checkbox") {
        element.checked = Boolean(value);
      } else {
        element.value = value === null || value === undefined ? "" : String(value);
      }
    }

    function sanitizeSampleCount(value) {
      const count = Number(value);
      if (!Number.isInteger(count) || count < 4 || count > 64 || count % 4 !== 0) {
        return 4;
      }
      return count;
    }

    function buildSampleInputs(count, values) {
      const safeCount = sanitizeSampleCount(count);
      const previousValues =
        values ||
        Array.from(sampleGrid.querySelectorAll(".calc-sample-input")).map(function (
          input
        ) {
          return input.value;
        });
      sampleGrid.replaceChildren();

      for (let index = 0; index < safeCount; index += 1) {
        const label = document.createElement("label");
        label.className = "calc-field calc-sample-field";

        const title = document.createElement("span");
        title.textContent = "滴头 " + (index + 1);

        const inputShell = document.createElement("span");
        inputShell.className = "calc-input";

        const input = document.createElement("input");
        input.className = "calc-sample-input";
        input.name = "sampleVolume" + index;
        input.type = "number";
        input.min = "0";
        input.step = "any";
        input.inputMode = "decimal";
        input.autocomplete = "off";
        input.value =
          previousValues[index] === null || previousValues[index] === undefined
            ? ""
            : String(previousValues[index]);

        const unit = document.createElement("span");
        unit.textContent = "mL";
        inputShell.append(input, unit);
        label.append(title, inputShell);
        sampleGrid.append(label);
      }

      setField("sampleCount", safeCount);
    }

    function statusClass(status) {
      return "calc-status calc-status--" + status;
    }

    function formatNumber(value, unit) {
      if (!Number.isFinite(value)) {
        return "—";
      }

      let maximumFractionDigits = 3;
      let minimumFractionDigits = 0;

      if (unit === "MPa") {
        maximumFractionDigits = 6;
      } else if (unit === "m/s") {
        maximumFractionDigits = 4;
      } else if (unit === "%") {
        maximumFractionDigits = 1;
      } else if (unit === "min") {
        maximumFractionDigits = 2;
      } else if (unit === "Re") {
        maximumFractionDigits = 0;
      } else if (unit === "f") {
        maximumFractionDigits = 5;
      }

      const absolute = Math.abs(value);
      if (absolute > 0 && absolute < 0.000001) {
        return value.toExponential(3);
      }

      return new Intl.NumberFormat("zh-CN", {
        minimumFractionDigits: minimumFractionDigits,
        maximumFractionDigits: maximumFractionDigits,
      }).format(value);
    }

    function displayValue(result) {
      if (!result || result.value === null || !Number.isFinite(result.value)) {
        return "—";
      }
      const formatted = formatNumber(result.value, result.unit);
      return result.unit ? formatted + " " + result.unit : formatted;
    }

    function writeResult(name, result, options) {
      const container = app.querySelector('[data-result="' + name + '"]');
      if (!container || !result) {
        return;
      }

      const status = options && options.status ? options.status : result.status;
      const reason = options && options.reason ? options.reason : result.reason;
      const value = container.querySelector(".calc-result__value");
      const badge = container.querySelector(".calc-status");
      const reasonElement = container.querySelector(".calc-result__reason");

      container.dataset.status = status;
      badge.className = statusClass(status);
      badge.textContent = STATUS_LABELS[status];
      value.textContent =
        options && Object.prototype.hasOwnProperty.call(options, "text")
          ? options.text
          : displayValue(result);
      reasonElement.textContent = reason || result.formula || "";
    }

    function writePipe(prefix, pipe, flowLph) {
      const row = app.querySelector(
        '[data-pipe-output="' + prefix + '.velocity"]'
      ).closest("tr");
      row.dataset.status = pipe.status;

      function set(suffix, text) {
        const cell = app.querySelector(
          '[data-pipe-output="' + prefix + "." + suffix + '"]'
        );
        cell.textContent = text;
        cell.title = pipe.reason || "";
      }

      set(
        "velocity",
        pipe.values.velocityMs === null
          ? "—"
          : formatNumber(pipe.values.velocityMs, "m/s") + " m/s"
      );
      set(
        "reynolds",
        pipe.values.reynolds === null
          ? "—"
          : formatNumber(pipe.values.reynolds, "Re") +
              " / " +
              (pipe.regime || "待确认")
      );
      set(
        "friction",
        pipe.values.frictionFactor === null
          ? "—"
          : formatNumber(pipe.values.frictionFactor, "f")
      );
      set(
        "lineLoss",
        pipe.values.lineLossMpa === null
          ? "—"
          : formatNumber(pipe.values.lineLossMpa, "MPa") + " MPa"
      );
      set(
        "localLoss",
        pipe.values.localLossMpa === null
          ? "—"
          : formatNumber(pipe.values.localLossMpa, "MPa") + " MPa"
      );
      set(
        "totalLoss",
        pipe.values.totalLossMpa === null
          ? "—"
          : formatNumber(pipe.values.totalLossMpa, "MPa") + " MPa"
      );
      set(
        "volume",
        pipe.values.volumeL === null
          ? "—"
          : formatNumber(pipe.values.volumeL, "L") + " L"
      );
      row.dataset.flow = Number.isFinite(flowLph) ? String(flowLph) : "";
    }

    function writeBudgetRow(name, result) {
      const row = app.querySelector('[data-budget-row="' + name + '"]');
      const cells = row.querySelectorAll("td");
      row.dataset.status = result.status;
      cells[0].textContent =
        result.requiredMpa === null
          ? "—"
          : formatNumber(result.requiredMpa, "MPa") + " MPa";
      cells[1].textContent =
        result.marginMpa === null
          ? "—"
          : formatNumber(result.marginMpa, "MPa") + " MPa";
      cells[2].replaceChildren();
      const badge = document.createElement("span");
      badge.className = statusClass(result.status);
      badge.textContent = STATUS_LABELS[result.status];
      badge.title = result.reason;
      cells[2].append(badge);
    }

    function combineStatus() {
      return Array.from(arguments).reduce(function (current, status) {
        return STATUS_PRIORITY[status] > STATUS_PRIORITY[current] ? status : current;
      }, "calculated");
    }

    function writeSummary(name, status, reason) {
      const summary = app.querySelector('[data-summary="' + name + '"]');
      const badge = summary.querySelector(".calc-status");
      summary.dataset.status = status;
      badge.className = statusClass(status);
      badge.textContent = STATUS_LABELS[status];
      summary.querySelector("small").textContent = reason;
    }

    function collectInputs() {
      const sampleVolumes = Array.from(
        sampleGrid.querySelectorAll(".calc-sample-input")
      ).map(function (input) {
        if (input.value === "") {
          return null;
        }
        const number = Number(input.value);
        return Number.isFinite(number) ? number : NaN;
      });

      return {
        hydraulics: {
          system: {
            emitterCount: numberValue("emitterCount"),
            emitterFlowLph: numberValue("emitterFlowLph"),
          },
          water: {
            densityKgM3: numberValue("densityKgM3"),
            kinematicViscosityM2s: numberValue("kinematicViscosityM2s"),
          },
          mainPipe: {
            innerDiameterMm: numberValue("mainInnerDiameterMm"),
            lengthM: numberValue("mainLengthM"),
            roughnessMm: numberValue("mainRoughnessMm"),
            localK: numberValue("mainLocalK"),
          },
          lateralPipe: {
            innerDiameterMm: numberValue("lateralInnerDiameterMm"),
            lengthM: numberValue("lateralLengthM"),
            roughnessMm: numberValue("lateralRoughnessMm"),
            localK: numberValue("lateralLocalK"),
          },
        },
        emitterPressure: {
          p3Mpa: numberValue("fieldP3Mpa"),
          downstreamLossMpa: numberValue("downstreamLossMpa"),
          heightDifferenceM: numberValue("heightDifferenceM"),
          densityKgM3: numberValue("densityKgM3"),
          emitterMinPressureMpa: numberValue("emitterMinPressureMpa"),
          emitterMaxPressureMpa: numberValue("emitterMaxPressureMpa"),
        },
        pressureBudget: {
          sourceDynamicMpa: numberValue("sourceDynamicMpa"),
          regulatorSetMpa: numberValue("regulatorSetMpa"),
          regulatorMinDifferentialMpa: numberValue(
            "regulatorMinDifferentialMpa"
          ),
          backflowLossMpa: numberValue("backflowLossMpa"),
          filterCleanLossMpa: numberValue("filterCleanLossMpa"),
          filterDirtyLossMpa: numberValue("filterDirtyLossMpa"),
          controllerALossMpa: numberValue("controllerALossMpa"),
          checkALossMpa: numberValue("checkALossMpa"),
          fittingsALossMpa: numberValue("fittingsALossMpa"),
          controllerBLossMpa: numberValue("controllerBLossMpa"),
          venturiLossMpa: numberValue("venturiLossMpa"),
          checkBLossMpa: numberValue("checkBLossMpa"),
          fittingsBLossMpa: numberValue("fittingsBLossMpa"),
        },
        fertigation: {
          waterConcentration: numberValue("waterConcentration"),
          motherConcentration: numberValue("motherConcentration"),
          targetConcentration: numberValue("targetConcentration"),
          durationMinutes: numberValue("fertigationDurationMinutes"),
          unusableResidualL: numberValue("unusableResidualL"),
          measuredSuctionLph: numberValue("measuredSuctionLph"),
        },
        venturi: {
          model: textValue("venturiModel"),
          sourceReference: textValue("venturiSourceReference"),
          maxPressureMpa: numberValue("venturiMaxPressureMpa"),
          minMotiveFlowLph: numberValue("venturiMinMotiveLph"),
          maxMotiveFlowLph: numberValue("venturiMaxMotiveLph"),
          curveP1Mpa: numberValue("venturiCurveP1Mpa"),
          curveP2Mpa: numberValue("venturiCurveP2Mpa"),
          curveMotiveFlowLph: numberValue("venturiCurveMotiveLph"),
          curveSuctionFlowLph: numberValue("venturiCurveSuctionLph"),
          actualP1Mpa: numberValue("fieldP1Mpa"),
          actualP2Mpa: numberValue("fieldP2Mpa"),
          curvePointConfirmed: checkboxValue("venturiCurveConfirmed"),
        },
        flush: {
          actualFlushFlowLph: numberValue("actualFlushFlowLph"),
        },
        uniformity: {
          collectionMinutes: numberValue("collectionMinutes"),
          volumesMl: sampleVolumes,
        },
      };
    }

    function calculateAndRender(shouldSave) {
      const inputs = collectInputs();
      const hydraulics = core.calculateHydraulics(inputs.hydraulics);
      const mainLoss = hydraulics.main.values.totalLossMpa;
      const lateralLoss = hydraulics.lateral.values.totalLossMpa;
      const emitterPressure = core.calculateEmitterPressure({
        ...inputs.emitterPressure,
        mainLossMpa: mainLoss,
        lateralLossMpa: lateralLoss,
      });
      const pressureBudget = core.calculatePressureBudget(inputs.pressureBudget);
      const fertigation = core.calculateFertigation({
        ...inputs.fertigation,
        designFlowLph: hydraulics.systemFlow.designFlowLph.value,
      });
      const venturi = core.calculateVenturi({
        ...inputs.venturi,
        motiveFlowLph: fertigation.motiveFlowLph.value,
        targetSuctionLph: fertigation.targetSuctionLph.value,
      });
      const flush = core.calculateFlush({
        totalVolumeL: hydraulics.totalVolumeL.value,
        actualFlushFlowLph: inputs.flush.actualFlushFlowLph,
      });
      const uniformity = core.calculateUniformity(inputs.uniformity);

      writeResult("designFlow", hydraulics.systemFlow.designFlowLph);
      writePipe(
        "main",
        hydraulics.main,
        hydraulics.systemFlow.designFlowLph.value
      );
      writePipe(
        "lateral",
        hydraulics.lateral,
        numberValue("emitterFlowLph")
      );
      writeResult("totalVolume", hydraulics.totalVolumeL);
      writeResult("emitterPressure", emitterPressure.emitterPressureMpa);
      writeResult("heightLoss", emitterPressure.heightLossMpa);

      Object.keys(pressureBudget.results).forEach(function (key) {
        writeBudgetRow(key, pressureBudget.results[key]);
      });

      writeResult("targetSuction", fertigation.targetSuctionLph);
      writeResult("motiveFlow", fertigation.motiveFlowLph);
      writeResult("motherVolume", fertigation.motherVolumeL);
      writeResult("bucketMinimum", fertigation.bucketMinimumL);
      writeResult(
        "measuredSuctionDifference",
        fertigation.measuredDifferenceLph
      );

      const venturiDetail = [
        "实测压差 " + displayValue(venturi.actualDifferentialMpa),
        "曲线压差 " + displayValue(venturi.curveDifferentialMpa),
        "驱动流量差 " + displayValue(venturi.motiveDifferenceLph),
      ].join("；");
      writeResult("venturiStatus", venturi.suctionMarginLph, {
        status: venturi.status,
        text: STATUS_LABELS[venturi.status],
        reason: venturi.reason + "；" + venturiDetail,
      });
      writeResult("venturiSuctionMargin", venturi.suctionMarginLph);

      writeResult("flushMinutes", flush.flushMinutes);
      writeResult("uniformityAverage", uniformity.averageLph);
      writeResult("uniformityLowest", uniformity.lowestAverageLph);
      writeResult("dulq", uniformity.dulqPercent);

      const hydraulicStatus = combineStatus(
        hydraulics.status,
        emitterPressure.status,
        pressureBudget.status
      );
      const fertigationStatus = combineStatus(
        fertigation.status,
        venturi.status
      );
      const fieldStatus = combineStatus(flush.status, uniformity.status);
      writeSummary(
        "hydraulics",
        hydraulicStatus,
        hydraulicStatus === "calculated"
          ? "流量、管损和压力预算均已计算"
          : hydraulicStatus === "not-applicable"
            ? "至少一项输入或压力条件不适用"
            : "仍缺少管路、压力或厂家压损数据"
      );
      writeSummary(
        "fertigation",
        fertigationStatus,
        fertigationStatus === "calculated"
          ? "质量平衡和厂家工况资料已计算"
          : fertigationStatus === "not-applicable"
            ? "浓度或厂家工况明确超出范围"
            : "仍缺少浓度、运行时间或厂家工况"
      );
      writeSummary(
        "field",
        fieldStatus,
        fieldStatus === "calculated"
          ? "冲洗与滴头均匀度均已计算"
          : fieldStatus === "not-applicable"
            ? "现场采样输入不符合计算要求"
            : "仍缺少冲洗流量或滴头采样"
      );

      if (shouldSave !== false) {
        scheduleSave();
      }
    }

    function serializeInputs() {
      const inputs = {};
      form.querySelectorAll("input[name]").forEach(function (input) {
        inputs[input.name] =
          input.type === "checkbox" ? input.checked : input.value;
      });
      return inputs;
    }

    function numericOrNull(value) {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }

    function localDateStamp(date) {
      const current = date || new Date();
      const year = String(current.getFullYear());
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    }

    function inputsToCase() {
      const values = serializeInputs();
      const samples = [];
      const count = sanitizeSampleCount(values.sampleCount);
      for (let index = 0; index < count; index += 1) {
        const sample = numericOrNull(values["sampleVolume" + index]);
        if (sample !== null) {
          samples.push(sample);
        }
      }
      return {
        schema_version: "1.0.0",
        design_revision: currentDesignRevision,
        scenario: {
          name: "网页计算工况",
          date: localDateStamp(),
          operator: "",
        },
        system: {
          emitterCount: numericOrNull(values.emitterCount),
          emitterFlowLph: numericOrNull(values.emitterFlowLph),
        },
        water: {
          densityKgM3: numericOrNull(values.densityKgM3),
          kinematicViscosityM2s: numericOrNull(values.kinematicViscosityM2s),
        },
        pipes: {
          main: {
            innerDiameterMm: numericOrNull(values.mainInnerDiameterMm),
            outerDiameterMm: null,
            lengthM: numericOrNull(values.mainLengthM),
            roughnessMm: numericOrNull(values.mainRoughnessMm),
            localK: numericOrNull(values.mainLocalK),
          },
          lateral: {
            innerDiameterMm: numericOrNull(values.lateralInnerDiameterMm),
            outerDiameterMm: null,
            lengthM: numericOrNull(values.lateralLengthM),
            roughnessMm: numericOrNull(values.lateralRoughnessMm),
            localK: numericOrNull(values.lateralLocalK),
          },
        },
        pressure_points: {
          sourceDynamicMpa: numericOrNull(values.sourceDynamicMpa),
          P0: numericOrNull(values.fieldP0Mpa),
          P1: numericOrNull(values.fieldP1Mpa),
          P2: numericOrNull(values.fieldP2Mpa),
          P3: numericOrNull(values.fieldP3Mpa),
          heightDifferenceM: numericOrNull(values.heightDifferenceM),
          downstreamLossMpa: numericOrNull(values.downstreamLossMpa),
          emitterMinPressureMpa: numericOrNull(values.emitterMinPressureMpa),
          emitterMaxPressureMpa: numericOrNull(values.emitterMaxPressureMpa),
        },
        component_losses: {
          regulatorSetMpa: numericOrNull(values.regulatorSetMpa),
          regulatorMinDifferentialMpa: numericOrNull(
            values.regulatorMinDifferentialMpa
          ),
          backflowLossMpa: numericOrNull(values.backflowLossMpa),
          filterCleanLossMpa: numericOrNull(values.filterCleanLossMpa),
          filterDirtyLossMpa: numericOrNull(values.filterDirtyLossMpa),
          controllerALossMpa: numericOrNull(values.controllerALossMpa),
          checkALossMpa: numericOrNull(values.checkALossMpa),
          fittingsALossMpa: numericOrNull(values.fittingsALossMpa),
          controllerBLossMpa: numericOrNull(values.controllerBLossMpa),
          venturiLossMpa: numericOrNull(values.venturiLossMpa),
          checkBLossMpa: numericOrNull(values.checkBLossMpa),
          fittingsBLossMpa: numericOrNull(values.fittingsBLossMpa),
        },
        venturi: {
          model: values.venturiModel || "",
          sourceReference: values.venturiSourceReference || "",
          maxPressureMpa: numericOrNull(values.venturiMaxPressureMpa),
          minMotiveFlowLph: numericOrNull(values.venturiMinMotiveLph),
          maxMotiveFlowLph: numericOrNull(values.venturiMaxMotiveLph),
          curveP1Mpa: numericOrNull(values.venturiCurveP1Mpa),
          curveP2Mpa: numericOrNull(values.venturiCurveP2Mpa),
          curveMotiveFlowLph: numericOrNull(values.venturiCurveMotiveLph),
          curveSuctionFlowLph: numericOrNull(values.venturiCurveSuctionLph),
          curvePointConfirmed: Boolean(values.venturiCurveConfirmed),
        },
        fertigation: {
          waterConcentration: numericOrNull(values.waterConcentration),
          motherConcentration: numericOrNull(values.motherConcentration),
          targetConcentration: numericOrNull(values.targetConcentration),
          durationMinutes: numericOrNull(values.fertigationDurationMinutes),
          unusableResidualL: numericOrNull(values.unusableResidualL),
          measuredSuctionLph: numericOrNull(values.measuredSuctionLph),
        },
        flushing: {
          actualFlushFlowLph: numericOrNull(values.actualFlushFlowLph),
          collectionMinutes: numericOrNull(values.collectionMinutes),
        },
        uniformity_samples: samples,
      };
    }

    function caseToInputs(calculationCase) {
      const pressure = calculationCase.pressure_points || {};
      const losses = calculationCase.component_losses || {};
      const venturi = calculationCase.venturi || {};
      const fertigation = calculationCase.fertigation || {};
      const flushing = calculationCase.flushing || {};
      const main = (calculationCase.pipes && calculationCase.pipes.main) || {};
      const lateral =
        (calculationCase.pipes && calculationCase.pipes.lateral) || {};
      return {
        emitterCount: calculationCase.system && calculationCase.system.emitterCount,
        emitterFlowLph:
          calculationCase.system && calculationCase.system.emitterFlowLph,
        densityKgM3:
          calculationCase.water && calculationCase.water.densityKgM3,
        kinematicViscosityM2s:
          calculationCase.water &&
          calculationCase.water.kinematicViscosityM2s,
        mainInnerDiameterMm: main.innerDiameterMm,
        mainLengthM: main.lengthM,
        mainRoughnessMm: main.roughnessMm,
        mainLocalK: main.localK,
        lateralInnerDiameterMm: lateral.innerDiameterMm,
        lateralLengthM: lateral.lengthM,
        lateralRoughnessMm: lateral.roughnessMm,
        lateralLocalK: lateral.localK,
        sourceDynamicMpa: pressure.sourceDynamicMpa,
        fieldP0Mpa: pressure.P0,
        fieldP1Mpa: pressure.P1,
        fieldP2Mpa: pressure.P2,
        fieldP3Mpa: pressure.P3,
        heightDifferenceM: pressure.heightDifferenceM,
        downstreamLossMpa: pressure.downstreamLossMpa,
        emitterMinPressureMpa: pressure.emitterMinPressureMpa,
        emitterMaxPressureMpa: pressure.emitterMaxPressureMpa,
        regulatorSetMpa: losses.regulatorSetMpa,
        regulatorMinDifferentialMpa: losses.regulatorMinDifferentialMpa,
        backflowLossMpa: losses.backflowLossMpa,
        filterCleanLossMpa: losses.filterCleanLossMpa,
        filterDirtyLossMpa: losses.filterDirtyLossMpa,
        controllerALossMpa: losses.controllerALossMpa,
        checkALossMpa: losses.checkALossMpa,
        fittingsALossMpa: losses.fittingsALossMpa,
        controllerBLossMpa: losses.controllerBLossMpa,
        venturiLossMpa: losses.venturiLossMpa,
        checkBLossMpa: losses.checkBLossMpa,
        fittingsBLossMpa: losses.fittingsBLossMpa,
        venturiModel: venturi.model,
        venturiSourceReference: venturi.sourceReference,
        venturiMaxPressureMpa: venturi.maxPressureMpa,
        venturiMinMotiveLph: venturi.minMotiveFlowLph,
        venturiMaxMotiveLph: venturi.maxMotiveFlowLph,
        venturiCurveP1Mpa: venturi.curveP1Mpa,
        venturiCurveP2Mpa: venturi.curveP2Mpa,
        venturiCurveMotiveLph: venturi.curveMotiveFlowLph,
        venturiCurveSuctionLph: venturi.curveSuctionFlowLph,
        venturiCurveConfirmed: venturi.curvePointConfirmed,
        waterConcentration: fertigation.waterConcentration,
        motherConcentration: fertigation.motherConcentration,
        targetConcentration: fertigation.targetConcentration,
        fertigationDurationMinutes: fertigation.durationMinutes,
        unusableResidualL: fertigation.unusableResidualL,
        measuredSuctionLph: fertigation.measuredSuctionLph,
        actualFlushFlowLph: flushing.actualFlushFlowLph,
        collectionMinutes: flushing.collectionMinutes,
      };
    }

    function applyCase(calculationCase, sourceLabel) {
      if (!calculationCase || calculationCase.schema_version !== "1.0.0") {
        throw new Error("工况JSON版本不受支持。");
      }
      const samples = Array.isArray(calculationCase.uniformity_samples)
        ? calculationCase.uniformity_samples
        : [];
      const count = Math.max(4, Math.ceil(samples.length / 4) * 4);
      resetFormToDefaults();
      buildSampleInputs(count, samples);
      const inputs = caseToInputs(calculationCase);
      Object.keys(inputs).forEach(function (name) {
        setField(name, inputs[name]);
      });
      currentDesignRevision =
        calculationCase.design_revision || currentDesignRevision;
      calculateAndRender();
      updateSaveStatus("已载入" + sourceLabel, false);
    }

    async function loadCurrentDesign() {
      if (!app.dataset.caseUrl) {
        updateSaveStatus("当前页面未配置设计工况地址", true);
        return;
      }
      if (!window.confirm("载入当前设计将覆盖网页中的现有输入。是否继续？")) {
        return;
      }
      try {
        const response = await fetch(app.dataset.caseUrl, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        applyCase(await response.json(), "当前设计");
      } catch (error) {
        updateSaveStatus("当前设计载入失败：" + error.message, true);
      }
    }

    function exportCase() {
      const data = JSON.stringify(inputsToCase(), null, 2);
      const blob = new Blob([data], { type: "application/json;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download =
        "fertigation-case-" + localDateStamp() + ".json";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      updateSaveStatus("工况JSON已导出", false);
    }

    async function importCaseFile(file) {
      try {
        const calculationCase = JSON.parse(await file.text());
        applyCase(calculationCase, "工况JSON");
      } catch (error) {
        updateSaveStatus("工况导入失败：" + error.message, true);
      } finally {
        importInput.value = "";
      }
    }

    function updateSaveStatus(message, isError) {
      saveStatus.textContent = message;
      saveStatus.dataset.error = isError ? "true" : "false";
    }

    function saveInputs() {
      try {
        const savedAt = new Date();
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: STORAGE_VERSION,
            savedAt: savedAt.toISOString(),
            inputs: serializeInputs(),
          })
        );
        updateSaveStatus(
          "已自动保存 " +
            savedAt.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          false
        );
      } catch (error) {
        updateSaveStatus("本机保存不可用，本次计算仍可继续", true);
      }
    }

    function scheduleSave() {
      window.clearTimeout(saveTimer);
      updateSaveStatus("正在保存…", false);
      saveTimer = window.setTimeout(saveInputs, 180);
    }

    function restoreInputs() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          buildSampleInputs(4);
          return false;
        }

        const state = JSON.parse(raw);
        if (
          !state ||
          state.version !== STORAGE_VERSION ||
          !state.inputs ||
          typeof state.inputs !== "object"
        ) {
          localStorage.removeItem(STORAGE_KEY);
          buildSampleInputs(4);
          return false;
        }

        const sampleCount = sanitizeSampleCount(state.inputs.sampleCount);
        buildSampleInputs(sampleCount);
        Object.keys(state.inputs).forEach(function (name) {
          setField(name, state.inputs[name]);
        });
        const savedTime = new Date(state.savedAt);
        updateSaveStatus(
          Number.isNaN(savedTime.getTime())
            ? "已恢复本机输入"
            : "已恢复 " +
                savedTime.toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }) +
                " 的输入",
          false
        );
        return true;
      } catch (error) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (ignored) {
          // The calculator remains usable even if storage is blocked.
        }
        buildSampleInputs(4);
        updateSaveStatus("已忽略损坏的本机记录", true);
        return false;
      }
    }

    function resetFormToDefaults() {
      form.reset();
      buildSampleInputs(4, ["", "", "", ""]);
      setField("densityKgM3", 1000);
      setField("kinematicViscosityM2s", 0.000001004);
    }

    function loadExample() {
      if (
        !window.confirm(
          "载入四滴头透明算例将覆盖当前工作表输入。是否继续？"
        )
      ) {
        return;
      }

      resetFormToDefaults();
      const example = {
        emitterCount: 4,
        emitterFlowLph: 2,
        mainInnerDiameterMm: 9,
        mainLengthM: 10,
        mainRoughnessMm: 0,
        mainLocalK: 0,
        lateralInnerDiameterMm: 3,
        lateralLengthM: 1,
        lateralRoughnessMm: 0,
        lateralLocalK: 0,
        actualFlushFlowLph: 8,
      };
      Object.keys(example).forEach(function (name) {
        setField(name, example[name]);
      });
      calculateAndRender();
      app.querySelector('[name="emitterCount"]').focus();
    }

    function clearForm() {
      if (!window.confirm("清空全部现场输入，只保留 20 ℃清水参数。是否继续？")) {
        return;
      }

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (ignored) {
        // Clearing the form itself must not depend on storage availability.
      }
      resetFormToDefaults();
      calculateAndRender();
      updateSaveStatus("已清空；默认清水参数已保留", false);
      app.querySelector('[name="emitterCount"]').focus();
    }

    function changeSampleCount(delta) {
      const current = sanitizeSampleCount(rawValue("sampleCount"));
      const target = Math.max(4, Math.min(64, current + delta));
      if (target === current) {
        updateSaveStatus(
          target === 4 ? "至少保留 4 个采样输入" : "最多支持 64 个采样输入",
          false
        );
        return;
      }
      buildSampleInputs(target);
      calculateAndRender();
      const inputs = sampleGrid.querySelectorAll(".calc-sample-input");
      inputs[Math.max(0, inputs.length - 4)].focus();
    }

    form.addEventListener("input", function () {
      calculateAndRender();
    });
    form.addEventListener("change", function () {
      calculateAndRender();
    });

    app.querySelector('[data-calc-action="load-example"]').addEventListener(
      "click",
      loadExample
    );
    app.querySelector('[data-calc-action="load-current"]').addEventListener(
      "click",
      loadCurrentDesign
    );
    app.querySelector('[data-calc-action="export-case"]').addEventListener(
      "click",
      exportCase
    );
    app.querySelector('[data-calc-action="import-case"]').addEventListener(
      "click",
      function () {
        importInput.click();
      }
    );
    importInput.addEventListener("change", function () {
      const file = importInput.files && importInput.files[0];
      if (file) {
        importCaseFile(file);
      }
    });
    app.querySelector('[data-calc-action="clear"]').addEventListener(
      "click",
      clearForm
    );
    app.querySelector('[data-calc-action="add-samples"]').addEventListener(
      "click",
      function () {
        changeSampleCount(4);
      }
    );
    app.querySelector('[data-calc-action="remove-samples"]').addEventListener(
      "click",
      function () {
        changeSampleCount(-4);
      }
    );

    restoreInputs();
    calculateAndRender(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCalculator, {
      once: true,
    });
  } else {
    initializeCalculator();
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(initializeCalculator);
  }
})();
