"use strict";

function xml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pipeSpec(pipe) {
  if (
    !pipe ||
    pipe.inner_diameter_mm === null ||
    pipe.inner_diameter_mm === "" ||
    pipe.outer_diameter_mm === null ||
    pipe.outer_diameter_mm === "" ||
    !Number.isFinite(Number(pipe.inner_diameter_mm)) ||
    !Number.isFinite(Number(pipe.outer_diameter_mm))
  ) {
    return "管径待按喷头总流量计算";
  }
  return `${pipe.inner_diameter_mm}/${pipe.outer_diameter_mm} mm（内/外径）`;
}

function component(systemData, id) {
  return systemData.ports.find((item) => item.component_id === id);
}

function point(systemData, id) {
  return systemData.measurement_points.find((item) => item.point_id === id);
}

function node(x, y, label, sublabel, fill, width = 132) {
  return `<g transform="translate(${x} ${y})">
    <rect x="${-width / 2}" y="-34" width="${width}" height="68" rx="14" class="node" fill="${fill}"/>
    <text y="-2" class="label" text-anchor="middle">${xml(label)}</text>
    <text y="18" class="small" text-anchor="middle">${xml(sublabel || "")}</text>
  </g>`;
}

function valve(x, y, id, color) {
  return `<g transform="translate(${x} ${y})">
    <rect x="-39" y="-28" width="78" height="56" rx="12" fill="#fff" stroke="${color}" stroke-width="3"/>
    <path d="M-18 -12 L5 0 L-18 12 Z M10 -15 V15" fill="none" stroke="${color}" stroke-width="3"/>
    <text y="-39" class="tag" text-anchor="middle">${xml(id)}</text>
  </g>`;
}

function threeWaySelector(x, y, id, subtitle, color, reverse = false) {
  const glyph = reverse
    ? "M-47 -14 H-20 L10 0 H47 M-47 14 H-20 L10 0"
    : "M-47 0 H-10 L20 -14 H47 M-10 0 L20 14 H47";
  return `<g transform="translate(${x} ${y})">
    <rect x="-58" y="-34" width="116" height="68" rx="14" fill="#fff" stroke="${color}" stroke-width="3"/>
    <path d="${glyph}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M0 -19 V-29 M-13 -29 H13" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <text y="-45" class="tag" text-anchor="middle">${xml(id)}</text>
    <text y="53" class="tiny" text-anchor="middle">${xml(subtitle)}</text>
  </g>`;
}

function pressureBadge(systemData, id, x, y, shortLabel, labelSide = "right") {
  const measurement = point(systemData, id);
  const textX = labelSide === "left" ? -25 : 25;
  const textAnchor = labelSide === "left" ? "end" : "start";
  return `<g transform="translate(${x} ${y})">
    <circle r="17" fill="#1261A6"/>
    <text y="5" class="point-id" text-anchor="middle">${xml(id)}</text>
    <text x="${textX}" y="5" class="tiny" text-anchor="${textAnchor}">${xml(shortLabel || (measurement ? measurement.location : ""))}</text>
  </g>`;
}

