"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const ExcelJS = require("exceljs");

const SHEETS = Object.freeze({
  ports: {
    name: "设备端口",
    headerRow: 4,
    columns: {
      "端口ID": "port_id",
      "设备ID": "component_id",
      "设备名称": "component_name",
      "端口作用": "port_role",
      "牙型": "thread_standard",
      "公称尺寸": "nominal_size",
      "俗称": "colloquial_name",
      "端口形式": "gender",
      "密封方式": "seal_method",
      "连接类型": "connection_type",
      "实际通径mm": "actual_bore_mm",
      "开启压力kPa": "cracking_pressure_kpa",
      "当前流量压损MPa": "pressure_loss_mpa",
      "最高工作压力MPa": "rated_pressure_mpa",
      "材质": "material",
      "状态": "status",
      "资料来源": "source",
      "备注": "notes"
    }
  },
  connections: {
    name: "连接关系",
    headerRow: 4,
    columns: {
      "连接ID": "connection_id",
      "上游端口ID": "from_port",
      "下游端口ID": "to_port",
      "路线": "route",
      "流向": "direction",
      "人工指定转接件": "adapter_override",
      "状态": "status",
      "备注": "notes"
    }
  },
  measurement_points: {
    name: "测点",
    headerRow: 4,
    columns: {
      "测点ID": "point_id",
      "安装位置": "location",
      "测量目的": "purpose",
      "适用工况": "mode",
      "候选牙型": "thread_standard",
      "候选尺寸": "nominal_size",
      "俗称": "colloquial_name",
      "端口形式": "gender",
      "密封方式": "seal_method",
      "状态": "status",
      "资料来源": "source",
      "备注": "notes"
    }
  },
  pipes: {
    name: "管材",
    headerRow: 4,
    columns: {
      "管材ID": "pipe_id",
      "名称": "name",
      "用途": "purpose",
      "材质": "material",
      "内径mm": "inner_diameter_mm",
      "外径mm": "outer_diameter_mm",
      "连接形式": "connection_type",
      "最高工作压力MPa": "rated_pressure_mpa",
      "状态": "status",
      "资料来源": "source",
      "备注": "notes"
    }
  },
  filters: {
    name: "过滤参数",
    headerRow: 4,
    columns: {
      "过滤器ID": "filter_id",
      "目数": "mesh",
      "厂家标称微米": "nominal_micron",
      "结构类型": "construction",
      "最高工作压力MPa": "rated_pressure_mpa",
      "洁净压损MPa": "clean_loss_mpa",
      "允许堵塞压损MPa": "dirty_loss_mpa",
      "状态": "status",
      "资料来源": "source",
      "备注": "notes"
    }
  },
  procurement_items: {
    name: "采购清单",
    headerRow: 4,
    columns: {
      "物料ID": "item_id",
      "类别": "category",
      "名称": "name",
      "规格": "specification",
      "设计数量": "design_quantity",
      "建议购买量": "purchase_quantity",
      "单位": "unit",
      "状态": "status",
      "数量依据": "basis",
      "备注": "notes"
    }
  }
});

function valueOf(cell) {
  const value = cell.value;
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "result")) {
      return value.result;
    }
    if (Object.prototype.hasOwnProperty.call(value, "text")) {
      return value.text;
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text || "").join("");
    }
  }
  return value;
}

function normalizeScalar(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}

function readMetadata(workbook) {
  const sheet = workbook.getWorksheet("说明");
  if (!sheet) {
    throw new Error("接口规格工作簿缺少“说明”工作表。");
  }
  const meta = {};
  for (let rowIndex = 5; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const key = normalizeScalar(valueOf(sheet.getCell(rowIndex, 1)));
    const value = normalizeScalar(valueOf(sheet.getCell(rowIndex, 2)));
    if (key) {
      meta[String(key)] = value;
    }
  }
  return {
    design_revision: meta.design_revision || "unversioned",
    checked_date: meta.checked_date || null,
    document_type: meta.document_type || "系统接口规格",
    source_note: meta.source_note || null
  };
}

function readDataSheet(workbook, definition) {
  const sheet = workbook.getWorksheet(definition.name);
  if (!sheet) {
    throw new Error(`接口规格工作簿缺少“${definition.name}”工作表。`);
  }
  const headerMap = new Map();
  const headerRow = sheet.getRow(definition.headerRow);
  for (let columnIndex = 1; columnIndex <= headerRow.cellCount; columnIndex += 1) {
    const header = normalizeScalar(valueOf(headerRow.getCell(columnIndex)));
    if (header && definition.columns[header]) {
      headerMap.set(columnIndex, definition.columns[header]);
    }
  }
  const missingHeaders = Object.keys(definition.columns).filter(
    (expected) =>
      !Array.from(headerMap.keys()).some(
        (columnIndex) =>
          normalizeScalar(valueOf(headerRow.getCell(columnIndex))) === expected
      )
  );
  if (missingHeaders.length) {
    throw new Error(
      `“${definition.name}”缺少列：${missingHeaders.join("、")}。`
    );
  }

  const rows = [];
  for (
    let rowIndex = definition.headerRow + 1;
    rowIndex <= sheet.rowCount;
    rowIndex += 1
  ) {
    const row = {};
    let populated = false;
    for (const [columnIndex, key] of headerMap.entries()) {
      const value = normalizeScalar(valueOf(sheet.getCell(rowIndex, columnIndex)));
      row[key] = value;
      if (value !== null) {
        populated = true;
      }
    }
    if (populated) {
      rows.push(row);
    }
  }
  return rows;
}

