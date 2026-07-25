const test = require("node:test");
const assert = require("node:assert/strict");
const calculator = require("../../src/fertigation_pipeline/calculation/core.js");

const water20C = {
  densityKgM3: 1000,
  kinematicViscosityM2s: 1.004e-6,
};

function closeTo(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`
  );
}

test("ten-emitter v5 example separates main, node branch, and capillary", () => {
  const result = calculator.calculateHydraulics({
    system: { emitterCount: 10, emitterFlowLph: 2, emittersPerNode: 2 },
    water: water20C,
    mainPipe: {
      innerDiameterMm: 9,
      lengthM: 10,
      roughnessMm: 0,
      localK: 0,
    },
    nodeBranchPipe: {
      innerDiameterMm: 9,
      lengthM: 1,
      roughnessMm: 0,
      localK: 0,
    },
    capillaryPipe: {
      innerDiameterMm: 3,
      lengthM: 1,
      roughnessMm: 0,
      localK: 0,
    },
  });

  assert.equal(result.status, calculator.STATUS.CALCULATED);
  assert.equal(result.systemFlow.designFlowLph.value, 20);
  assert.equal(result.nodeCount.value, 5);
  closeTo(result.main.values.velocityMs, 0.08733, 0.00001, "main velocity");
  closeTo(
    result.nodeBranch.values.velocityMs,
    0.01747,
    0.00001,
    "two-emitter node-branch velocity"
  );
  closeTo(result.capillary.values.velocityMs, 0.07860, 0.00001, "capillary velocity");
  closeTo(
    result.capillary.values.lineLossMpa,
    0.0002801,
    0.000001,
    "capillary loss"
  );
  closeTo(result.totalVolumeL.value, 1.0249, 0.001, "total pipe volume");
});

test("missing OD12 node branch parameters keep the v5 hydraulic result pending", () => {
  const result = calculator.calculateHydraulics({
    system: { emitterCount: 10, emitterFlowLph: 2, emittersPerNode: 2 },
    water: water20C,
    mainPipe: {
      innerDiameterMm: 9,
      lengthM: 10,
      roughnessMm: 0,
      localK: 0,
    },
    nodeBranchPipe: {
      innerDiameterMm: null,
      lengthM: null,
      roughnessMm: null,
      localK: null,
    },
    capillaryPipe: {
      innerDiameterMm: 3,
      lengthM: 1,
      roughnessMm: 0,
      localK: 0,
    },
  });

  assert.equal(result.status, calculator.STATUS.PENDING);
  assert.equal(result.totalVolumeL.value, null);
  assert.equal(result.nodeCount.value, 5);
});

test("turbulent pipe uses Swamee-Jain and transition flow stays pending", () => {
  const turbulent = calculator.calculatePipe(
    1000,
    {
      innerDiameterMm: 20,
      lengthM: 10,
      roughnessMm: 0.0015,
      localK: 1.2,
    },
    water20C
  );
  assert.equal(turbulent.regime, "湍流");
  assert.equal(turbulent.status, calculator.STATUS.CALCULATED);
  assert.ok(turbulent.values.frictionFactor > 0);
  assert.ok(turbulent.values.totalLossMpa > turbulent.values.lineLossMpa);

  const transition = calculator.calculatePipe(
    170,
    {
      innerDiameterMm: 20,
      lengthM: 10,
      roughnessMm: 0.0015,
      localK: 0,
    },
    water20C
  );
  assert.equal(transition.regime, "过渡区");
  assert.equal(transition.status, calculator.STATUS.PENDING);
  assert.ok(transition.values.lineLossMpa > 0);
});

test("non-laminar pipe without roughness does not invent a pressure loss", () => {
  const result = calculator.calculatePipe(
    1000,
    { innerDiameterMm: 20, lengthM: 10, localK: 0 },
    water20C
  );

  assert.equal(result.status, calculator.STATUS.PENDING);
  assert.equal(result.values.frictionFactor, null);
  assert.equal(result.values.lineLossMpa, null);
  assert.equal(result.values.totalLossMpa, null);
});

test("emitter pressure handles positive and negative elevation", () => {
  const base = {
    p4Mpa: 0.15,
    mainLossMpa: 0.01,
    nodeBranchLossMpa: 0.003,
    capillaryLossMpa: 0.002,
    downstreamLossMpa: 0.002,
    densityKgM3: 1000,
    emitterMinPressureMpa: 0.05,
    emitterMaxPressureMpa: 0.2,
  };
  const uphill = calculator.calculateEmitterPressure({
    ...base,
    heightDifferenceM: 2,
  });
  const downhill = calculator.calculateEmitterPressure({
    ...base,
    heightDifferenceM: -2,
  });

  assert.equal(uphill.status, calculator.STATUS.CALCULATED);
  assert.ok(uphill.emitterPressureMpa.value < downhill.emitterPressureMpa.value);
  closeTo(
    downhill.emitterPressureMpa.value - uphill.emitterPressureMpa.value,
    0.0392266,
    0.000001,
    "four metres of elevation difference"
  );
});

test("spray hydraulics calculates total flow, pipe volume, and P5 pressure", () => {
  const hydraulics = calculator.calculateSprayHydraulics({
    system: { nozzleCount: 4, nozzleFlowLph: 120 },
    water: water20C,
    pipe: {
      innerDiameterMm: 16,
      lengthM: 12,
      roughnessMm: 0.0015,
      localK: 2,
    },
  });
  assert.equal(hydraulics.systemFlow.designFlowLph.value, 480);
  assert.ok(hydraulics.pipe.values.totalLossMpa > 0);
  assert.ok(hydraulics.totalVolumeL.value > 2);

  const pressure = calculator.calculateNozzlePressure({
    p3Mpa: 0.25,
    pipeLossMpa: hydraulics.pipe.values.totalLossMpa,
    downstreamLossMpa: 0.01,
    heightDifferenceM: 2,
    densityKgM3: 1000,
    nozzleMinPressureMpa: 0.1,
    nozzleMaxPressureMpa: 0.3,
  });
  assert.equal(pressure.status, calculator.STATUS.CALCULATED);
  assert.ok(pressure.nozzlePressureMpa.value < 0.25);
});

test("spray pressure detects insufficient pressure and undersized pipes remain visible", () => {
  const pipe = calculator.calculateSprayHydraulics({
    system: { nozzleCount: 8, nozzleFlowLph: 180 },
    water: water20C,
    pipe: {
      innerDiameterMm: 6,
      lengthM: 20,
      roughnessMm: 0.0015,
      localK: 4,
    },
  });
  assert.ok(pipe.pipe.values.totalLossMpa > 0.1);
  const pressure = calculator.calculateNozzlePressure({
    p3Mpa: 0.12,
    pipeLossMpa: pipe.pipe.values.totalLossMpa,
    downstreamLossMpa: 0.01,
    heightDifferenceM: 2,
    densityKgM3: 1000,
    nozzleMinPressureMpa: 0.1,
    nozzleMaxPressureMpa: 0.3,
  });
  assert.equal(pressure.status, calculator.STATUS.NOT_APPLICABLE);
});

test("pressure budget covers clean and dirty filters and detects negative margin", () => {
  const result = calculator.calculatePressureBudget({
    sourceDynamicMpa: 0.3,
    regulatorSetMpa: 0.1,
    regulatorMinDifferentialMpa: 0.03,
    backflowLossMpa: 0.02,
    filterCleanLossMpa: 0.01,
    filterDirtyLossMpa: 0.04,
    controllerALossMpa: 0.01,
    checkALossMpa: 0.005,
    fittingsALossMpa: 0.005,
    controllerBLossMpa: 0.02,
    bypassDifferentialMpa: 0.08,
    checkBLossMpa: 0.005,
    fittingsBLossMpa: 0.005,
  });

  closeTo(result.results.aClean.requiredMpa, 0.18, 1e-12, "A clean required");
  closeTo(result.results.bDirty.requiredMpa, 0.3, 1e-12, "B dirty required");
  assert.equal(result.results.bDirty.status, calculator.STATUS.CALCULATED);

  const insufficient = calculator.calculatePressureBudget({
    sourceDynamicMpa: 0.2,
    regulatorSetMpa: 0.1,
    regulatorMinDifferentialMpa: 0.03,
    backflowLossMpa: 0.02,
    filterCleanLossMpa: 0.01,
    filterDirtyLossMpa: 0.04,
    controllerALossMpa: 0.01,
    checkALossMpa: 0.005,
    fittingsALossMpa: 0.005,
    controllerBLossMpa: 0.02,
    bypassDifferentialMpa: 0.08,
    checkBLossMpa: 0.005,
    fittingsBLossMpa: 0.005,
  });
  assert.equal(
    insufficient.results.bDirty.status,
    calculator.STATUS.NOT_APPLICABLE
  );
});

test("fertigation mass balance calculates suction, volume, and bucket minimum", () => {
  const result = calculator.calculateFertigation({
    designFlowLph: 100,
    waterConcentration: 0,
    motherConcentration: 100,
    targetConcentration: 2,
    durationMinutes: 30,
    unusableResidualL: 0.5,
    measuredSuctionLph: 2.1,
  });

  assert.equal(result.status, calculator.STATUS.CALCULATED);
  closeTo(result.targetSuctionLph.value, 2, 1e-12, "target suction");
  assert.equal(result.motiveFlowLph.value, null);
  assert.equal(result.motiveFlowLph.status, calculator.STATUS.PENDING);
  closeTo(
    result.availableCleanWaterFlowLph.value,
    98,
    1e-12,
    "clean-water mass-balance remainder"
  );
  closeTo(result.motherVolumeL.value, 1, 1e-12, "mother volume");
  closeTo(result.bucketMinimumL.value, 1.5, 1e-12, "bucket minimum");
  closeTo(result.measuredDifferenceLph.value, 0.1, 1e-12, "measured delta");
});

test("fertigation rejects invalid concentration order", () => {
  const result = calculator.calculateFertigation({
    designFlowLph: 100,
    waterConcentration: 0,
    motherConcentration: 2,
    targetConcentration: 2,
    durationMinutes: 30,
    unusableResidualL: 0,
  });
  assert.equal(result.status, calculator.STATUS.NOT_APPLICABLE);
  assert.equal(result.targetSuctionLph.value, null);
});

test("invalid optional measured suction is surfaced in the section status", () => {
  const result = calculator.calculateFertigation({
    designFlowLph: 100,
    waterConcentration: 0,
    motherConcentration: 100,
    targetConcentration: 2,
    durationMinutes: 30,
    unusableResidualL: 0,
    measuredSuctionLph: -1,
  });

  assert.equal(result.status, calculator.STATUS.NOT_APPLICABLE);
  assert.equal(
    result.measuredDifferenceLph.status,
    calculator.STATUS.NOT_APPLICABLE
  );
});

test("venturi stays pending without confirmation and rejects hard limits", () => {
  const base = {
    model: "示例型号",
    sourceReference: "厂家数据表 2026-01",
    maxPressureMpa: 0.5,
    minMotiveFlowLph: 80,
    maxMotiveFlowLph: 150,
    curveP1Mpa: 0.3,
    curveP2Mpa: 0.15,
    curveMotiveFlowLph: 100,
    curveSuctionFlowLph: 5,
    actualP1Mpa: 0.3,
    actualP2Mpa: 0.15,
    actualMotiveFlowLph: 100,
    targetSuctionLph: 4,
  };

  const pending = calculator.calculateVenturi(base);
  assert.equal(pending.status, calculator.STATUS.PENDING);

  const calculated = calculator.calculateVenturi({
    ...base,
    curvePointConfirmed: true,
  });
  assert.equal(calculated.status, calculator.STATUS.CALCULATED);
  assert.equal(calculated.suctionMarginLph.value, 1);

  const outsideRange = calculator.calculateVenturi({
    ...base,
    actualMotiveFlowLph: 50,
    curvePointConfirmed: true,
  });
  assert.equal(outsideRange.status, calculator.STATUS.NOT_APPLICABLE);

  const insufficientSuction = calculator.calculateVenturi({
    ...base,
    targetSuctionLph: 6,
    curvePointConfirmed: true,
  });
  assert.equal(insufficientSuction.status, calculator.STATUS.NOT_APPLICABLE);
});

test("venturi rejects non-positive pressure differential and stays pending without actual motive flow", () => {
  const base = {
    model: "示例型号",
    sourceReference: "厂家曲线",
    maxPressureMpa: 0.5,
    minMotiveFlowLph: 80,
    maxMotiveFlowLph: 150,
    curveP1Mpa: 0.3,
    curveP2Mpa: 0.15,
    curveMotiveFlowLph: 100,
    curveSuctionFlowLph: 5,
    targetSuctionLph: 4,
    curvePointConfirmed: true,
  };

  const invalidDifferential = calculator.calculateVenturi({
    ...base,
    actualP1Mpa: 0.15,
    actualP2Mpa: 0.15,
    actualMotiveFlowLph: 100,
  });
  assert.equal(invalidDifferential.status, calculator.STATUS.NOT_APPLICABLE);

  const missingMotive = calculator.calculateVenturi({
    ...base,
    actualP1Mpa: 0.3,
    actualP2Mpa: 0.15,
  });
  assert.equal(missingMotive.status, calculator.STATUS.PENDING);

  const missingCurveConfirmation = calculator.calculateVenturi({
    ...base,
    actualP1Mpa: 0.3,
    actualP2Mpa: 0.15,
    actualMotiveFlowLph: 100,
    curvePointConfirmed: false,
  });
  assert.equal(missingCurveConfirmation.status, calculator.STATUS.PENDING);
});

test("invalid venturi numbers are not hidden by missing text metadata", () => {
  const result = calculator.calculateVenturi({
    model: "",
    sourceReference: "",
    maxPressureMpa: -1,
  });

  assert.equal(result.status, calculator.STATUS.NOT_APPLICABLE);
  assert.match(result.reason, /最大工作压力/);
});

test("flush time and low-quarter distribution uniformity are transparent", () => {
  const flush = calculator.calculateFlush({
    totalVolumeL: 0.665,
    actualFlushFlowLph: 8,
  });
  closeTo(flush.flushMinutes.value, 4.9875, 1e-12, "flush time");

  const uniformity = calculator.calculateUniformity({
    collectionMinutes: 10,
    volumesMl: [300, 310, 290, 100],
  });
  assert.equal(uniformity.status, calculator.STATUS.CALCULATED);
  closeTo(uniformity.averageLph.value, 1.5, 1e-12, "average emitter flow");
  closeTo(
    uniformity.lowestAverageLph.value,
    0.6,
    1e-12,
    "lowest-quarter average"
  );
  closeTo(uniformity.dulqPercent.value, 40, 1e-12, "DUlq");
});

test("uniformity validates sample count and positive measurements", () => {
  assert.equal(
    calculator.calculateUniformity({
      collectionMinutes: 10,
      volumesMl: [100, 100, 100],
    }).status,
    calculator.STATUS.NOT_APPLICABLE
  );

  assert.equal(
    calculator.calculateUniformity({
      collectionMinutes: 10,
      volumesMl: [100, 100, 100, 0],
    }).status,
    calculator.STATUS.NOT_APPLICABLE
  );
});

test("five modes map to an L-port endpoint selector and forbidden pairings are rejected", () => {
  const expected = {
    停止: { endpoint: "保持原位", source: "关闭" },
    清水滴灌: { endpoint: "滴灌", source: "关闭" },
    滴灌施肥: { endpoint: "滴灌", source: "肥料" },
    清水喷灌: { endpoint: "喷灌", source: "关闭" },
    上空喷药: { endpoint: "喷灌", source: "农药" },
  };
  for (const [mode, selectorPositions] of Object.entries(expected)) {
    const result = calculator.calculateModeContract(mode);
    assert.equal(result.status, calculator.STATUS.CALCULATED);
    assert.deepEqual(result.selectors, selectorPositions);
  }
  assert.equal(
    calculator.validateSelectorState({ endpoint: "滴灌", source: "农药" }).status,
    calculator.STATUS.NOT_APPLICABLE
  );
  assert.equal(
    calculator.validateSelectorState({ endpoint: "喷灌", source: "肥料" }).status,
    calculator.STATUS.NOT_APPLICABLE
  );
  assert.equal(
    calculator.validateSelectorState({ endpoint: "滴灌+喷灌", source: "关闭" }).status,
    calculator.STATUS.NOT_APPLICABLE
  );
  assert.equal(
    calculator.validateSelectorState({ endpoint: "保持原位", source: "肥料" }).status,
    calculator.STATUS.NOT_APPLICABLE
  );
});

test("schema 2.0 cases migrate lateral data to v2.1 capillary fields", () => {
  const migrated = calculator.migrateCalculationCase({
    schema_version: "2.0.0",
    system: { emitterCount: 4, emitterFlowLph: 2 },
    pipes: {
      main: { innerDiameterMm: 9, outerDiameterMm: 12 },
      lateral: {
        innerDiameterMm: 3,
        outerDiameterMm: 5,
        lengthM: 1,
        roughnessMm: 0,
        localK: 0,
      },
    },
    component_losses: { venturiLossMpa: 0.08 },
    venturi: {
      sprayCurve: {
        curveP1Mpa: 0.3,
        curveP2Mpa: 0.15,
      },
    },
  });

  assert.equal(migrated.schema_version, "2.1.0");
  assert.equal(migrated.system.emittersPerNode, 2);
  assert.equal(migrated.pipes.nodeBranch.outerDiameterMm, 12);
  assert.equal(migrated.pipes.nodeBranch.innerDiameterMm, null);
  assert.deepEqual(migrated.pipes.capillary, migrated.pipes.lateral);
  assert.equal(migrated.component_losses.bypassDifferentialMpa, 0.08);
  assert.equal(migrated.venturi.actualMotiveFlowLph, null);
  assert.equal(migrated.venturi.sprayCurve.actualMotiveFlowLph, null);
});
