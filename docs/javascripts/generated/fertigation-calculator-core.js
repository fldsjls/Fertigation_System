// GENERATED FILE — edit the source under src/fertigation_pipeline instead.
// Source module. Published copies under docs/javascripts/generated are build artifacts.
(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.FertigationCalculatorCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUS = Object.freeze({
    CALCULATED: "calculated",
    PENDING: "pending",
    NOT_APPLICABLE: "not-applicable",
  });

  const STATUS_PRIORITY = {
    [STATUS.CALCULATED]: 0,
    [STATUS.PENDING]: 1,
    [STATUS.NOT_APPLICABLE]: 2,
  };

  const GRAVITY_MS2 = 9.80665;
  const LPH_TO_M3S = 1 / 3600000;
  const PA_TO_MPA = 1 / 1000000;

  function isBlank(value) {
    return value === null || value === undefined || value === "";
  }

  function toNumber(value) {
    if (isBlank(value)) {
      return null;
    }

    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : NaN;
  }

  function combineStatus() {
    return Array.from(arguments).reduce(function (current, status) {
      if (!status) {
        return current;
      }
      return STATUS_PRIORITY[status] > STATUS_PRIORITY[current] ? status : current;
    }, STATUS.CALCULATED);
  }

  function makeResult(value, unit, status, reason, formula, assumptions) {
    return {
      value: Number.isFinite(value) ? value : null,
      unit: unit || "",
      status: status,
      reason: reason || "",
      formula: formula || "",
      assumptions: assumptions || [],
    };
  }

  function missingResult(unit, reason, formula) {
    return makeResult(null, unit, STATUS.PENDING, reason, formula);
  }

  function invalidResult(unit, reason, formula) {
    return makeResult(null, unit, STATUS.NOT_APPLICABLE, reason, formula);
  }

  function validateNumber(value, label, options) {
    const settings = options || {};
    const number = toNumber(value);

    if (number === null) {
      return { ok: false, missing: true, reason: "缺少" + label };
    }
    if (Number.isNaN(number)) {
      return { ok: false, missing: false, reason: label + "不是有效数字" };
    }
    if (settings.integer && !Number.isInteger(number)) {
      return { ok: false, missing: false, reason: label + "必须是整数" };
    }
    if (settings.positive && number <= 0) {
      return { ok: false, missing: false, reason: label + "必须大于 0" };
    }
    if (settings.nonNegative && number < 0) {
      return { ok: false, missing: false, reason: label + "不能小于 0" };
    }

    return { ok: true, value: number };
  }

  function validationStatus(validations) {
    const invalid = validations.find(function (item) {
      return !item.ok && !item.missing;
    });
    if (invalid) {
      return { status: STATUS.NOT_APPLICABLE, reason: invalid.reason };
    }

    const missing = validations.find(function (item) {
      return !item.ok && item.missing;
    });
    if (missing) {
      return { status: STATUS.PENDING, reason: missing.reason };
    }

    return { status: STATUS.CALCULATED, reason: "" };
  }

  function calculateSystemFlow(input) {
    const count = validateNumber(input && input.emitterCount, "同时工作滴头数量", {
      positive: true,
      integer: true,
    });
    const emitterFlow = validateNumber(input && input.emitterFlowLph, "单滴头流量", {
      positive: true,
    });
    const validation = validationStatus([count, emitterFlow]);

    if (validation.status !== STATUS.CALCULATED) {
      const resultFactory =
        validation.status === STATUS.PENDING ? missingResult : invalidResult;
      return {
        status: validation.status,
        reason: validation.reason,
        designFlowLph: resultFactory(
          "L/h",
          validation.reason,
          "Q设计 = N × q滴头"
        ),
      };
    }

    return {
      status: STATUS.CALCULATED,
      reason: "总流量已按同时工作的滴头数量计算",
      designFlowLph: makeResult(
        count.value * emitterFlow.value,
        "L/h",
        STATUS.CALCULATED,
        "总流量已计算",
        "Q设计 = N × q滴头"
      ),
    };
  }

  function calculateOutletFlow(input, countLabel, flowLabel, formulaLabel) {
    const count = validateNumber(input && input.count, countLabel, {
      positive: true,
      integer: true,
    });
    const outletFlow = validateNumber(input && input.flowLph, flowLabel, {
      positive: true,
    });
    const validation = validationStatus([count, outletFlow]);
    const formula = formulaLabel || "Q设计 = N × q末端";

    if (validation.status !== STATUS.CALCULATED) {
      const resultFactory =
        validation.status === STATUS.PENDING ? missingResult : invalidResult;
      return {
        status: validation.status,
        reason: validation.reason,
        designFlowLph: resultFactory("L/h", validation.reason, formula),
      };
    }

    return {
      status: STATUS.CALCULATED,
      reason: "末端总流量已计算",
      designFlowLph: makeResult(
        count.value * outletFlow.value,
        "L/h",
        STATUS.CALCULATED,
        "按同时工作的末端数量计算",
        formula
      ),
    };
  }

  function calculatePipe(flowLph, pipe, water) {
    const flow = validateNumber(flowLph, "管段流量", { positive: true });
    const diameter = validateNumber(pipe && pipe.innerDiameterMm, "管道实际内径", {
      positive: true,
    });
    const length = validateNumber(pipe && pipe.lengthM, "管段长度", {
      positive: true,
    });
    const localK = validateNumber(pipe && pipe.localK, "局部阻力系数之和", {
      nonNegative: true,
    });
    const viscosity = validateNumber(
      water && water.kinematicViscosityM2s,
      "运动黏度",
      { positive: true }
    );
    const density = validateNumber(water && water.densityKgM3, "流体密度", {
      positive: true,
    });
    const baseValidation = validationStatus([
      flow,
      diameter,
      length,
      viscosity,
      density,
    ]);

    if (baseValidation.status !== STATUS.CALCULATED) {
      return {
        status: baseValidation.status,
        reason: baseValidation.reason,
        values: {
          velocityMs: null,
          reynolds: null,
          frictionFactor: null,
          lineLossMpa: null,
          localLossMpa: null,
          totalLossMpa: null,
          volumeL: null,
        },
        regime: null,
        formula: "v = 4Q/(πD²); Re = vD/ν",
        assumptions: [],
      };
    }

    const diameterM = diameter.value / 1000;
    const flowM3s = flow.value * LPH_TO_M3S;
    const velocityMs = (4 * flowM3s) / (Math.PI * diameterM * diameterM);
    const reynolds = (velocityMs * diameterM) / viscosity.value;
    const volumeL =
      (Math.PI * diameterM * diameterM * length.value * 1000) / 4;
    const dynamicPressurePa = (density.value * velocityMs * velocityMs) / 2;
    let regime;
    let status = STATUS.CALCULATED;
    let reason = "管段水力结果已计算";
    let frictionFactor = null;
    const assumptions = [];

    if (reynolds < 2300) {
      regime = "层流";
      frictionFactor = 64 / reynolds;
      assumptions.push("层流摩阻系数使用 64/Re，粗糙度不参与计算");
    } else {
      const roughness = validateNumber(
        pipe && pipe.roughnessMm,
        "管道绝对粗糙度",
        { nonNegative: true }
      );

      regime = reynolds < 4000 ? "过渡区" : "湍流";
      if (!roughness.ok) {
        status = roughness.missing ? STATUS.PENDING : STATUS.NOT_APPLICABLE;
        reason = roughness.reason;
      } else {
        const relativeTerm =
          roughness.value / 1000 / (3.7 * diameterM) +
          5.74 / Math.pow(reynolds, 0.9);
        frictionFactor =
          0.25 / Math.pow(Math.log10(relativeTerm), 2);
        assumptions.push("非层流摩阻系数使用 Swamee–Jain 近似");

        if (regime === "过渡区") {
          status = STATUS.PENDING;
          reason = "雷诺数位于 2300～4000 过渡区，压损仅作估算";
        }
      }
    }

    let lineLossMpa = null;
    let localLossMpa = null;
    let totalLossMpa = null;

    if (frictionFactor !== null) {
      lineLossMpa =
        frictionFactor *
        (length.value / diameterM) *
        dynamicPressurePa *
        PA_TO_MPA;
    }

    if (localK.ok) {
      localLossMpa = localK.value * dynamicPressurePa * PA_TO_MPA;
    } else {
      status = combineStatus(
        status,
        localK.missing ? STATUS.PENDING : STATUS.NOT_APPLICABLE
      );
      reason = reason === "管段水力结果已计算" ? localK.reason : reason + "；" + localK.reason;
    }

    if (lineLossMpa !== null && localLossMpa !== null) {
      totalLossMpa = lineLossMpa + localLossMpa;
    }

    return {
      status: status,
      reason: reason,
      values: {
        velocityMs: velocityMs,
        reynolds: reynolds,
        frictionFactor: frictionFactor,
        lineLossMpa: lineLossMpa,
        localLossMpa: localLossMpa,
        totalLossMpa: totalLossMpa,
        volumeL: volumeL,
      },
      regime: regime,
      formula:
        regime === "层流"
          ? "f = 64/Re; ΔP = [f(L/D) + ΣK]ρv²/2"
          : "f = 0.25/[log10(ε/(3.7D)+5.74/Re^0.9)]²",
      assumptions: assumptions,
    };
  }

  function calculateHydraulics(input) {
    const systemFlow = calculateSystemFlow(input && input.system);
    const designFlow = systemFlow.designFlowLph.value;
    const emitterFlow = toNumber(input && input.system && input.system.emitterFlowLph);
    const emitterCount = toNumber(input && input.system && input.system.emitterCount);
    const emittersPerNodeInput =
      input && input.system && !isBlank(input.system.emittersPerNode)
        ? input.system.emittersPerNode
        : 2;
    const emittersPerNode = validateNumber(
      emittersPerNodeInput,
      "每节点滴头数量",
      { positive: true, integer: true }
    );
    const nodeCount =
      emittersPerNode.ok &&
      Number.isFinite(emitterCount) &&
      Number.isInteger(emitterCount / emittersPerNode.value)
        ? emitterCount / emittersPerNode.value
        : null;
    const main = calculatePipe(designFlow, input && input.mainPipe, input && input.water);
    const nodeBranch = calculatePipe(
      emittersPerNode.ok && Number.isFinite(emitterFlow)
        ? emittersPerNode.value * emitterFlow
        : null,
      input && input.nodeBranchPipe,
      input && input.water
    );
    const capillary = calculatePipe(
      emitterFlow,
      (input && input.capillaryPipe) || (input && input.lateralPipe),
      input && input.water
    );
    const nodeConfigurationStatus =
      nodeCount === null
        ? Number.isFinite(emitterCount) && emittersPerNode.ok
          ? STATUS.NOT_APPLICABLE
          : emittersPerNode.missing
            ? STATUS.PENDING
            : STATUS.NOT_APPLICABLE
        : STATUS.CALCULATED;
    let totalVolumeL = null;

    if (
      Number.isFinite(emitterCount) &&
      emitterCount > 0 &&
      nodeCount !== null &&
      main.values.volumeL !== null &&
      nodeBranch.values.volumeL !== null &&
      capillary.values.volumeL !== null
    ) {
      totalVolumeL =
        main.values.volumeL +
        nodeCount * nodeBranch.values.volumeL +
        emitterCount * capillary.values.volumeL;
    }

    return {
      status: combineStatus(
        systemFlow.status,
        main.status,
        nodeBranch.status,
        capillary.status,
        nodeConfigurationStatus
      ),
      reason: [
        systemFlow.reason,
        main.reason,
        nodeBranch.reason,
        capillary.reason,
        nodeCount === null ? "滴头总数必须能按每节点滴头数整除" : "",
      ]
        .filter(Boolean)
        .join("；"),
      systemFlow: systemFlow,
      main: main,
      nodeBranch: nodeBranch,
      capillary: capillary,
      lateral: capillary,
      nodeCount: makeResult(
        nodeCount,
        "个",
        nodeConfigurationStatus,
        nodeCount === null
          ? "滴头总数与每节点滴头数不匹配"
          : "节点数由滴头总数和每节点滴头数计算",
        "N节点 = N滴头 / N每节点"
      ),
      totalVolumeL: makeResult(
        totalVolumeL,
        "L",
        totalVolumeL === null ? STATUS.PENDING : STATUS.CALCULATED,
        totalVolumeL === null
          ? "需要完整的主管、OD12节点支管、3/5毛管和节点数量"
          : "主管容积加上全部节点支管和滴箭毛管容积",
        "V总 = V主管 + N节点 × V节点支管 + N滴头 × V毛管"
      ),
    };
  }

  function calculateSprayHydraulics(input) {
    const systemFlow = calculateOutletFlow(
      {
        count: input && input.system && input.system.nozzleCount,
        flowLph: input && input.system && input.system.nozzleFlowLph,
      },
      "同时工作喷头数量",
      "单喷头流量",
      "Q喷灌 = M × q喷头"
    );
    const pipe = calculatePipe(
      systemFlow.designFlowLph.value,
      input && input.pipe,
      input && input.water
    );
    return {
      status: combineStatus(systemFlow.status, pipe.status),
      reason: [systemFlow.reason, pipe.reason].filter(Boolean).join("；"),
      systemFlow: systemFlow,
      pipe: pipe,
      totalVolumeL: makeResult(
        pipe.values.volumeL,
        "L",
        pipe.values.volumeL === null ? pipe.status : STATUS.CALCULATED,
        pipe.values.volumeL === null
          ? pipe.reason
          : "喷灌主管及立管的理论内容积",
        "V喷灌管 = πD²L/4"
      ),
    };
  }

  function calculateEmitterPressure(input) {
    const p4Value =
      input && !isBlank(input.p4Mpa) ? input.p4Mpa : input && input.p3Mpa;
    const p4 = validateNumber(p4Value, "P4 动态压力", {
      nonNegative: true,
    });
    const mainLoss = validateNumber(input && input.mainLossMpa, "主管总压损", {
      nonNegative: true,
    });
    const legacySingleBranchLoss =
      input &&
      isBlank(input.nodeBranchLossMpa) &&
      isBlank(input.capillaryLossMpa) &&
      !isBlank(input.lateralLossMpa);
    const nodeBranchLoss = validateNumber(
      legacySingleBranchLoss ? 0 : input && input.nodeBranchLossMpa,
      "代表性 OD12 节点支管总压损",
      { nonNegative: true }
    );
    const capillaryLoss = validateNumber(
      input && !isBlank(input.capillaryLossMpa)
        ? input.capillaryLossMpa
        : input && input.lateralLossMpa,
      "代表性 3/5 毛管总压损",
      { nonNegative: true }
    );
    const downstreamLoss = validateNumber(
      input && input.downstreamLossMpa,
      "其他下游压损",
      { nonNegative: true }
    );
    const height = validateNumber(input && input.heightDifferenceM, "滴头高差");
    const density = validateNumber(input && input.densityKgM3, "流体密度", {
      positive: true,
    });
    const validation = validationStatus([
      p4,
      mainLoss,
      nodeBranchLoss,
      capillaryLoss,
      downstreamLoss,
      height,
      density,
    ]);

    if (validation.status !== STATUS.CALCULATED) {
      return missingOrInvalidPressure(validation);
    }

    const heightLossMpa =
      density.value * GRAVITY_MS2 * height.value * PA_TO_MPA;
    const emitterPressureMpa =
      p4.value -
      mainLoss.value -
      nodeBranchLoss.value -
      capillaryLoss.value -
      downstreamLoss.value -
      heightLossMpa;
    const minPressure = validateNumber(
      input && input.emitterMinPressureMpa,
      "滴头最低工作压力",
      { nonNegative: true }
    );
    const maxPressure = validateNumber(
      input && input.emitterMaxPressureMpa,
      "滴头最高工作压力",
      { positive: true }
    );
    let status = STATUS.CALCULATED;
    let reason = "代表性滴头压力位于录入的工作范围内";

    if (!minPressure.ok || !maxPressure.ok) {
      status =
        (!minPressure.ok && !minPressure.missing) ||
        (!maxPressure.ok && !maxPressure.missing)
          ? STATUS.NOT_APPLICABLE
          : STATUS.PENDING;
      reason = !minPressure.ok ? minPressure.reason : maxPressure.reason;
    } else if (maxPressure.value <= minPressure.value) {
      status = STATUS.NOT_APPLICABLE;
      reason = "滴头最高工作压力必须大于最低工作压力";
    } else if (
      emitterPressureMpa < minPressure.value ||
      emitterPressureMpa > maxPressure.value
    ) {
      status = STATUS.NOT_APPLICABLE;
      reason = "计算压力超出滴头工作压力范围";
    }

    return {
      status: status,
      reason: reason,
      emitterPressureMpa: makeResult(
        emitterPressureMpa,
        "MPa",
        status,
        reason,
        "P滴头 = P4 - ΔP主管 - ΔP节点支管 - ΔP毛管 - ΔP其他 - ρgΔz"
      ),
      heightLossMpa: makeResult(
        heightLossMpa,
        "MPa",
        STATUS.CALCULATED,
        height.value >= 0 ? "向上高差增加压力需求" : "向下高差释放压力需求",
        "ΔP高差 = ρgΔz"
      ),
    };
  }

  function calculateNozzlePressure(input) {
    const p3 = validateNumber(input && input.p3Mpa, "P3 动态压力", {
      nonNegative: true,
    });
    const pipeLoss = validateNumber(
      input && input.pipeLossMpa,
      "喷灌管总压损",
      { nonNegative: true }
    );
    const downstreamLoss = validateNumber(
      input && input.downstreamLossMpa,
      "喷头前其他下游压损",
      { nonNegative: true }
    );
    const height = validateNumber(input && input.heightDifferenceM, "喷头高差");
    const density = validateNumber(input && input.densityKgM3, "流体密度", {
      positive: true,
    });
    const validation = validationStatus([
      p3,
      pipeLoss,
      downstreamLoss,
      height,
      density,
    ]);
    if (validation.status !== STATUS.CALCULATED) {
      const factory =
        validation.status === STATUS.PENDING ? missingResult : invalidResult;
      return {
        status: validation.status,
        reason: validation.reason,
        nozzlePressureMpa: factory(
          "MPa",
          validation.reason,
          "P5 = P3 - ΔP喷灌管 - ΔP其他 - ρgΔz"
        ),
        heightLossMpa: factory("MPa", validation.reason, "ΔP高差 = ρgΔz"),
      };
    }

    const heightLossMpa =
      density.value * GRAVITY_MS2 * height.value * PA_TO_MPA;
    const nozzlePressureMpa =
      p3.value - pipeLoss.value - downstreamLoss.value - heightLossMpa;
    const minPressure = validateNumber(
      input && input.nozzleMinPressureMpa,
      "喷头最低工作压力",
      { nonNegative: true }
    );
    const maxPressure = validateNumber(
      input && input.nozzleMaxPressureMpa,
      "喷头最高工作压力",
      { positive: true }
    );
    let status = STATUS.CALCULATED;
    let reason = "计算 P5 位于录入的喷头工作范围内";
    if (!minPressure.ok || !maxPressure.ok) {
      status =
        (!minPressure.ok && !minPressure.missing) ||
        (!maxPressure.ok && !maxPressure.missing)
          ? STATUS.NOT_APPLICABLE
          : STATUS.PENDING;
      reason = !minPressure.ok ? minPressure.reason : maxPressure.reason;
    } else if (maxPressure.value <= minPressure.value) {
      status = STATUS.NOT_APPLICABLE;
      reason = "喷头最高工作压力必须大于最低工作压力";
    } else if (
      nozzlePressureMpa < minPressure.value ||
      nozzlePressureMpa > maxPressure.value
    ) {
      status = STATUS.NOT_APPLICABLE;
      reason = "计算 P5 超出喷头工作压力范围";
    }

    return {
      status: status,
      reason: reason,
      nozzlePressureMpa: makeResult(
        nozzlePressureMpa,
        "MPa",
        status,
        reason,
        "P5 = P3 - ΔP喷灌管 - ΔP其他 - ρgΔz"
      ),
      heightLossMpa: makeResult(
        heightLossMpa,
        "MPa",
        STATUS.CALCULATED,
        height.value >= 0 ? "向上高差增加压力需求" : "向下高差释放压力需求",
        "ΔP高差 = ρgΔz"
      ),
    };
  }

  function missingOrInvalidPressure(validation) {
    const status = validation.status;
    const resultFactory = status === STATUS.PENDING ? missingResult : invalidResult;
    return {
      status: status,
      reason: validation.reason,
      emitterPressureMpa: resultFactory(
        "MPa",
        validation.reason,
        "P滴头 = P4 - ΔP主管 - ΔP节点支管 - ΔP毛管 - ΔP其他 - ρgΔz"
      ),
      heightLossMpa: resultFactory(
        "MPa",
        validation.reason,
        "ΔP高差 = ρgΔz"
      ),
    };
  }

  function calculatePressureBudget(input) {
    const source = validateNumber(input && input.sourceDynamicMpa, "水源动态压力", {
      nonNegative: true,
    });
    const regulatorSet = validateNumber(
      input && input.regulatorSetMpa,
      "减压阀设定压力",
      { nonNegative: true }
    );
    const regulatorDifferential = validateNumber(
      input && input.regulatorMinDifferentialMpa,
      "减压阀最小工作压差",
      { nonNegative: true }
    );
    const backflow = validateNumber(
      input && input.backflowLossMpa,
      "倒流防止器压损",
      { nonNegative: true }
    );
    const filterClean = validateNumber(
      input && input.filterCleanLossMpa,
      "过滤器洁净压损",
      { nonNegative: true }
    );
    const filterDirty = validateNumber(
      input && input.filterDirtyLossMpa,
      "过滤器允许堵塞压损",
      { nonNegative: true }
    );
    const common = [regulatorSet, regulatorDifferential, backflow];
    const dirtyOrderInvalid =
      filterClean.ok && filterDirty.ok && filterDirty.value < filterClean.value;

    function route(routeName, filterName, filterValidation, routeFields) {
      const fields = common.concat([filterValidation]).concat(routeFields);
      const validation = validationStatus(fields);

      if (dirtyOrderInvalid && filterName === "允许堵塞") {
        return {
          status: STATUS.NOT_APPLICABLE,
          reason: "过滤器允许堵塞压损不能小于洁净压损",
          requiredMpa: null,
          marginMpa: null,
        };
      }

      if (validation.status !== STATUS.CALCULATED) {
        return {
          status: validation.status,
          reason: validation.reason,
          requiredMpa: null,
          marginMpa: null,
        };
      }

      const requiredMpa = fields.reduce(function (sum, field) {
        return sum + field.value;
      }, 0);
      let status = STATUS.CALCULATED;
      let reason = routeName + "路（" + filterName + "）所需水源压力已计算";
      let marginMpa = null;

      if (!source.ok) {
        status = source.missing ? STATUS.PENDING : STATUS.NOT_APPLICABLE;
        reason += "；" + source.reason + "，无法计算余量";
      } else {
        marginMpa = source.value - requiredMpa;
        if (marginMpa < 0) {
          status = STATUS.NOT_APPLICABLE;
          reason = routeName + "路（" + filterName + "）水源压力余量为负";
        }
      }

      return {
        status: status,
        reason: reason,
        requiredMpa: requiredMpa,
        marginMpa: marginMpa,
      };
    }

    const controllerA = validateNumber(
      input && input.controllerALossMpa,
      "控制器 A 路压损",
      { nonNegative: true }
    );
    const checkA = validateNumber(input && input.checkALossMpa, "A 路止回阀压损", {
      nonNegative: true,
    });
    const fittingsA = validateNumber(
      input && input.fittingsALossMpa,
      "A 路上游管件压损",
      { nonNegative: true }
    );
    const controllerB = validateNumber(
      input && input.controllerBLossMpa,
      "控制器 B 路压损",
      { nonNegative: true }
    );
    const bypassDifferential = validateNumber(
      input && !isBlank(input.bypassDifferentialMpa)
        ? input.bypassDifferentialMpa
        : input && input.venturiLossMpa,
      "T1/T2 压差旁路当前工况压差",
      { nonNegative: true }
    );
    const checkB = validateNumber(input && input.checkBLossMpa, "B 路止回阀压损", {
      nonNegative: true,
    });
    const fittingsB = validateNumber(
      input && input.fittingsBLossMpa,
      "B 路上游管件压损",
      { nonNegative: true }
    );

    const results = {
      aClean: route("A", "洁净", filterClean, [controllerA, checkA, fittingsA]),
      aDirty: route("A", "允许堵塞", filterDirty, [
        controllerA,
        checkA,
        fittingsA,
      ]),
      bClean: route("B", "洁净", filterClean, [
        controllerB,
        bypassDifferential,
        checkB,
        fittingsB,
      ]),
      bDirty: route("B", "允许堵塞", filterDirty, [
        controllerB,
        bypassDifferential,
        checkB,
        fittingsB,
      ]),
    };

    return {
      status: combineStatus(
        results.aClean.status,
        results.aDirty.status,
        results.bClean.status,
        results.bDirty.status
      ),
      reason:
        "端点调压需求计入公共压力预算；B路仅计一次 T1/T2 压差旁路压差",
      results: results,
      formula:
        "P源,需 = P末端调压设定 + ΔP末端调压,min + ΣΔP公共；B路另加(P1-P2)一次",
    };
  }

  function calculateFertigation(input) {
    const designFlow = validateNumber(input && input.designFlowLph, "系统设计流量", {
      positive: true,
    });
    const waterConcentration = validateNumber(
      input && input.waterConcentration,
      "清水背景浓度",
      { nonNegative: true }
    );
    const motherConcentration = validateNumber(
      input && input.motherConcentration,
      "母液浓度",
      { positive: true }
    );
    const targetConcentration = validateNumber(
      input && input.targetConcentration,
      "目标浓度",
      { positive: true }
    );
    const concentrationValidation = validationStatus([
      designFlow,
      waterConcentration,
      motherConcentration,
      targetConcentration,
    ]);

    if (concentrationValidation.status !== STATUS.CALCULATED) {
      return incompleteFertigation(concentrationValidation);
    }

    if (
      targetConcentration.value <= waterConcentration.value ||
      targetConcentration.value >= motherConcentration.value
    ) {
      return incompleteFertigation({
        status: STATUS.NOT_APPLICABLE,
        reason: "目标浓度必须高于清水背景浓度且低于母液浓度",
      });
    }

    const targetSuctionLph =
      (designFlow.value *
        (targetConcentration.value - waterConcentration.value)) /
      (motherConcentration.value - waterConcentration.value);
    const availableCleanWaterFlowLph = designFlow.value - targetSuctionLph;
    const duration = validateNumber(input && input.durationMinutes, "B 路运行时间", {
      positive: true,
    });
    const residual = validateNumber(input && input.unusableResidualL, "不可吸残余量", {
      nonNegative: true,
    });
    const measured = validateNumber(
      input && input.measuredSuctionLph,
      "实测吸液流量",
      { nonNegative: true }
    );
    let motherVolumeL = null;
    let bucketMinimumL = null;
    let status = STATUS.CALCULATED;
    const reasons = [
      "目标吸液量已按合流后的总流量和浓度质量平衡计算",
      "并联压差旁路不能由末端总流量反推文丘里实际驱动流量",
    ];

    if (duration.ok) {
      motherVolumeL = targetSuctionLph * (duration.value / 60);
      if (residual.ok) {
        bucketMinimumL = motherVolumeL + residual.value;
      } else {
        status = residual.missing ? STATUS.PENDING : STATUS.NOT_APPLICABLE;
        reasons.push(residual.reason);
      }
    } else {
      status = duration.missing ? STATUS.PENDING : STATUS.NOT_APPLICABLE;
      reasons.push(duration.reason);
    }

    let measuredDifferenceLph = null;
    let measuredStatus = STATUS.PENDING;
    let measuredReason = measured.reason;
    if (measured.ok) {
      measuredDifferenceLph = measured.value - targetSuctionLph;
      measuredStatus = STATUS.CALCULATED;
      measuredReason = "正值表示实测吸液量高于目标值";
    } else if (!measured.missing) {
      measuredStatus = STATUS.NOT_APPLICABLE;
      status = combineStatus(status, measuredStatus);
      reasons.push(measured.reason);
    }

    return {
      status: status,
      reason: reasons.join("；"),
      targetSuctionLph: makeResult(
        targetSuctionLph,
        "L/h",
        STATUS.CALCULATED,
        "由系统总流量和浓度质量平衡得到",
        "q吸 = Q设计(C目标-C水)/(C母液-C水)"
      ),
      motiveFlowLph: makeResult(
        null,
        "L/h",
        STATUS.PENDING,
        "须单独实测文丘里旁路驱动流量，不能把系统总流量或清水余量作为驱动流量",
        "Q末端 = Q减压主路 + Q文丘里驱动 + q吸"
      ),
      availableCleanWaterFlowLph: makeResult(
        availableCleanWaterFlowLph,
        "L/h",
        STATUS.CALCULATED,
        "合流后总流量中除母液以外的清水总量，不等于文丘里旁路驱动流量",
        "Q清水总量 = Q设计 - q吸"
      ),
      motherVolumeL: makeResult(
        motherVolumeL,
        "L",
        motherVolumeL === null ? status : STATUS.CALCULATED,
        motherVolumeL === null ? reasons[reasons.length - 1] : "B 路周期所需母液体积",
        "V母液 = q吸 × tB"
      ),
      bucketMinimumL: makeResult(
        bucketMinimumL,
        "L",
        bucketMinimumL === null ? status : STATUS.CALCULATED,
        bucketMinimumL === null
          ? reasons[reasons.length - 1]
          : "不含额外安全余量的最低有效容积",
        "V桶,有效 ≥ V母液 + 不可吸残余量"
      ),
      measuredDifferenceLph: makeResult(
        measuredDifferenceLph,
        "L/h",
        measuredStatus,
        measuredReason,
        "Δq吸 = q吸,实测 - q吸,目标"
      ),
    };
  }

  function incompleteFertigation(validation) {
    const factory =
      validation.status === STATUS.PENDING ? missingResult : invalidResult;
    return {
      status: validation.status,
      reason: validation.reason,
      targetSuctionLph: factory(
        "L/h",
        validation.reason,
        "q吸 = Q设计(C目标-C水)/(C母液-C水)"
      ),
      motiveFlowLph: factory(
        "L/h",
        validation.reason,
        "Q末端 = Q减压主路 + Q文丘里驱动 + q吸"
      ),
      availableCleanWaterFlowLph: factory(
        "L/h",
        validation.reason,
        "Q清水总量 = Q设计 - q吸"
      ),
      motherVolumeL: factory(
        "L",
        validation.reason,
        "V母液 = q吸 × tB"
      ),
      bucketMinimumL: factory(
        "L",
        validation.reason,
        "V桶,有效 ≥ V母液 + 不可吸残余量"
      ),
      measuredDifferenceLph: factory(
        "L/h",
        validation.reason,
        "Δq吸 = q吸,实测 - q吸,目标"
      ),
    };
  }

  function calculateVenturi(input) {
    const requiredText = [
      { value: input && input.model, label: "文丘里型号" },
      { value: input && input.sourceReference, label: "厂家资料来源" },
    ];
    const missingText = requiredText.find(function (item) {
      return !item.value || !String(item.value).trim();
    });
    const numeric = {
      maxPressure: validateNumber(input && input.maxPressureMpa, "最大工作压力", {
        positive: true,
      }),
      minMotive: validateNumber(input && input.minMotiveFlowLph, "最小驱动流量", {
        nonNegative: true,
      }),
      maxMotive: validateNumber(input && input.maxMotiveFlowLph, "最大驱动流量", {
        positive: true,
      }),
      curveP1: validateNumber(input && input.curveP1Mpa, "曲线工况 P1", {
        nonNegative: true,
      }),
      curveP2: validateNumber(input && input.curveP2Mpa, "曲线工况 P2", {
        nonNegative: true,
      }),
      curveMotive: validateNumber(
        input && input.curveMotiveFlowLph,
        "曲线工况驱动流量",
        { positive: true }
      ),
      curveSuction: validateNumber(
        input && input.curveSuctionFlowLph,
        "曲线工况吸液量",
        { nonNegative: true }
      ),
      actualP1: validateNumber(input && input.actualP1Mpa, "实测 P1", {
        nonNegative: true,
      }),
      actualP2: validateNumber(input && input.actualP2Mpa, "实测 P2", {
        nonNegative: true,
      }),
      motive: validateNumber(
        input && !isBlank(input.actualMotiveFlowLph)
          ? input.actualMotiveFlowLph
          : input && input.motiveFlowLph,
        "实测文丘里驱动流量",
        {
        positive: true,
        }
      ),
      targetSuction: validateNumber(
        input && input.targetSuctionLph,
        "目标吸液量",
        { nonNegative: true }
      ),
    };
    const validation = validationStatus(Object.values(numeric));
    let status = validation.status;
    let reason = validation.reason;

    if (validation.status === STATUS.NOT_APPLICABLE) {
      status = validation.status;
      reason = validation.reason;
    } else if (missingText) {
      status = STATUS.PENDING;
      reason = "缺少" + missingText.label;
    } else if (validation.status === STATUS.CALCULATED) {
      if (numeric.maxMotive.value < numeric.minMotive.value) {
        status = STATUS.NOT_APPLICABLE;
        reason = "最大驱动流量不能小于最小驱动流量";
      } else if (
        numeric.curveP2.value >= numeric.curveP1.value ||
        numeric.actualP2.value >= numeric.actualP1.value
      ) {
        status = STATUS.NOT_APPLICABLE;
        reason = "入口压力必须高于出口压力";
      } else if (numeric.actualP1.value > numeric.maxPressure.value) {
        status = STATUS.NOT_APPLICABLE;
        reason = "实测 P1 超过厂家最大工作压力";
      } else if (
        numeric.motive.value < numeric.minMotive.value ||
        numeric.motive.value > numeric.maxMotive.value
      ) {
        status = STATUS.NOT_APPLICABLE;
        reason = "实测文丘里驱动流量超出厂家允许范围";
      } else if (
        input &&
        input.curvePointConfirmed &&
        numeric.curveSuction.value < numeric.targetSuction.value
      ) {
        status = STATUS.NOT_APPLICABLE;
        reason = "所选厂家工况吸液量低于目标值";
      } else if (!(input && input.curvePointConfirmed)) {
        status = STATUS.PENDING;
        reason = "尚未确认所选厂家工况适用于当前 P1/P2 和实测驱动流量";
      } else {
        status = STATUS.CALCULATED;
        reason = "资料校核条件齐全；仍需现场清水验证，不能视为验收通过";
      }
    }

    function difference(left, right) {
      return left.ok && right.ok ? left.value - right.value : null;
    }

    return {
      status: status,
      reason: reason,
      actualDifferentialMpa: makeResult(
        difference(numeric.actualP1, numeric.actualP2),
        "MPa",
        numeric.actualP1.ok && numeric.actualP2.ok
          ? STATUS.CALCULATED
          : status,
        "P1 与 P2 的实测差值",
        "ΔP文丘里,实测 = P1 - P2"
      ),
      curveDifferentialMpa: makeResult(
        difference(numeric.curveP1, numeric.curveP2),
        "MPa",
        numeric.curveP1.ok && numeric.curveP2.ok
          ? STATUS.CALCULATED
          : status,
        "选定厂家曲线工况的压差",
        "ΔP文丘里,曲线 = P1,曲线 - P2,曲线"
      ),
      motiveDifferenceLph: makeResult(
        difference(numeric.motive, numeric.curveMotive),
        "L/h",
        numeric.motive.ok && numeric.curveMotive.ok
          ? STATUS.CALCULATED
          : status,
        "正值表示实测驱动流量高于所选曲线工况",
        "ΔQ驱动 = Q驱动,实测 - Q驱动,曲线"
      ),
      suctionMarginLph: makeResult(
        difference(numeric.curveSuction, numeric.targetSuction),
        "L/h",
        numeric.curveSuction.ok && numeric.targetSuction.ok
          ? status
          : STATUS.PENDING,
        "正值表示曲线吸液量覆盖目标值",
        "吸液余量 = q吸,曲线 - q吸,目标"
      ),
    };
  }

  function calculateFlush(input) {
    const volume = validateNumber(input && input.totalVolumeL, "系统管内容积", {
      positive: true,
    });
    const flow = validateNumber(input && input.actualFlushFlowLph, "实测冲洗流量", {
      positive: true,
    });
    const validation = validationStatus([volume, flow]);
    const status = validation.status;

    if (status !== STATUS.CALCULATED) {
      const factory = status === STATUS.PENDING ? missingResult : invalidResult;
      return {
        status: status,
        reason: validation.reason,
        flushMinutes: factory(
          "min",
          validation.reason,
          "t理论 = V管/Q实测 × 60"
        ),
      };
    }

    return {
      status: STATUS.CALCULATED,
      reason: "仅表示通过一个理论管内容积的时间，冲洗终点仍需现场确认",
      flushMinutes: makeResult(
        (volume.value / flow.value) * 60,
        "min",
        STATUS.CALCULATED,
        "末端电导率或既定水质指标恢复后才能结束冲洗",
        "t理论 = V管/Q实测 × 60"
      ),
    };
  }

  function calculateUniformity(input) {
    const duration = validateNumber(
      input && input.collectionMinutes,
      "统一收集时间",
      { positive: true }
    );
    const volumes = input && Array.isArray(input.volumesMl) ? input.volumesMl : [];

    if (volumes.length < 4 || volumes.length % 4 !== 0) {
      return invalidUniformity("采样数量必须不少于 4 个且为 4 的倍数");
    }
    if (!duration.ok) {
      return duration.missing
        ? pendingUniformity(duration.reason)
        : invalidUniformity(duration.reason);
    }

    const validatedVolumes = volumes.map(function (volume, index) {
      return validateNumber(volume, "第 " + (index + 1) + " 个收集体积", {
        positive: true,
      });
    });
    const validation = validationStatus(validatedVolumes);
    if (validation.status !== STATUS.CALCULATED) {
      return validation.status === STATUS.PENDING
        ? pendingUniformity(validation.reason)
        : invalidUniformity(validation.reason);
    }

    const flowsLph = validatedVolumes.map(function (volume) {
      return (volume.value / 1000) * (60 / duration.value);
    });
    const averageLph =
      flowsLph.reduce(function (sum, value) {
        return sum + value;
      }, 0) / flowsLph.length;
    const lowestCount = flowsLph.length / 4;
    const sorted = flowsLph.slice().sort(function (a, b) {
      return a - b;
    });
    const lowestAverageLph =
      sorted.slice(0, lowestCount).reduce(function (sum, value) {
        return sum + value;
      }, 0) / lowestCount;
    const dulqPercent = (lowestAverageLph / averageLph) * 100;

    return {
      status: STATUS.CALCULATED,
      reason: "均匀度已计算；是否合格仍按滴头厂家和项目目标判断",
      flowsLph: flowsLph,
      averageLph: makeResult(
        averageLph,
        "L/h",
        STATUS.CALCULATED,
        "全部采样滴头的算术平均流量",
        "q平均 = Σqi/n"
      ),
      lowestAverageLph: makeResult(
        lowestAverageLph,
        "L/h",
        STATUS.CALCULATED,
        "最低四分位平均流量",
        "q低四分位 = 最低 n/4 个流量的平均值"
      ),
      dulqPercent: makeResult(
        dulqPercent,
        "%",
        STATUS.CALCULATED,
        "本工具不内置项目合格阈值",
        "DUlq = q低四分位/q平均 × 100%"
      ),
    };
  }

  const MODE_CONTRACTS = Object.freeze({
    停止: Object.freeze({
      controllerProgram: "A/B均关",
      selectors: Object.freeze({ endpoint: "保持原位", source: "关闭" }),
      purpose: "检修、换液",
    }),
    清水滴灌: Object.freeze({
      controllerProgram: "A",
      selectors: Object.freeze({ endpoint: "滴灌", source: "关闭" }),
      purpose: "普通灌溉",
    }),
    滴灌施肥: Object.freeze({
      controllerProgram: "A→B→A",
      selectors: Object.freeze({ endpoint: "滴灌", source: "肥料" }),
      purpose: "预灌、施肥、冲洗",
    }),
    清水喷灌: Object.freeze({
      controllerProgram: "A",
      selectors: Object.freeze({ endpoint: "喷灌", source: "关闭" }),
      purpose: "喷头测试、清水输送",
    }),
    上空喷药: Object.freeze({
      controllerProgram: "A→B→A",
      selectors: Object.freeze({ endpoint: "喷灌", source: "农药" }),
      purpose: "清水输送、喷药、管内容积置换",
    }),
  });

  function validateSelectorState(state) {
    const values = state || {};
    const endpoint = values.endpoint || "保持原位";
    const source = values.source || "关闭";
    if (!["保持原位", "滴灌", "喷灌"].includes(endpoint)) {
      return invalidResult(
        "",
        "末端 L 型三通球阀位置无效",
        "MV-END = 滴灌 / 喷灌；停机时可保持原位"
      );
    }
    if (!["关闭", "肥料", "农药"].includes(source)) {
      return invalidResult("", "吸液三通选择阀位置无效", "MV-SOURCE = 关闭 / 肥料 / 农药");
    }
    if (source === "农药" && endpoint !== "喷灌") {
      return invalidResult("", "禁止农药进入滴灌支路", "MV-SOURCE=农药 → MV-END=喷灌");
    }
    if (source === "肥料" && endpoint !== "滴灌") {
      return invalidResult("", "禁止肥料进入喷灌支路", "MV-SOURCE=肥料 → MV-END=滴灌");
    }
    if (endpoint === "保持原位" && source !== "关闭") {
      return invalidResult(
        "",
        "停机保持原末端位置时液源选择阀必须关闭",
        "A/B均关且 MV-SOURCE=关闭"
      );
    }
    return makeResult(
      1,
      "",
      STATUS.CALCULATED,
      "末端 L 型二选一三通与三位液源选择阀满足液源/末端约束",
      "MV-END = 滴灌 / 喷灌；MV-SOURCE = 肥料 / 关闭 / 农药"
    );
  }

  function calculateModeContract(mode) {
    const selected =
      typeof mode === "string" ? mode : mode && mode.selected;
    const contract = MODE_CONTRACTS[selected];
    if (!contract) {
      return {
        status: STATUS.NOT_APPLICABLE,
        reason: "未知现场模式",
        selected: selected || "",
        controllerProgram: "",
        selectors: null,
        purpose: "",
      };
    }
    const validation = validateSelectorState(contract.selectors);
    return {
      status: validation.status,
      reason: validation.reason,
      selected: selected,
      controllerProgram: contract.controllerProgram,
      selectors: contract.selectors,
      purpose: contract.purpose,
    };
  }

  function migrateCalculationCase(calculationCase) {
    if (!calculationCase) {
      throw new Error("工况JSON为空。");
    }
    if (calculationCase.schema_version === "2.1.0") {
      return calculationCase;
    }
    if (calculationCase.schema_version !== "2.0.0") {
      throw new Error("工况JSON版本不受支持。");
    }
    const oldPipes = calculationCase.pipes || {};
    const oldLosses = calculationCase.component_losses || {};
    const oldVenturi = calculationCase.venturi || {};
    const oldSprayCurve = oldVenturi.sprayCurve || {};
    return {
      ...calculationCase,
      schema_version: "2.1.0",
      system: {
        ...(calculationCase.system || {}),
        emittersPerNode: 2,
      },
      pipes: {
        ...oldPipes,
        nodeBranch: {
          innerDiameterMm: null,
          outerDiameterMm: 12,
          lengthM: null,
          roughnessMm: null,
          localK: null,
        },
        capillary: oldPipes.capillary || oldPipes.lateral || {
          innerDiameterMm: 3,
          outerDiameterMm: 5,
          lengthM: null,
          roughnessMm: null,
          localK: null,
        },
      },
      component_losses: {
        ...oldLosses,
        bypassDifferentialMpa:
          oldLosses.bypassDifferentialMpa ??
          oldLosses.venturiLossMpa ??
          null,
      },
      venturi: {
        ...oldVenturi,
        actualMotiveFlowLph: null,
        sprayCurve: {
          ...oldSprayCurve,
          actualMotiveFlowLph: null,
        },
      },
    };
  }

  function pendingUniformity(reason) {
    return {
      status: STATUS.PENDING,
      reason: reason,
      flowsLph: [],
      averageLph: missingResult("L/h", reason, "q平均 = Σqi/n"),
      lowestAverageLph: missingResult(
        "L/h",
        reason,
        "q低四分位 = 最低 n/4 个流量的平均值"
      ),
      dulqPercent: missingResult(
        "%",
        reason,
        "DUlq = q低四分位/q平均 × 100%"
      ),
    };
  }

  function invalidUniformity(reason) {
    return {
      status: STATUS.NOT_APPLICABLE,
      reason: reason,
      flowsLph: [],
      averageLph: invalidResult("L/h", reason, "q平均 = Σqi/n"),
      lowestAverageLph: invalidResult(
        "L/h",
        reason,
        "q低四分位 = 最低 n/4 个流量的平均值"
      ),
      dulqPercent: invalidResult(
        "%",
        reason,
        "DUlq = q低四分位/q平均 × 100%"
      ),
    };
  }

  return Object.freeze({
    STATUS: STATUS,
    calculateSystemFlow: calculateSystemFlow,
    calculateOutletFlow: calculateOutletFlow,
    calculatePipe: calculatePipe,
    calculateHydraulics: calculateHydraulics,
    calculateSprayHydraulics: calculateSprayHydraulics,
    calculateEmitterPressure: calculateEmitterPressure,
    calculateNozzlePressure: calculateNozzlePressure,
    calculatePressureBudget: calculatePressureBudget,
    calculateFertigation: calculateFertigation,
    calculateVenturi: calculateVenturi,
    calculateFlush: calculateFlush,
    calculateUniformity: calculateUniformity,
    calculateModeContract: calculateModeContract,
    validateSelectorState: validateSelectorState,
    migrateCalculationCase: migrateCalculationCase,
  });
});
