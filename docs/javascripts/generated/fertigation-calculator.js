// GENERATED FILE — edit the source under src/fertigation_pipeline instead.
// Source module. Published copies under docs/javascripts/generated are build artifacts.
(function () {
  "use strict";

  const STORAGE_KEY = "fertigation-calculator.v2";
  const LEGACY_STORAGE_KEY = "fertigation-calculator.v1";
  const STORAGE_VERSION = 2;
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

    function addNullable() {
      const values = Array.from(arguments);
      if (values.some(function (value) { return value === null; })) {
        return null;
      }
      return values.reduce(function (sum, value) {
        return sum + value;
      }, 0);
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
        mode: {
          selected: textValue("operatingMode") || "滴灌施肥",
        },
        hydraulics: {
          system: {
            emitterCount: numberValue("emitterCount"),
            emitterFlowLph: numberValue("emitterFlowLph"),
            emittersPerNode: 2,
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
          nodeBranchPipe: {
            innerDiameterMm: numberValue("nodeBranchInnerDiameterMm"),
            lengthM: numberValue("nodeBranchLengthM"),
            roughnessMm: numberValue("nodeBranchRoughnessMm"),
            localK: numberValue("nodeBranchLocalK"),
          },
          capillaryPipe: {
            innerDiameterMm: numberValue("lateralInnerDiameterMm"),
            lengthM: numberValue("lateralLengthM"),
            roughnessMm: numberValue("lateralRoughnessMm"),
            localK: numberValue("lateralLocalK"),
          },
        },
        sprayHydraulics: {
          system: {
            nozzleCount: numberValue("sprayNozzleCount"),
            nozzleFlowLph: numberValue("sprayNozzleFlowLph"),
          },
          water: {
            densityKgM3: numberValue("densityKgM3"),
            kinematicViscosityM2s: numberValue("kinematicViscosityM2s"),
          },
          pipe: {
            innerDiameterMm: numberValue("sprayPipeInnerDiameterMm"),
            lengthM: numberValue("sprayPipeLengthM"),
            roughnessMm: numberValue("sprayPipeRoughnessMm"),
            localK: numberValue("sprayPipeLocalK"),
          },
        },
        emitterPressure: {
          p4Mpa: numberValue("fieldP4Mpa"),
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
          bypassDifferentialMpa: numberValue("bypassDifferentialMpa"),
          checkBLossMpa: numberValue("checkBLossMpa"),
          fittingsBLossMpa: numberValue("fittingsBLossMpa"),
          dripValveLossMpa: numberValue("dripValveLossMpa"),
        },
        sprayPressure: {
          p3Mpa: numberValue("fieldP3Mpa"),
          measuredP5Mpa: numberValue("fieldP5Mpa"),
          downstreamLossMpa: numberValue("sprayDownstreamLossMpa"),
          heightDifferenceM: numberValue("sprayHeightDifferenceM"),
          densityKgM3: numberValue("densityKgM3"),
          nozzleMinPressureMpa: numberValue("sprayNozzleMinPressureMpa"),
          nozzleMaxPressureMpa: numberValue("sprayNozzleMaxPressureMpa"),
        },
        sprayPressureBudget: {
          sourceDynamicMpa: numberValue("sourceDynamicMpa"),
          regulatorSetMpa: numberValue("sprayRegulatorSetMpa"),
          regulatorMinDifferentialMpa: numberValue(
            "sprayRegulatorMinDifferentialMpa"
          ),
          backflowLossMpa: numberValue("backflowLossMpa"),
          filterCleanLossMpa: numberValue("filterCleanLossMpa"),
          filterDirtyLossMpa: numberValue("filterDirtyLossMpa"),
          controllerALossMpa: numberValue("controllerALossMpa"),
          checkALossMpa: numberValue("checkALossMpa"),
          fittingsALossMpa: numberValue("fittingsALossMpa"),
          controllerBLossMpa: numberValue("controllerBLossMpa"),
          bypassDifferentialMpa: numberValue("bypassDifferentialMpa"),
          checkBLossMpa: numberValue("checkBLossMpa"),
          fittingsBLossMpa: numberValue("fittingsBLossMpa"),
          sprayValveLossMpa: numberValue("sprayValveLossMpa"),
          sprayFilterLossMpa: numberValue("sprayFilterLossMpa"),
          sprayFittingsLossMpa: numberValue("sprayFittingsLossMpa"),
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
          actualMotiveFlowLph: numberValue("actualVenturiMotiveLph"),
          actualP1Mpa: numberValue("fieldP1Mpa"),
          actualP2Mpa: numberValue("fieldP2Mpa"),
          curvePointConfirmed: checkboxValue("venturiCurveConfirmed"),
        },
        pesticide: {
          waterConcentration: numberValue("pesticideWaterConcentration"),
          motherConcentration: numberValue("pesticideMotherConcentration"),
          targetConcentration: numberValue("pesticideTargetConcentration"),
          durationMinutes: numberValue("pesticideDurationMinutes"),
          unusableResidualL: numberValue("pesticideUnusableResidualL"),
          measuredSuctionLph: numberValue("measuredPesticideSuctionLph"),
          labelReference: textValue("pesticideLabelReference"),
          methodConfirmed: checkboxValue("pesticideMethodConfirmed"),
        },
        sprayVenturi: {
          model: textValue("venturiModel"),
          sourceReference: textValue("venturiSourceReference"),
          maxPressureMpa: numberValue("venturiMaxPressureMpa"),
          minMotiveFlowLph: numberValue("venturiMinMotiveLph"),
          maxMotiveFlowLph: numberValue("venturiMaxMotiveLph"),
          curveP1Mpa: numberValue("sprayVenturiCurveP1Mpa"),
          curveP2Mpa: numberValue("sprayVenturiCurveP2Mpa"),
          curveMotiveFlowLph: numberValue("sprayVenturiCurveMotiveLph"),
          curveSuctionFlowLph: numberValue("sprayVenturiCurveSuctionLph"),
          actualMotiveFlowLph: numberValue(
            "sprayActualVenturiMotiveLph"
          ),
          actualP1Mpa: numberValue("sprayFieldP1Mpa"),
          actualP2Mpa: numberValue("sprayFieldP2Mpa"),
          curvePointConfirmed: checkboxValue("sprayVenturiCurveConfirmed"),
        },
        flush: {
          actualFlushFlowLph: numberValue("actualFlushFlowLph"),
          actualSprayFlushFlowLph: numberValue("actualSprayFlushFlowLph"),
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
      const sprayHydraulics = core.calculateSprayHydraulics(
        inputs.sprayHydraulics
      );
      const mainLoss = hydraulics.main.values.totalLossMpa;
      const nodeBranchLoss = hydraulics.nodeBranch.values.totalLossMpa;
      const capillaryLoss = hydraulics.capillary.values.totalLossMpa;
      const emitterPressure = core.calculateEmitterPressure({
        ...inputs.emitterPressure,
        mainLossMpa: mainLoss,
        nodeBranchLossMpa: nodeBranchLoss,
        capillaryLossMpa: capillaryLoss,
      });
      function measuredOrConfirmedDifferential(venturiInput, fallback) {
        if (
          venturiInput.actualP1Mpa !== null &&
          venturiInput.actualP2Mpa !== null
        ) {
          return venturiInput.actualP1Mpa - venturiInput.actualP2Mpa;
        }
        if (
          venturiInput.curvePointConfirmed &&
          venturiInput.curveP1Mpa !== null &&
          venturiInput.curveP2Mpa !== null
        ) {
          return venturiInput.curveP1Mpa - venturiInput.curveP2Mpa;
        }
        return fallback;
      }
      const pressureBudget = core.calculatePressureBudget({
        ...inputs.pressureBudget,
        bypassDifferentialMpa: measuredOrConfirmedDifferential(
          inputs.venturi,
          inputs.pressureBudget.bypassDifferentialMpa
        ),
        fittingsALossMpa: addNullable(
          inputs.pressureBudget.fittingsALossMpa,
          inputs.pressureBudget.dripValveLossMpa
        ),
        fittingsBLossMpa: addNullable(
          inputs.pressureBudget.fittingsBLossMpa,
          inputs.pressureBudget.dripValveLossMpa
        ),
      });
      const nozzlePressure = core.calculateNozzlePressure({
        ...inputs.sprayPressure,
        pipeLossMpa: sprayHydraulics.pipe.values.totalLossMpa,
      });
      const sprayPressureBudget = core.calculatePressureBudget({
        ...inputs.sprayPressureBudget,
        bypassDifferentialMpa: measuredOrConfirmedDifferential(
          inputs.sprayVenturi,
          inputs.sprayPressureBudget.bypassDifferentialMpa
        ),
        filterCleanLossMpa: addNullable(
          inputs.sprayPressureBudget.filterCleanLossMpa,
          inputs.sprayPressureBudget.sprayFilterLossMpa
        ),
        filterDirtyLossMpa: addNullable(
          inputs.sprayPressureBudget.filterDirtyLossMpa,
          inputs.sprayPressureBudget.sprayFilterLossMpa
        ),
        fittingsALossMpa: addNullable(
          inputs.sprayPressureBudget.fittingsALossMpa,
          inputs.sprayPressureBudget.sprayValveLossMpa,
          inputs.sprayPressureBudget.sprayFittingsLossMpa
        ),
        fittingsBLossMpa: addNullable(
          inputs.sprayPressureBudget.fittingsBLossMpa,
          inputs.sprayPressureBudget.sprayValveLossMpa,
          inputs.sprayPressureBudget.sprayFittingsLossMpa
        ),
      });
      const fertigation = core.calculateFertigation({
        ...inputs.fertigation,
        designFlowLph: hydraulics.systemFlow.designFlowLph.value,
      });
      const venturi = core.calculateVenturi({
        ...inputs.venturi,
        targetSuctionLph: fertigation.targetSuctionLph.value,
      });
      const pesticide = core.calculateFertigation({
        ...inputs.pesticide,
        designFlowLph: sprayHydraulics.systemFlow.designFlowLph.value,
      });
      const sprayVenturi = core.calculateVenturi({
        ...inputs.sprayVenturi,
        targetSuctionLph: pesticide.targetSuctionLph.value,
      });
      const flush = core.calculateFlush({
        totalVolumeL: hydraulics.totalVolumeL.value,
        actualFlushFlowLph: inputs.flush.actualFlushFlowLph,
      });
      const sprayFlush = core.calculateFlush({
        totalVolumeL: sprayHydraulics.totalVolumeL.value,
        actualFlushFlowLph: inputs.flush.actualSprayFlushFlowLph,
      });
      const uniformity = core.calculateUniformity(inputs.uniformity);
      const mode = core.calculateModeContract(inputs.mode);

      writeResult("designFlow", hydraulics.systemFlow.designFlowLph);
      writePipe(
        "main",
        hydraulics.main,
        hydraulics.systemFlow.designFlowLph.value
      );
      writePipe(
        "nodeBranch",
        hydraulics.nodeBranch,
        numberValue("emitterFlowLph") === null
          ? null
          : numberValue("emitterFlowLph") * 2
      );
      writePipe(
        "lateral",
        hydraulics.capillary,
        numberValue("emitterFlowLph")
      );
      writeResult("totalVolume", hydraulics.totalVolumeL);
      writeResult("emitterPressure", emitterPressure.emitterPressureMpa);
      writeResult("heightLoss", emitterPressure.heightLossMpa);
      writeResult("sprayFlow", sprayHydraulics.systemFlow.designFlowLph);
      writePipe(
        "spray",
        sprayHydraulics.pipe,
        sprayHydraulics.systemFlow.designFlowLph.value
      );
      writeResult("nozzlePressure", nozzlePressure.nozzlePressureMpa);
      writeResult("sprayFlushMinutes", sprayFlush.flushMinutes);
      writeResult("modeStatus", { value: null, status: mode.status, reason: mode.reason }, {
        status: mode.status,
        text:
          mode.controllerProgram +
          (mode.selectors
            ? " · MV-END=" +
              mode.selectors.endpoint +
              " · MV-SOURCE=" +
              mode.selectors.source
            : ""),
        reason: mode.purpose + "；" + mode.reason,
      });

      Object.keys(pressureBudget.results).forEach(function (key) {
        writeBudgetRow(key, pressureBudget.results[key]);
      });
      [
        ["sprayAClean", "aClean"],
        ["sprayADirty", "aDirty"],
        ["sprayBClean", "bClean"],
        ["sprayBDirty", "bDirty"],
      ].forEach(function (mapping) {
        writeBudgetRow(mapping[0], sprayPressureBudget.results[mapping[1]]);
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
      writeResult("pesticideTargetSuction", pesticide.targetSuctionLph);
      writeResult("pesticideMotherVolume", pesticide.motherVolumeL);
      writeResult("pesticideBucketMinimum", pesticide.bucketMinimumL);
      const pesticideAllowed =
        inputs.pesticide.methodConfirmed &&
        Boolean(inputs.pesticide.labelReference);
      const pesticideVenturiStatus = pesticideAllowed
        ? combineStatus(pesticide.status, sprayVenturi.status)
        : "pending";
      writeResult("pesticideVenturiStatus", sprayVenturi.suctionMarginLph, {
        status: pesticideVenturiStatus,
        text: STATUS_LABELS[pesticideVenturiStatus],
        reason: pesticideAllowed
          ? sprayVenturi.reason
          : "登记标签或允许的喷施方法尚未确认；不输出可用结论",
      });

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
      const sprayStatus = combineStatus(
        mode.status,
        sprayHydraulics.status,
        nozzlePressure.status,
        sprayPressureBudget.status,
        pesticideVenturiStatus,
        sprayFlush.status
      );
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
        "spray",
        sprayStatus,
        sprayStatus === "calculated"
          ? "喷灌水力、喷药工况和清水置换已计算"
          : sprayStatus === "not-applicable"
            ? "至少一项喷灌压力、管径或模式条件不适用"
            : "仍缺少喷头、管径、压力、标签或厂家曲线数据"
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
      form.querySelectorAll("input[name], select[name]").forEach(function (input) {
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
        schema_version: "2.1.0",
        design_revision: currentDesignRevision,
        scenario: {
          name: "网页计算工况",
          date: localDateStamp(),
          operator: "",
        },
        mode: {
          selected: values.operatingMode || "滴灌施肥",
        },
        system: {
          emitterCount: numericOrNull(values.emitterCount),
          emitterFlowLph: numericOrNull(values.emitterFlowLph),
          emittersPerNode: 2,
        },
        spray: {
          nozzleCount: numericOrNull(values.sprayNozzleCount),
          nozzleFlowLph: numericOrNull(values.sprayNozzleFlowLph),
          heightDifferenceM: numericOrNull(values.sprayHeightDifferenceM),
          downstreamLossMpa: numericOrNull(values.sprayDownstreamLossMpa),
          nozzleMinPressureMpa: numericOrNull(
            values.sprayNozzleMinPressureMpa
          ),
          nozzleMaxPressureMpa: numericOrNull(
            values.sprayNozzleMaxPressureMpa
          ),
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
          nodeBranch: {
            innerDiameterMm: numericOrNull(
              values.nodeBranchInnerDiameterMm
            ),
            outerDiameterMm: 12,
            lengthM: numericOrNull(values.nodeBranchLengthM),
            roughnessMm: numericOrNull(values.nodeBranchRoughnessMm),
            localK: numericOrNull(values.nodeBranchLocalK),
          },
          capillary: {
            innerDiameterMm: numericOrNull(values.lateralInnerDiameterMm),
            outerDiameterMm: 5,
            lengthM: numericOrNull(values.lateralLengthM),
            roughnessMm: numericOrNull(values.lateralRoughnessMm),
            localK: numericOrNull(values.lateralLocalK),
          },
          spray: {
            innerDiameterMm: numericOrNull(values.sprayPipeInnerDiameterMm),
            outerDiameterMm: numericOrNull(values.sprayPipeOuterDiameterMm),
            lengthM: numericOrNull(values.sprayPipeLengthM),
            roughnessMm: numericOrNull(values.sprayPipeRoughnessMm),
            localK: numericOrNull(values.sprayPipeLocalK),
          },
        },
        pressure_points: {
          sourceDynamicMpa: numericOrNull(values.sourceDynamicMpa),
          P0: numericOrNull(values.fieldP0Mpa),
          P1: numericOrNull(values.fieldP1Mpa),
          P2: numericOrNull(values.fieldP2Mpa),
          P3: numericOrNull(values.fieldP3Mpa),
          P4: numericOrNull(values.fieldP4Mpa),
          P5: numericOrNull(values.fieldP5Mpa),
          sprayP1: numericOrNull(values.sprayFieldP1Mpa),
          sprayP2: numericOrNull(values.sprayFieldP2Mpa),
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
          bypassDifferentialMpa: numericOrNull(
            values.bypassDifferentialMpa
          ),
          checkBLossMpa: numericOrNull(values.checkBLossMpa),
          fittingsBLossMpa: numericOrNull(values.fittingsBLossMpa),
          dripValveLossMpa: numericOrNull(values.dripValveLossMpa),
          sprayValveLossMpa: numericOrNull(values.sprayValveLossMpa),
          sprayFilterLossMpa: numericOrNull(values.sprayFilterLossMpa),
          sprayRegulatorSetMpa: numericOrNull(
            values.sprayRegulatorSetMpa
          ),
          sprayRegulatorMinDifferentialMpa: numericOrNull(
            values.sprayRegulatorMinDifferentialMpa
          ),
          sprayFittingsLossMpa: numericOrNull(values.sprayFittingsLossMpa),
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
          actualMotiveFlowLph: numericOrNull(
            values.actualVenturiMotiveLph
          ),
          curvePointConfirmed: Boolean(values.venturiCurveConfirmed),
          sprayCurve: {
            curveP1Mpa: numericOrNull(values.sprayVenturiCurveP1Mpa),
            curveP2Mpa: numericOrNull(values.sprayVenturiCurveP2Mpa),
            curveMotiveFlowLph: numericOrNull(
              values.sprayVenturiCurveMotiveLph
            ),
            curveSuctionFlowLph: numericOrNull(
              values.sprayVenturiCurveSuctionLph
            ),
            actualMotiveFlowLph: numericOrNull(
              values.sprayActualVenturiMotiveLph
            ),
            curvePointConfirmed: Boolean(values.sprayVenturiCurveConfirmed),
          },
        },
        fertigation: {
          waterConcentration: numericOrNull(values.waterConcentration),
          motherConcentration: numericOrNull(values.motherConcentration),
          targetConcentration: numericOrNull(values.targetConcentration),
          durationMinutes: numericOrNull(values.fertigationDurationMinutes),
          unusableResidualL: numericOrNull(values.unusableResidualL),
          measuredSuctionLph: numericOrNull(values.measuredSuctionLph),
        },
        pesticide: {
          waterConcentration: numericOrNull(
            values.pesticideWaterConcentration
          ),
          motherConcentration: numericOrNull(
            values.pesticideMotherConcentration
          ),
          targetConcentration: numericOrNull(
            values.pesticideTargetConcentration
          ),
          durationMinutes: numericOrNull(values.pesticideDurationMinutes),
          unusableResidualL: numericOrNull(
            values.pesticideUnusableResidualL
          ),
          measuredSuctionLph: numericOrNull(
            values.measuredPesticideSuctionLph
          ),
          labelReference: values.pesticideLabelReference || "",
          methodConfirmed: Boolean(values.pesticideMethodConfirmed),
        },
        flushing: {
          actualFlushFlowLph: numericOrNull(values.actualFlushFlowLph),
          actualSprayFlushFlowLph: numericOrNull(
            values.actualSprayFlushFlowLph
          ),
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
      const pesticide = calculationCase.pesticide || {};
      const sprayConfig = calculationCase.spray || {};
      const flushing = calculationCase.flushing || {};
      const main = (calculationCase.pipes && calculationCase.pipes.main) || {};
      const nodeBranch =
        (calculationCase.pipes && calculationCase.pipes.nodeBranch) || {};
      const capillary =
        (calculationCase.pipes &&
          (calculationCase.pipes.capillary ||
            calculationCase.pipes.lateral)) ||
        {};
      const sprayPipe =
        (calculationCase.pipes && calculationCase.pipes.spray) || {};
      const sprayCurve = venturi.sprayCurve || {};
      return {
        operatingMode:
          (calculationCase.mode && calculationCase.mode.selected) ||
          "滴灌施肥",
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
        nodeBranchInnerDiameterMm: nodeBranch.innerDiameterMm,
        nodeBranchLengthM: nodeBranch.lengthM,
        nodeBranchRoughnessMm: nodeBranch.roughnessMm,
        nodeBranchLocalK: nodeBranch.localK,
        lateralInnerDiameterMm: capillary.innerDiameterMm,
        lateralLengthM: capillary.lengthM,
        lateralRoughnessMm: capillary.roughnessMm,
        lateralLocalK: capillary.localK,
        sprayNozzleCount: sprayConfig.nozzleCount,
        sprayNozzleFlowLph: sprayConfig.nozzleFlowLph,
        sprayPipeInnerDiameterMm: sprayPipe.innerDiameterMm,
        sprayPipeOuterDiameterMm: sprayPipe.outerDiameterMm,
        sprayPipeLengthM: sprayPipe.lengthM,
        sprayPipeRoughnessMm: sprayPipe.roughnessMm,
        sprayPipeLocalK: sprayPipe.localK,
        sprayHeightDifferenceM: sprayConfig.heightDifferenceM,
        sprayDownstreamLossMpa: sprayConfig.downstreamLossMpa,
        sprayNozzleMinPressureMpa: sprayConfig.nozzleMinPressureMpa,
        sprayNozzleMaxPressureMpa: sprayConfig.nozzleMaxPressureMpa,
        sourceDynamicMpa: pressure.sourceDynamicMpa,
        fieldP0Mpa: pressure.P0,
        fieldP1Mpa: pressure.P1,
        fieldP2Mpa: pressure.P2,
        fieldP3Mpa: pressure.P3,
        fieldP4Mpa: pressure.P4,
        fieldP5Mpa: pressure.P5,
        sprayFieldP1Mpa: pressure.sprayP1,
        sprayFieldP2Mpa: pressure.sprayP2,
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
        bypassDifferentialMpa:
          losses.bypassDifferentialMpa ?? losses.venturiLossMpa,
        checkBLossMpa: losses.checkBLossMpa,
        fittingsBLossMpa: losses.fittingsBLossMpa,
        dripValveLossMpa: losses.dripValveLossMpa,
        sprayValveLossMpa: losses.sprayValveLossMpa,
        sprayFilterLossMpa: losses.sprayFilterLossMpa,
        sprayRegulatorSetMpa: losses.sprayRegulatorSetMpa,
        sprayRegulatorMinDifferentialMpa:
          losses.sprayRegulatorMinDifferentialMpa,
        sprayFittingsLossMpa: losses.sprayFittingsLossMpa,
        venturiModel: venturi.model,
        venturiSourceReference: venturi.sourceReference,
        venturiMaxPressureMpa: venturi.maxPressureMpa,
        venturiMinMotiveLph: venturi.minMotiveFlowLph,
        venturiMaxMotiveLph: venturi.maxMotiveFlowLph,
        venturiCurveP1Mpa: venturi.curveP1Mpa,
        venturiCurveP2Mpa: venturi.curveP2Mpa,
        venturiCurveMotiveLph: venturi.curveMotiveFlowLph,
        venturiCurveSuctionLph: venturi.curveSuctionFlowLph,
        actualVenturiMotiveLph: venturi.actualMotiveFlowLph,
        venturiCurveConfirmed: venturi.curvePointConfirmed,
        sprayVenturiCurveP1Mpa: sprayCurve.curveP1Mpa,
        sprayVenturiCurveP2Mpa: sprayCurve.curveP2Mpa,
        sprayVenturiCurveMotiveLph: sprayCurve.curveMotiveFlowLph,
        sprayVenturiCurveSuctionLph: sprayCurve.curveSuctionFlowLph,
        sprayActualVenturiMotiveLph: sprayCurve.actualMotiveFlowLph,
        sprayVenturiCurveConfirmed: sprayCurve.curvePointConfirmed,
        waterConcentration: fertigation.waterConcentration,
        motherConcentration: fertigation.motherConcentration,
        targetConcentration: fertigation.targetConcentration,
        fertigationDurationMinutes: fertigation.durationMinutes,
        unusableResidualL: fertigation.unusableResidualL,
        measuredSuctionLph: fertigation.measuredSuctionLph,
        pesticideWaterConcentration: pesticide.waterConcentration,
        pesticideMotherConcentration: pesticide.motherConcentration,
        pesticideTargetConcentration: pesticide.targetConcentration,
        pesticideDurationMinutes: pesticide.durationMinutes,
        pesticideUnusableResidualL: pesticide.unusableResidualL,
        measuredPesticideSuctionLph: pesticide.measuredSuctionLph,
        pesticideLabelReference: pesticide.labelReference,
        pesticideMethodConfirmed: pesticide.methodConfirmed,
        actualFlushFlowLph: flushing.actualFlushFlowLph,
        actualSprayFlushFlowLph: flushing.actualSprayFlushFlowLph,
        collectionMinutes: flushing.collectionMinutes,
      };
    }

    function migrateCase(calculationCase) {
      if (!calculationCase) {
        throw new Error("工况JSON为空。");
      }
      if (calculationCase.schema_version === "2.1.0") {
        return calculationCase;
      }
      if (calculationCase.schema_version === "1.0.0") {
        const oldPressure = calculationCase.pressure_points || {};
        return migrateCase({
          ...calculationCase,
          schema_version: "2.0.0",
          mode: { selected: "滴灌施肥" },
          spray: {
            nozzleCount: null,
            nozzleFlowLph: null,
            heightDifferenceM: 0,
            downstreamLossMpa: 0,
            nozzleMinPressureMpa: null,
            nozzleMaxPressureMpa: null,
          },
          pipes: {
            ...(calculationCase.pipes || {}),
            spray: {
              innerDiameterMm: null,
              outerDiameterMm: null,
              lengthM: null,
              roughnessMm: null,
              localK: null,
            },
          },
          pressure_points: {
            ...oldPressure,
            P3: null,
            P4: oldPressure.P3 ?? null,
            P5: null,
            sprayP1: null,
            sprayP2: null,
          },
          component_losses: {
            ...(calculationCase.component_losses || {}),
            dripValveLossMpa: null,
            sprayValveLossMpa: null,
            sprayFilterLossMpa: null,
            sprayRegulatorSetMpa: null,
            sprayRegulatorMinDifferentialMpa: null,
            sprayFittingsLossMpa: null,
          },
          venturi: {
            ...(calculationCase.venturi || {}),
            sprayCurve: {
              curveP1Mpa: null,
              curveP2Mpa: null,
              curveMotiveFlowLph: null,
              curveSuctionFlowLph: null,
              curvePointConfirmed: false,
            },
          },
          pesticide: {
            waterConcentration: 0,
            motherConcentration: null,
            targetConcentration: null,
            durationMinutes: null,
            unusableResidualL: 0,
            measuredSuctionLph: null,
            labelReference: "",
            methodConfirmed: false,
          },
          flushing: {
            ...(calculationCase.flushing || {}),
            actualSprayFlushFlowLph: null,
          },
        });
      }
      if (calculationCase.schema_version !== "2.0.0") {
        throw new Error("工况JSON版本不受支持。");
      }
      return Core.migrateCalculationCase(calculationCase);
    }

    function applyCase(sourceCase, sourceLabel) {
      const calculationCase = migrateCase(sourceCase);
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
        let raw = localStorage.getItem(STORAGE_KEY);
        let legacy = false;
        if (!raw) {
          raw = localStorage.getItem(LEGACY_STORAGE_KEY);
          legacy = Boolean(raw);
        }
        if (!raw) {
          buildSampleInputs(4);
          return false;
        }

        const state = JSON.parse(raw);
        if (
          !state ||
          (!legacy && state.version !== STORAGE_VERSION) ||
          (legacy && state.version !== 1) ||
          !state.inputs ||
          typeof state.inputs !== "object"
        ) {
          localStorage.removeItem(legacy ? LEGACY_STORAGE_KEY : STORAGE_KEY);
          buildSampleInputs(4);
          return false;
        }

        if (legacy) {
          state.inputs.operatingMode = "滴灌施肥";
          state.inputs.fieldP4Mpa = state.inputs.fieldP3Mpa || "";
          state.inputs.fieldP3Mpa = "";
        }
        const sampleCount = sanitizeSampleCount(state.inputs.sampleCount);
        buildSampleInputs(sampleCount);
        Object.keys(state.inputs).forEach(function (name) {
          setField(name, state.inputs[name]);
        });
        const savedTime = new Date(state.savedAt);
        updateSaveStatus(
          (legacy ? "已迁移旧版滴灌输入；" : "") +
          (Number.isNaN(savedTime.getTime())
            ? "已恢复本机输入"
            : "已恢复 " +
                savedTime.toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }) +
                " 的输入"),
          false
        );
        if (legacy) {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          saveInputs();
        }
        return true;
      } catch (error) {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
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
          "载入 v5 十滴头透明算例将覆盖当前工作表输入。是否继续？"
        )
      ) {
        return;
      }

      resetFormToDefaults();
      const example = {
        emitterCount: 10,
        emitterFlowLph: 2,
        sprayNozzleCount: 5,
        mainInnerDiameterMm: 9,
        mainLengthM: 10,
        mainRoughnessMm: 0,
        mainLocalK: 0,
        nodeBranchInnerDiameterMm: "",
        nodeBranchLengthM: "",
        nodeBranchRoughnessMm: "",
        nodeBranchLocalK: "",
        lateralInnerDiameterMm: 3,
        lateralLengthM: 1,
        lateralRoughnessMm: 0,
        lateralLocalK: 0,
        actualFlushFlowLph: 20,
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
        localStorage.removeItem(LEGACY_STORAGE_KEY);
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
