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
    先记录公共段 P0、P3，再按末端分别记录滴灌 P4 或喷灌最不利端 P5。P1 位于 T1，P2 位于 T2，两点跨接减压主路和文丘里旁路；滴灌施肥与喷药工况分别记录 P1/P2、文丘里实际驱动流量和吸液量。实测压差均为 \`ΔP旁路 = P1 - P2\`，同一压差不得重复计作文丘里损失与减压阀损失。静态压力不能代替运行时读数。
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
  const nodeBranch = systemData.pipes.find(
    (pipe) => pipe.pipe_id === "PIPE-NODE-BRANCH"
  );
  const capillary = systemData.pipes.find(
    (pipe) => pipe.pipe_id === "PIPE-CAPILLARY"
  );
  const spray = systemData.pipes.find(
    (pipe) => pipe.pipe_id === "PIPE-SPRAY"
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
| P0–P5测压口 | G1/4（俗称2分） | 测压三通形式待厂家确认 |
| 主管 | ${main ? `${main.inner_diameter_mm}/${main.outer_diameter_mm} mm（内/外径）` : "—"} | ${main ? statusMark(main.status) : "—"} |
| 可更换滴头支管 | ${nodeBranch ? `${md(nodeBranch.inner_diameter_mm)}/${md(nodeBranch.outer_diameter_mm)} mm（内/外径）` : "—"} | ${nodeBranch ? statusMark(nodeBranch.status) : "—"} |
| 滴箭毛管 | ${capillary ? `${capillary.inner_diameter_mm}/${capillary.outer_diameter_mm} mm（内/外径）` : "—"} | ${capillary ? statusMark(capillary.status) : "—"} |
| 喷灌主管/立管 | ${spray && spray.inner_diameter_mm ? `${spray.inner_diameter_mm}/${spray.outer_diameter_mm} mm（内/外径）` : "待按喷头总流量计算"} | 不得直接套用现有9/12管 |
| 过滤等级 | ${filter ? `${filter.mesh}目` : "—"} | 厂家标称微米待确认 |
| 液源选择 | MV-SOURCE：肥料 / 关闭 / 农药 | 一只带中位全关的三通手动选择阀，双桶独立 |
| 末端选择 | MV-END：滴灌 / 上空喷淋 | 普通 L 型二选一三通球阀，无关闭位；停机依靠 A/B 均关 |
| 滴灌节点 | 5 个节点 × 每节点 2 只 PC 滴头 | 共 10 只 PC 滴头；不是 10 只减压阀 |
| 滴灌设计流量 | ${md(emitterCount)} × ${md(emitterFlow)} L/h = ${md(designFlow)} L/h | 仅用于末端需求；文丘里实际驱动流量须单独测量 |
| 喷淋点 | ${md(calculationCase.spray.nozzleCount)} 个 | 单喷头流量和喷淋管径待厂家确认 |
`;
}

function procurementStatusMark(status) {
  if (status === "确定") {
    return "✅ 确定";
  }
  if (status === "待现场测量") {
    return "🟠 待现场测量";
  }
  if (status === "可选") {
    return "⚪ 可选";
  }
  return "🟡 待厂家确认";
}

function renderProcurementList(systemData) {
  const rows = systemData.procurement_items
    .map(
      (item) =>
        `| ${md(item.category)} | ${md(item.name)} | ${md(item.specification)} | ${md(item.design_quantity)} | ${md(item.purchase_quantity)} | ${md(item.unit)} | ${procurementStatusMark(item.status)} | ${md(item.basis)} | ${md(item.notes)} |`
    )
    .join("\n");
  return `<!-- 此文件由 npm run data:sync 生成，请勿手工修改。 -->

# v5 设备、管道与连接件采购清单

> 设计版本：${md(systemData.metadata.design_revision)}
> 固定基准：5 个滴灌节点、10 只 PC 压力补偿滴头、5 个喷淋点

!!! warning "数量边界"
    “确定”表示拓扑数量已经锁定，不代表牙型、材料或厂家型号已经通过采购确认。螺纹内外牙、密封面、喷头流量、喷淋管径、OD12 支管内径和现场管长仍须在下单前逐件核对。

| 类别 | 名称 | 规格 | 设计数量 | 建议购买量 | 单位 | 状态 | 数量依据 | 备注 |
|---|---|---|---:|---:|---|---|---|---|
${rows}

“10 只压力调节件”在本设计中指 10 只 PC 压力补偿滴头。B 路压差旁路只设置 1 只 DN15 减压阀；滴灌和喷淋下游调压器均按实测压力及所购末端厂家范围决定，不计入已确认购买量。
`;
}

module.exports = {
  renderDesignSummary,
  renderInterfaceSchedule,
  renderMeasurementPoints,
  renderProcurementList,
  statusMark,
  threadSpec
};
