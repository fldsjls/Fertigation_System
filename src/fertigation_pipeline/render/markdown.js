"use strict";

function md(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function threadSpec(row) {
  if (!row || !row.thread_standard || row.thread_standard === "无螺纹") {
    return row && row.connection_type ? row.connection_type : "—";
  }
  const nominal = row.nominal_size || "?";
  const colloquial = row.colloquial_name ? `（${row.colloquial_name}）` : "";
  const gender = row.gender && row.gender !== "待确认" ? ` ${row.gender}` : "，内/外牙待确认";
  return `${row.thread_standard}${nominal}${colloquial}${gender}`;
}

function statusMark(status) {
  if (status === "已确定") {
    return "✅ 已确定";
  }
  if (status === "待现场实测") {
    return "🟠 待现场实测";
  }
  return "🟡 待厂家确认";
}

function renderMeasurementPoints(systemData) {
  const rows = systemData.measurement_points
    .map(
      (point) =>
        `| ${md(point.point_id)} | ${md(point.location)} | ${md(point.purpose)} | ${md(point.mode)} | ${md(threadSpec(point))} | ${statusMark(point.status)} |`
    )
    .join("\n");
  return `<!-- 此文件由 npm run data:sync 生成，请勿手工修改。 -->

| 测点 | 安装位置 | 测量目的 | 使用工况 | 候选测压接口 | 状态 |
|---|---|---|---|---|---|
${rows}

!!! note "测压顺序"
    先记录 P0 和 P3，再在 B 路稳定运行时记录 P1、P2。文丘里实测压差为 \`ΔP文丘里 = P1 - P2\`；静态压力不能代替运行时读数。
`;
}

function renderInterfaceSchedule(systemData) {
  const portRows = systemData.ports
    .map(
      (port) =>
        `| ${md(port.port_id)} | ${md(port.component_name)} | ${md(port.port_role)} | ${md(threadSpec(port))} | ${md(port.seal_method)} | ${md(port.actual_bore_mm)} | ${md(port.cracking_pressure_kpa)} | ${md(port.pressure_loss_mpa)} | ${statusMark(port.status)} |`
    )
    .join("\n");
  const connectionRows = systemData.connections
    .map(
      (connection) =>
        `| ${md(connection.connection_id)} | ${md(connection.from_port)} → ${md(connection.to_port)} | ${md(connection.route)} | ${md(connection.adapter.status)} | ${md(connection.adapter.suggestion)} |`
    )
    .join("\n");
  const pipeRows = systemData.pipes
    .map(
      (pipe) =>
        `| ${md(pipe.name)} | ${md(pipe.material)} | ${md(pipe.inner_diameter_mm)} | ${md(pipe.outer_diameter_mm)} | ${md(pipe.connection_type)} | ${md(pipe.rated_pressure_mpa)} | ${statusMark(pipe.status)} |`
    )
    .join("\n");
  return `<!-- 此文件由 npm run data:sync 生成，请勿手工修改。 -->

# 接口、牙型与管径清单

> 文档类型：自动生成的采购核对表  
> 设计版本：${md(systemData.metadata.design_revision)}  
> 核对日期：${md(systemData.metadata.checked_date)}

!!! warning "候选值不是采购确认"
    只有牙型、公称尺寸、内外牙、密封面和厂家型号全部确认后，连接才会判定为可直连。所有“待确认”项均不得计入最终转接件数量。

## 设备端口

| 端口ID | 设备 | 作用 | 接口表达 | 密封 | 通径mm | 开启压力kPa | 当前流量压损MPa | 状态 |
|---|---|---|---|---|---:|---:|---:|---|
${portRows}

## 连接与转接件

| 连接ID | 端口关系 | 路线 | 判断 | 转接建议 |
|---|---|---|---|---|
${connectionRows}

## 管材

| 名称 | 材质 | 内径mm | 外径mm | 连接形式 | 最高工作压力MPa | 状态 |
|---|---|---:|---:|---|---:|---|
${pipeRows}

## 过滤参数

| 目数 | 厂家标称微米 | 结构 | 洁净压损MPa | 允许堵塞压损MPa | 状态 |
|---:|---:|---|---:|---:|---|
${systemData.filters
  .map(
    (filter) =>
      `| ${md(filter.mesh)} | ${md(filter.nominal_micron)} | ${md(filter.construction)} | ${md(filter.clean_loss_mpa)} | ${md(filter.dirty_loss_mpa)} | ${statusMark(filter.status)} |`
  )
  .join("\n")}

120目和微米值是两个独立字段。未取得同一型号的厂家过滤精度或试验资料前，不在文档中把120目换算为固定微米数。
`;
}

function renderDesignSummary(systemData, calculationCase) {
  const main = systemData.pipes.find((pipe) => pipe.pipe_id === "PIPE-MAIN");
  const lateral = systemData.pipes.find(
    (pipe) => pipe.pipe_id === "PIPE-LATERAL"
  );
  const filter = systemData.filters[0];
  const emitterCount = calculationCase.system.emitterCount;
  const emitterFlow = calculationCase.system.emitterFlowLph;
  const designFlow =
    Number.isFinite(emitterCount) && Number.isFinite(emitterFlow)
      ? emitterCount * emitterFlow
      : null;
  return `<!-- 此文件由 npm run data:sync 生成，请勿手工修改。 -->

| 当前设计项 | 候选值 | 状态/边界 |
|---|---|---|
| 主水路接口 | G1/2（俗称4分） | 内牙、外牙及密封待厂家确认 |
| P0–P3测压口 | G1/4（俗称2分） | 测压三通形式待厂家确认 |
| 主管 | ${main ? `${main.inner_diameter_mm}/${main.outer_diameter_mm} mm（内/外径）` : "—"} | ${main ? statusMark(main.status) : "—"} |
| 支管 | ${lateral ? `${lateral.inner_diameter_mm}/${lateral.outer_diameter_mm} mm（内/外径）` : "—"} | ${lateral ? statusMark(lateral.status) : "—"} |
| 过滤等级 | ${filter ? `${filter.mesh}目` : "—"} | 厂家标称微米待确认 |
| 低流量边界工况 | ${md(emitterCount)} × ${md(emitterFlow)} L/h = ${md(designFlow)} L/h | 仅用于警示，不证明文丘里适用 |
`;
}

module.exports = {
  renderDesignSummary,
  renderInterfaceSchedule,
  renderMeasurementPoints,
  statusMark,
  threadSpec
};