function isPending(value) {
  return value === null || value === "待确认" || value === "待厂家确认";
}

function validateUnique(rows, key, label, errors) {
  const seen = new Set();
  for (const row of rows) {
    const value = row[key];
    if (!value) {
      errors.push(`${label}存在空的${key}。`);
      continue;
    }
    if (seen.has(value)) {
      errors.push(`${label}存在重复ID：${value}。`);
    }
    seen.add(value);
  }
}

function validateSystemData(data, rules) {
  const errors = [];
  const warnings = [];
  const allowedStatuses = new Set(rules.status_values || []);
  const allowedThreads = new Set(rules.thread_standards || []);
  const allowedGenders = new Set(rules.genders || []);
  const allowedSeals = new Set(rules.seal_methods || []);

  validateUnique(data.ports, "port_id", "设备端口", errors);
  validateUnique(data.connections, "connection_id", "连接关系", errors);
  validateUnique(data.measurement_points, "point_id", "测点", errors);
  validateUnique(data.pipes, "pipe_id", "管材", errors);
  validateUnique(
    data.procurement_items || [],
    "item_id",
    "采购清单",
    errors
  );

  const portsById = new Map(data.ports.map((port) => [port.port_id, port]));

  for (const port of data.ports) {
    if (!allowedStatuses.has(port.status)) {
      errors.push(`端口 ${port.port_id} 的状态无效：${port.status || "空"}。`);
    }
    if (port.thread_standard && !allowedThreads.has(port.thread_standard)) {
      errors.push(
        `端口 ${port.port_id} 的牙型无效：${port.thread_standard}。`
      );
    }
    if (port.gender && !allowedGenders.has(port.gender)) {
      errors.push(`端口 ${port.port_id} 的端口形式无效：${port.gender}。`);
    }
    if (port.seal_method && !allowedSeals.has(port.seal_method)) {
      errors.push(`端口 ${port.port_id} 的密封方式无效：${port.seal_method}。`);
    }
    if (port.status === "已确定") {
      for (const field of rules.validation.confirmed_port_requires || []) {
        if (isPending(port[field])) {
          errors.push(`已确定端口 ${port.port_id} 缺少 ${field}。`);
        }
      }
    }
    if (
      port.thread_standard === "G" &&
      port.status === "已确定" &&
      port.seal_method === "螺纹密封"
    ) {
      errors.push(
        `端口 ${port.port_id} 为 G 牙，不能把螺纹本身登记为密封方式。`
      );
    }
    if (
      port.thread_standard === "R" &&
      port.status === "已确定" &&
      port.gender !== "外牙"
    ) {
      errors.push(`端口 ${port.port_id} 的 R 牙应为外牙。`);
    }
    if (
      ["Rp", "Rc"].includes(port.thread_standard) &&
      port.status === "已确定" &&
      port.gender !== "内牙"
    ) {
      errors.push(`端口 ${port.port_id} 的 ${port.thread_standard} 牙应为内牙。`);
    }
  }

  for (const connection of data.connections) {
    if (!portsById.has(connection.from_port)) {
      errors.push(
        `连接 ${connection.connection_id} 引用了不存在的上游端口 ${connection.from_port}。`
      );
    }
    if (!portsById.has(connection.to_port)) {
      errors.push(
        `连接 ${connection.connection_id} 引用了不存在的下游端口 ${connection.to_port}。`
      );
    }
  }

  for (const point of data.measurement_points) {
    if (!allowedStatuses.has(point.status)) {
      errors.push(`测点 ${point.point_id} 的状态无效。`);
    }
  }

  for (const pipe of data.pipes) {
    const hasInner =
      pipe.inner_diameter_mm !== null && pipe.inner_diameter_mm !== "";
    const hasOuter =
      pipe.outer_diameter_mm !== null && pipe.outer_diameter_mm !== "";
    const inner = Number(pipe.inner_diameter_mm);
    const outer = Number(pipe.outer_diameter_mm);
    if (
      hasInner &&
      hasOuter &&
      Number.isFinite(inner) &&
      Number.isFinite(outer) &&
      (inner <= 0 || outer <= inner)
    ) {
      errors.push(
        `管材 ${pipe.pipe_id} 必须满足外径大于内径且两者均为正数。`
      );
    }
  }

  for (const filter of data.filters) {
    if (filter.mesh && !filter.nominal_micron) {
      warnings.push(
        `过滤器 ${filter.filter_id} 已填写 ${filter.mesh} 目，但厂家标称微米仍待确认。`
      );
    }
  }

  const procurementStatuses = new Set([
    "确定",
    "待现场测量",
    "待厂家确认",
    "可选",
  ]);
  for (const item of data.procurement_items || []) {
    if (!procurementStatuses.has(item.status)) {
      errors.push(
        `采购项 ${item.item_id} 的状态无效：${item.status || "空"}。`
      );
    }
    if (
      item.status === "确定" &&
      (item.design_quantity === null || item.purchase_quantity === null)
    ) {
      errors.push(`确定采购项 ${item.item_id} 必须填写设计数量和建议购买量。`);
    }
  }

  return { errors, warnings };
}