function renderTopologySvg(systemData, layout) {
  const width = layout.canvas.width;
  const height = layout.canvas.height;
  const revision = systemData.metadata.design_revision;
  const main = systemData.pipes.find((pipe) => pipe.pipe_id === "PIPE-MAIN");
  const spray = systemData.pipes.find((pipe) => pipe.pipe_id === "PIPE-SPRAY");
  const filter = systemData.filters.find((item) => item.component_id === "FILTER");
  const filterLabel = filter && filter.mesh ? `${filter.mesh}目` : "等级待确认";
  const venturi = component(systemData, "VENTURI");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">V4 双液源、滴灌与上空喷灌工程拓扑图</title>
  <desc id="desc">单一水源进入原双路控制器。A路清水旁通，B路全部通过共用文丘里；肥料桶和农药桶经各自过滤、调节和止回阀进入一只三通液源选择阀，再接同一侧吸口。A、B合流后由一只三通末端选择阀切换滴灌或上空喷灌。</desc>
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#173A5B" flood-opacity="0.13"/>
    </filter>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#1261A6"/></marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#15965A"/></marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#DC4E54"/></marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#C98B16"/></marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#8653A6"/></marker>
    <style>
      text{font-family:"Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif;fill:#1F3346}
      .title{font-size:31px;font-weight:700}.subtitle{font-size:15px;fill:#60768A}
      .section{font-size:15px;font-weight:700;letter-spacing:1px}.label{font-size:16px;font-weight:700}
      .small{font-size:12px;fill:#60768A}.tiny{font-size:11px;fill:#60768A}.tag{font-size:13px;font-weight:700}
      .point-id{font-size:11px;font-weight:700;fill:#fff}.panel{fill:#fff;stroke:#C8D8E8;stroke-width:1.5}
      .node{stroke:#C8D8E8;stroke-width:2}.water{fill:none;stroke:#1261A6;stroke-width:11;stroke-linecap:round;stroke-linejoin:round}
      .route-a{fill:none;stroke:#15965A;stroke-width:11;stroke-linecap:round;stroke-linejoin:round}
      .route-b{fill:none;stroke:#DC4E54;stroke-width:11;stroke-linecap:round;stroke-linejoin:round}
      .suction-f{fill:none;stroke:#C98B16;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
      .suction-p{fill:none;stroke:#8653A6;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
      .suction-common{fill:none;stroke:#445A70;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
    </style>
  </defs>

  <rect width="${width}" height="${height}" fill="${layout.canvas.background}"/>
  <rect x="30" y="25" width="${width - 60}" height="${height - 50}" rx="24" class="panel" filter="url(#shadow)"/>
  <text x="68" y="76" class="title">V4 双液源 · 滴灌 / 上空喷灌工程拓扑</text>
  <text x="70" y="104" class="subtitle">单一水源 · A/B 互斥 · B路完整穿过共用文丘里 · 双液源与双末端均互斥</text>
  <rect x="${width - 270}" y="50" width="205" height="40" rx="20" fill="#E3F5EC"/>
  <text x="${width - 168}" y="75" class="tag" text-anchor="middle">设计版本 ${xml(revision)}</text>

  <text x="70" y="150" class="section" fill="#1261A6">01 共用上游与原双路控制器</text>
  <path d="M125 220 H650" class="water" marker-end="url(#arrow-blue)"/>
  ${node(125, 220, "单一水源", "", "#EAF2F8", 110)}
  ${node(270, 220, "倒流防止器", "", "#FFF4DD", 130)}
  ${node(425, 220, "公共过滤器", filterLabel, "#E8F1F6", 132)}
  ${node(605, 220, "A/B双路控制器", "手机控制", "#DCEAF5", 170)}
  ${pressureBadge(systemData, "P0", 505, 166, "过滤器后、控制器前")}

  <text x="70" y="310" class="section" fill="#15965A">02 A 路 · 清水旁路</text>
  <path d="M585 255 V360 H1185 V420" class="route-a"/>
  ${valve(915, 360, "CV-A", "#15965A")}
  <text x="730" y="340" class="small">预灌 / 普通清水 / 冲洗</text>

  <text x="70" y="455" class="section" fill="#DC4E54">03 B 路 · 全流量通过共用文丘里</text>
  <path d="M625 255 V500 H770" class="route-b"/>
  <path d="M980 500 H1185 V420" class="route-b"/>
  ${node(875, 500, "共用文丘里", venturi ? "型号待厂家确认" : "型号待确认", "#FFF0F0", 170)}
  ${valve(1080, 500, "CV-B", "#DC4E54")}
  ${pressureBadge(systemData, "P1", 755, 455, "文丘里入口")}
  ${pressureBadge(systemData, "P2", 990, 548, "文丘里出口")}

  <text x="70" y="595" class="section" fill="#C98B16">04 两只独立母液桶 · 三通阀选择后进入同一侧吸口</text>
  ${node(135, 660, "肥料桶", "独立容器", "#FFF6DC", 115)}
  ${node(135, 790, "农药桶", "按登记标签", "#F4EAF9", 115)}
  <path d="M192 660 H650 V711 H677" class="suction-f"/>
  <path d="M192 790 H650 V739 H677" class="suction-p"/>
  <path d="M793 725 H875 V535" class="suction-common" marker-end="url(#arrow-amber)"/>
  ${node(275, 660, "过滤头", "肥料专用", "#FFFDF7", 95)}
  ${node(275, 790, "过滤头", "农药专用", "#FCF8FE", 95)}
  ${node(405, 660, "调节阀", "", "#FFFDF7", 95)}
  ${node(405, 790, "调节阀", "", "#FCF8FE", 95)}
  ${valve(545, 660, "CV-F", "#C98B16")}
  ${valve(545, 790, "CV-P", "#8653A6")}
  ${threeWaySelector(735, 725, "MV-SOURCE", "肥料 / 关闭 / 农药", "#6F4A8E", true)}
  <text x="888" y="585" class="small">同一侧吸口</text>

  <g transform="translate(1185 420)"><circle r="25" fill="#fff" stroke="#1F3346" stroke-width="7"/><path d="M-9 0 H9" stroke="#1F3346" stroke-width="5"/><text y="-37" class="tag" text-anchor="middle">A/B合流</text></g>
  <path d="M1210 420 H1370" class="water" marker-end="url(#arrow-blue)"/>
  ${pressureBadge(systemData, "P3", 1290, 490, "MV-END 入口前", "left")}
  ${threeWaySelector(1370, 420, "MV-END", "滴灌 / 关闭 / 喷灌", "#1261A6")}

  <text x="1040" y="590" class="section" fill="#15965A">05 滴灌支路</text>
  <path d="M1428 406 H1470 V625 H1954" class="route-a"/>
  ${node(1580, 625, "滴灌减压阀", "原公共阀移入此支路", "#FFF4DD", 166)}
  ${node(1755, 625, "滴灌主管", pipeSpec(main), "#EAF8F0", 145)}
  ${pressureBadge(systemData, "P4", 1670, 570, "滴灌减压阀后")}
  <g transform="translate(1900 635)">
    <path d="M-54 0 V55 M-18 0 V55 M18 0 V55 M54 0 V55" stroke="#15965A" stroke-width="5"/>
    <path d="M-64 55 H-44 M-28 55 H-8 M8 55 H28 M44 55 H64" stroke="#1F3346" stroke-width="8" stroke-linecap="round"/>
    <text y="82" class="small" text-anchor="middle">压力补偿滴头</text>
  </g>

  <text x="1040" y="790" class="section" fill="#1261A6">06 上空喷灌支路</text>
  <path d="M1428 434 H1440 V835 H1790" class="water" marker-end="url(#arrow-blue)"/>
  ${node(1560, 835, "喷灌过滤器", "精度待喷头确认", "#EAF2F8", 135)}
  ${node(1710, 835, "喷灌调压阀", "压力范围待确认", "#FFF4DD", 135)}
  ${pressureBadge(systemData, "P5", 1935, 820, "最不利喷头", "left")}
  <path d="M1790 835 H1810 V760 H1940" class="water"/>
  <path d="M1830 760 V790 M1865 760 V790 M1900 760 V790 M1935 760 V790" stroke="#1261A6" stroke-width="5"/>
  <path d="M1819 790 H1841 M1854 790 H1876 M1889 790 H1911 M1924 790 H1946" stroke="#1F3346" stroke-width="7" stroke-linecap="round"/>
  <text x="1870" y="885" class="small" text-anchor="middle">喷灌管：${xml(pipeSpec(spray))}</text>

  <rect x="68" y="${height - 160}" width="${width - 136}" height="102" rx="16" fill="#F7FBFF" stroke="#C8D8E8"/>
  <text x="90" y="${height - 125}" class="tag">手动阀位模式：停止｜清水滴灌｜滴灌施肥｜清水喷灌｜上空喷药</text>
  <text x="90" y="${height - 95}" class="small">当前使用 MV-END 与 MV-SOURCE 两只带中位关闭的三通手动选择阀；手机端仍只控制原 A/B。</text>
  <text x="90" y="${height - 69}" class="small">边界：喷灌管径与喷头压力必须按喷头总流量计算；文丘里须分别按滴灌施肥与上空喷药两个工况核对厂家曲线。</text>
</svg>
`;
}

module.exports = {
  renderTopologySvg,
};
