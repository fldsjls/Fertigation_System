const test = require("node:test");
const assert = require("node:assert/strict");

const {
  deriveAdapterSuggestion,
  validateSystemData,
} = require("../../src/fertigation_pipeline/data/interface-workbook.js");

const rules = require("../../config/fertigation/data/rules.json");

function port(overrides = {}) {
  return {
    port_id: "P",
    thread_standard: "G",
    nominal_size: "1/2",
    gender: "外牙",
    seal_method: "端面垫片/O形圈",
    status: "已确定",
    ...overrides,
  };
}

test("confirmed matching G ports are direct only when sealing also matches", () => {
  const result = deriveAdapterSuggestion(
    port({ port_id: "A", gender: "外牙" }),
    port({ port_id: "B", gender: "内牙" }),
    {}
  );
  assert.equal(result.status, "可直连");

  const sealMismatch = deriveAdapterSuggestion(
    port({ port_id: "A", gender: "外牙" }),
    port({
      port_id: "B",
      gender: "内牙",
      seal_method: "卡箍/压紧",
    }),
    {}
  );
  assert.equal(sealMismatch.status, "需核对");
});

test("pending ports never create a procurement quantity", () => {
  const result = deriveAdapterSuggestion(
    port({ status: "待厂家确认", gender: "待确认" }),
    port({ gender: "内牙" }),
    {}
  );
  assert.equal(result.status, "待确认");
  assert.match(result.suggestion, /暂不生成采购数量/);
});

test("same gender, different size and different thread get conservative adapters", () => {
  assert.match(
    deriveAdapterSuggestion(
      port({ gender: "外牙" }),
      port({ gender: "外牙" }),
      {}
    ).suggestion,
    /双内牙/
  );
  assert.match(
    deriveAdapterSuggestion(
      port(),
      port({ gender: "内牙", nominal_size: "1/4" }),
      {}
    ).suggestion,
    /变径/
  );
  assert.match(
    deriveAdapterSuggestion(
      port(),
      port({
        thread_standard: "Rp",
        gender: "内牙",
        seal_method: "螺纹密封",
      }),
      {}
    ).suggestion,
    /牙型转换/
  );
});

test("pipe dimensions and confirmed G sealing rules are validated", () => {
  const data = {
    ports: [
      port({
        port_id: "BAD-G",
        seal_method: "螺纹密封",
      }),
    ],
    connections: [],
    measurement_points: [],
    pipes: [
      {
        pipe_id: "BAD-PIPE",
        inner_diameter_mm: 9,
        outer_diameter_mm: 8,
      },
    ],
    filters: [],
  };
  const result = validateSystemData(data, rules);
  assert.ok(result.errors.some((message) => message.includes("G 牙")));
  assert.ok(result.errors.some((message) => message.includes("外径大于内径")));
});
