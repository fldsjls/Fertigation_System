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
  const filter = systemData.filters.find((item) => item.filter_id === "FILTER");
  const filterLabel = filter && filter.mesh ? `${filter.mesh}目` : "等级待确认";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">V5 双路控制、文丘里压差旁路、滴灌与上空喷淋工程拓扑图</title>
  <desc id="desc">A路清水直通。B路在T1处分为减压阀主路和文丘里旁路，两路同时有流量并在T2合流。A、B合流后由普通L型三通球阀二选一切换滴灌或上空喷淋。滴灌包含五个OD12可更换支管节点和十只压力补偿滴头，喷淋包含五个喷淋点。</desc>
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
  <text x="68" y="76" class="title">V5 双路控制 · 文丘里压差旁路 · 滴灌 / 上空喷淋</text>
  <text x="70" y="104" class="subtitle">A清水直通｜B路T1/T2之间减压主路＋文丘里旁路同时通水｜L型三通二选一末端</text>
  <rect x="${width - 270}" y="50" width="205" height="40" rx="20" fill="#E3F5EC"/>
  <text x="${width - 168}" y="75" class="tag" text-anchor="middle">设计版本 ${xml(revision)}</text>

  <text x="70" y="150" class="section" fill="#1261A6">01 共用上游与原双路控制器</text>
  <path d="M125 220 H650" class="water" marker-end="url(#arrow-blue)"/>
  ${node(125, 220, "单一水源", "", "#EAF2F8", 110)}
  ${node(270, 220, "倒流防止器", "", "#FFF4DD", 130)}
  ${node(425, 220, "公共过滤器", filterLabel, "#E8F1F6", 132)}
  ${node(605, 220, "A/B双路控制器", "手机控制", "#DCEAF5", 170)}
  ${pressureBadge(systemData, "P0", 505, 166, "过滤器后、控制器前")}

  <text x="70" y="310" class="section" fill="#15965A">02 A 路 · 清水直通</text>
  <path d="M585 255 V350 H1230 V430" class="route-a"/>
  ${valve(910, 350, "CV-A", "#15965A")}
  <text x="705" y="330" class="small">清水滴灌 / 清水喷淋 / 前后冲洗</text>

  <text x="70" y="435" class="section" fill="#DC4E54">03 B 路 · T1/T2 压差旁路（两支路同时有流量）</text>
  <path d="M625 255 V505 H755" class="route-b"/>
  <g transform="translate(775 505)"><circle r="23" fill="#fff" stroke="#DC4E54" stroke-width="7"/><text y="5" class="tag" text-anchor="middle">T1</text></g>
  <path d="M798 505 H830 V455 H1115 V505" class="route-b"/>
  ${node(965, 455, "PRV-B｜DN15减压阀", "主路｜制造压差", "#FFF4DD", 190)}
  <path d="M798 505 H830 V555 H1115 V505" class="route-b"/>
  ${valve(885, 555, "旁路启闭", "#DC4E54")}
  ${node(1020, 555, "VENTURI｜4分文丘里", "实际驱动流量须单测", "#FFF0F0", 195)}
  <g transform="translate(1135 505)"><circle r="23" fill="#fff" stroke="#DC4E54" stroke-width="7"/><text y="5" class="tag" text-anchor="middle">T2</text></g>
  <path d="M1158 505 H1230 V430" class="route-b"/>
  ${valve(1195, 505, "CV-B", "#DC4E54")}
  ${pressureBadge(systemData, "P1", 775, 450, "T1公共节点", "left")}
  ${pressureBadge(systemData, "P2", 1135, 560, "T2公共节点")}

  <text x="70" y="630" class="section" fill="#C98B16">04 两只独立母液桶 · 三位液源阀接同一侧吸口</text>
  ${node(135, 660, "肥料桶", "独立容器", "#FFF6DC", 115)}
  ${node(135, 790, "农药桶", "按登记标签", "#F4EAF9", 115)}
  <path d="M192 660 H650 V711 H677" class="suction-f"/>
  <path d="M192 790 H650 V739 H677" class="suction-p"/>
  <path d="M793 725 H1020 V590" class="suction-common" marker-end="url(#arrow-amber)"/>
  ${node(275, 660, "过滤头", "肥料专用", "#FFFDF7", 95)}
  ${node(275, 790, "过滤头", "农药专用", "#FCF8FE", 95)}
  ${node(405, 660, "调节阀", "", "#FFFDF7", 95)}
  ${node(405, 790, "调节阀", "", "#FCF8FE", 95)}
  ${valve(545, 660, "CV-F", "#C98B16")}
  ${valve(545, 790, "CV-P", "#8653A6")}
  ${threeWaySelector(735, 725, "MV-SOURCE", "肥料 / 关闭 / 农药", "#6F4A8E", true)}
  <text x="1028" y="615" class="small">同一文丘里侧吸口</text>

  <g transform="translate(1230 430)"><circle r="25" fill="#fff" stroke="#1F3346" stroke-width="7"/><path d="M-9 0 H9" stroke="#1F3346" stroke-width="5"/><text y="-37" class="tag" text-anchor="middle">A/B合流</text></g>
  <path d="M1255 430 H1410" class="water" marker-end="url(#arrow-blue)"/>
  ${pressureBadge(systemData, "P3", 1315, 490, "末端L型阀前", "left")}
  ${threeWaySelector(1410, 430, "MV-END", "L型二选一｜滴灌 / 喷淋｜无关闭位", "#1261A6")}

  <text x="1210" y="620" class="section" fill="#15965A">05 滴灌：5个节点 · 10只PC滴头</text>
  <path d="M1468 416 H1500 V655 H1965" class="route-a"/>
  ${node(1575, 655, "滴灌调压器", "按P3与滴头范围决定", "#FFF4DD", 170)}
  ${pressureBadge(systemData, "P4", 1665, 605, "滴灌调压后")}
  ${node(1745, 655, "9/12主管", pipeSpec(main), "#EAF8F0", 145)}
  <g transform="translate(1815 655)">
    <path d="M0 0 V105 M38 0 V105 M76 0 V105 M114 0 V105 M152 0 V105" stroke="#15965A" stroke-width="5"/>
    <circle cx="0" cy="27" r="9" fill="#fff" stroke="#15965A" stroke-width="4"/>
    <circle cx="38" cy="27" r="9" fill="#fff" stroke="#15965A" stroke-width="4"/>
    <circle cx="76" cy="27" r="9" fill="#fff" stroke="#15965A" stroke-width="4"/>
    <circle cx="114" cy="27" r="9" fill="#fff" stroke="#15965A" stroke-width="4"/>
    <circle cx="152" cy="27" r="9" fill="#fff" stroke="#15965A" stroke-width="4"/>
    <path d="M-8 105 H8 M30 105 H46 M68 105 H84 M106 105 H122 M144 105 H160" stroke="#1F3346" stroke-width="8" stroke-linecap="round"/>
    <text x="160" y="132" class="small" text-anchor="end">每节点：12mm等径三通＋球阀＋OD12支管</text>
    <text x="160" y="151" class="small" text-anchor="end">＋2×PC滴头＋2×3/5毛管＋2×滴箭＋冲洗阀</text>
  </g>

  <text x="1210" y="835" class="section" fill="#1261A6">06 上空喷淋：农药路线 · 5个喷淋点</text>
  <path d="M1468 444 H1490 V890 H1965" class="water" marker-end="url(#arrow-blue)"/>
  ${node(1570, 890, "喷淋过滤器", "精度待喷头确认", "#EAF2F8", 135)}
  ${node(1720, 890, "喷淋调压器", "按喷头曲线决定", "#FFF4DD", 145)}
  ${pressureBadge(systemData, "P5", 1935, 835, "最不利喷头", "left")}
  <path d="M1800 890 H1960" class="water"/>
  <path d="M1815 890 V930 M1850 890 V930 M1885 890 V930 M1920 890 V930 M1955 890 V930" stroke="#1261A6" stroke-width="5"/>
  <path d="M1804 930 H1826 M1839 930 H1861 M1874 930 H1896 M1909 930 H1931 M1944 930 H1966" stroke="#1F3346" stroke-width="7" stroke-linecap="round"/>
  <text x="1965" y="965" class="small" text-anchor="end">5个喷淋点｜喷淋管：${xml(pipeSpec(spray))}</text>

  <rect x="68" y="${height - 160}" width="${width - 136}" height="102" rx="16" fill="#F7FBFF" stroke="#C8D8E8"/>
  <text x="90" y="${height - 125}" class="tag">手动阀位模式：停止｜清水滴灌｜滴灌施肥｜清水喷灌｜上空喷药</text>
  <text x="90" y="${height - 95}" class="small">MV-END 为普通 L 型二选一三通，无关闭位；停机、换向与泄压依靠 A/B 均关。MV-SOURCE 保留肥料 / 关闭 / 农药三位。</text>
  <text x="90" y="${height - 69}" class="small">边界：P1/P2压差只计一次；滴灌和喷药须分别实测文丘里旁路驱动流量并核对同工况厂家曲线。</text>
</svg>
`;
}

module.exports = {
  renderTopologySvg,
};