function areComplementaryGenders(left, right) {
  return (
    (left === "内牙" && right === "外牙") ||
    (left === "外牙" && right === "内牙")
  );
}

function deriveAdapterSuggestion(fromPort, toPort, connection) {
  if (connection.adapter_override) {
    return {
      status: "人工指定",
      suggestion: connection.adapter_override
    };
  }
  const required = [
    "thread_standard",
    "nominal_size",
    "gender",
    "seal_method",
    "status"
  ];
  if (
    required.some(
      (field) => isPending(fromPort[field]) || isPending(toPort[field])
    ) ||
    fromPort.status !== "已确定" ||
    toPort.status !== "已确定"
  ) {
    return {
      status: "待确认",
      suggestion: "端口资料未全部确认，暂不生成采购数量"
    };
  }
  if (fromPort.thread_standard !== toPort.thread_standard) {
    return {
      status: "需转接",
      suggestion: `${fromPort.thread_standard}→${toPort.thread_standard} 牙型转换接头候选`
    };
  }
  if (fromPort.nominal_size !== toPort.nominal_size) {
    return {
      status: "需转接",
      suggestion: `${fromPort.nominal_size}→${toPort.nominal_size} 变径接头候选`
    };
  }
  if (!areComplementaryGenders(fromPort.gender, toPort.gender)) {
    return {
      status: "需转接",
      suggestion:
        fromPort.gender === "外牙" && toPort.gender === "外牙"
          ? "同规格双内牙直接候选"
          : fromPort.gender === "内牙" && toPort.gender === "内牙"
            ? "同规格双外牙内接候选"
            : "连接形式转换件候选"
    };
  }
  if (fromPort.seal_method !== toPort.seal_method) {
    return {
      status: "需核对",
      suggestion: "公称接口相合，但密封面/密封方式需厂家核对"
    };
  }
  return {
    status: "可直连",
    suggestion: `同为 ${fromPort.thread_standard}${fromPort.nominal_size}，一公一母且密封方式一致`
  };
}

function enrichConnections(data) {
  const portsById = new Map(data.ports.map((port) => [port.port_id, port]));
  return data.connections.map((connection) => {
    const fromPort = portsById.get(connection.from_port);
    const toPort = portsById.get(connection.to_port);
    if (!fromPort || !toPort) {
      return { ...connection, adapter: { status: "错误", suggestion: "端口引用无效" } };
    }
    return {
      ...connection,
      adapter: deriveAdapterSuggestion(fromPort, toPort, connection)
    };
  });
}

function canonicalize(data) {
  return JSON.parse(JSON.stringify(data));
}

function hashData(data) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(data)))
    .digest("hex");
}

async function loadInterfaceWorkbook(workbookPath, rules) {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`找不到接口规格工作簿：${workbookPath}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const data = {
    schema_version: rules.schema_version,
    metadata: readMetadata(workbook),
    ports: readDataSheet(workbook, SHEETS.ports),
    connections: readDataSheet(workbook, SHEETS.connections),
    measurement_points: readDataSheet(workbook, SHEETS.measurement_points),
    pipes: readDataSheet(workbook, SHEETS.pipes),
    filters: readDataSheet(workbook, SHEETS.filters),
    procurement_items: readDataSheet(workbook, SHEETS.procurement_items)
  };
  const validation = validateSystemData(data, rules);
  if (validation.errors.length) {
    throw new Error(`接口规格校验失败：\n- ${validation.errors.join("\n- ")}`);
  }
  data.connections = enrichConnections(data);
  data.validation = validation;
  data.source_hash = hashData({
    metadata: data.metadata,
    ports: data.ports,
    connections: data.connections.map(({ adapter, ...connection }) => connection),
    measurement_points: data.measurement_points,
    pipes: data.pipes,
    filters: data.filters,
    procurement_items: data.procurement_items
  });
  return data;
}

module.exports = {
  SHEETS,
  deriveAdapterSuggestion,
  enrichConnections,
  hashData,
  loadInterfaceWorkbook,
  validateSystemData
};
