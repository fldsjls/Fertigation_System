const test = require("node:test");
const assert = require("node:assert/strict");

const calculator = require("../../src/fertigation_pipeline/calculation/core.js");
const {
  deriveAdapterSuggestion,
} = require("../../src/fertigation_pipeline/data/interface-workbook.js");

const elevation = require("../fixtures/elevation-cases.json");
const missingCurve = require("../fixtures/venturi-missing-curve.json");
const insufficientFlow = require("../fixtures/venturi-insufficient-flow.json");
const threadMismatch = require("../fixtures/interface-thread-mismatch.json");
const filterClogged = require("../fixtures/filter-clogged-low-pressure.json");

test("elevation fixture covers zero, uphill, and downhill pressure", () => {
  const results = Object.fromEntries(
    elevation.cases.map((scenario) => [
      scenario.name,
      calculator.calculateEmitterPressure({
        ...elevation.base,
        heightDifferenceM: scenario.heightDifferenceM,
      }),
    ])
  );

  assert.equal(results.zero.status, calculator.STATUS.CALCULATED);
  assert.ok(
    results.uphill.emitterPressureMpa.value <
      results.zero.emitterPressureMpa.value
  );
  assert.ok(
    results.downhill.emitterPressureMpa.value >
      results.zero.emitterPressureMpa.value
  );
});

test("venturi fixtures distinguish missing evidence and hard flow failure", () => {
  assert.equal(
    calculator.calculateVenturi(missingCurve).status,
    calculator.STATUS.PENDING
  );
  assert.equal(
    calculator.calculateVenturi(insufficientFlow).status,
    calculator.STATUS.NOT_APPLICABLE
  );
});

test("interface mismatch fixture never reports a direct connection", () => {
  const result = deriveAdapterSuggestion(
    threadMismatch.from,
    threadMismatch.to,
    {}
  );
  assert.notEqual(result.status, "可直连");
  assert.match(result.suggestion, /牙型转换|变径/);
});

test("clogged-filter fixture exposes insufficient B-route pressure", () => {
  const result = calculator.calculatePressureBudget(filterClogged);
  assert.equal(
    result.results.bDirty.status,
    calculator.STATUS.NOT_APPLICABLE
  );
  assert.ok(result.results.bDirty.marginMpa < 0);
});
