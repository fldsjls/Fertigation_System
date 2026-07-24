"use strict";

function xml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pipeSpec(pipe) {
  if (!pipe) {
    return "尺寸待确认";
  }
  if (
    pipe.inner_diameter_mm === null ||
    pipe.inner_diameter_mm === undefined ||
    pipe.outer_diameter_mm === null ||
    pipe.outer_diameter_mm === undefined ||
    !Number.isFinite(Number(pipe.inner_diameter_mm)) ||
    !Number.isFinite(Number(pipe.outer_diameter_mm))
  ) {
    return "内/外径待确认";
  }
  return `${pipe.inner_diameter_mm}/${pipe.outer_diameter_mm} mm（内/外径）`;
}

function pointById(systemData, id) {
  return systemData.measurement_points.find((point) => point.point_id === id);
}

function compactPoint(point) {
  if (!point) {
    return "";
  }
  return `${point.point_id} · ${point.nominal_size ? `${point.thread_standard}${point.nominal_size}` : "接口待定"}`;
}

function renderTopologySvg(systemData, layout) {
  const width = layout.canvas.width;
  const height = layout.canvas.height;
  const colors = layout.theme;
  const main = systemData.pipes.find((pipe) => pipe.pipe_id === "PIPE-MAIN");
  const lateral = systemData.pipes.find(
    (pipe) => pipe.pipe_id === "PIPE-LATERAL"
  );
  const suction = systemData.pipes.find(
    (pipe) => pipe.pipe_id === "PIPE-SUCTION"
  );
  const filter = systemData.filters[0];
  const p0 = pointById(systemData, "P0");
  const p1 = pointById(systemData, "P1");
  const p2 = pointById(systemData, "P2");
  const p3 = pointById(systemData, "P3");
  const revision = systemData.metadata.design_revision;

  const measurementRows = [p0, p1, p2, p3]
    .filter(Boolean)
    .map(
      (point, index) => `
        <g transform="translate(1070 ${746 + index * 29})">
          <circle cx="0" cy="-5" r="11" fill="${colors.blue}"/>
          <text x="0" y="-1" class="point-id" text-anchor="middle">${xml(point.point_id)}</text>
          <text x="22" y="0" class="legend-text">${xml(point.location)}</text>
        </g>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">双路自动水肥系统工程拓扑图</title>
  <desc id="desc">水源经过倒流防止器、120目过滤器和双路控制器。A路清水和B路串联文丘里分别经过止回阀后合流，再经减压阀进入9/12毫米主管。P0至P3为动态压力测点。</desc>
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#173A5B" flood-opacity="0.13"/>
    </filter>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${colors.blue}"/></marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${colors.green}"/></marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${colors.red}"/></marker>
    <style>
      text{font-family:"Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif;fill:${colors.ink}}
      .title{font-size:32px;font-weight:700}
      .subtitle{font-size:15px;fill:${colors.muted}}
      .section{font-size:15px;font-weight:700;letter-spacing:1px}
      .label{font-size:17px;font-weight:700}
      .small{font-size:13px;fill:${colors.muted}}
      .tag{font-size:13px;font-weight:700}
      .point-id{font-size:10px;font-weight:700;fill:#fff}
      .legend-text{font-size:13px}
      .panel{fill:${colors.panel};stroke:${colors.line};stroke-width:1.5}
      .node{fill:#fff;stroke:${colors.line};stroke-width:2}
      .pipe-blue{fill:none;stroke:${colors.blue};stroke-width:13;stroke-linecap:round;stroke-linejoin:round}
      .pipe-green{fill:none;stroke:${colors.green};stroke-width:13;stroke-linecap:round;stroke-linejoin:round}
      .pipe-red{fill:none;stroke:${colors.red};stroke-width:13;stroke-linecap:round;stroke-linejoin:round}
    </style>
  </defs>

  <rect width="${width}" height="${height}" fill="${layout.canvas.background}"/>
  <rect x="35" y="28" width="1530" height="864" rx="26" class="panel" filter="url(#shadow)"/>

  <text x="72" y="82" class="title">双路自动水肥系统 · 工程拓扑图</text>
  <text x="74" y="111" class="subtitle">单进水口 · A/B互斥 · B路完整串联文丘里 · 先合流后减压</text>
  <rect x="1320" y="58" width="200" height="40" rx="20" fill="#E3F5EC"/>
  <text x="1420" y="83" text-anchor="middle" class="tag" fill="#107744">设计版本 ${xml(revision)}</text>

  <text x="75" y="154" class="section" fill="${colors.blue}">01 共用上游</text>
  <rect x="70" y="165" width="760" height="134" rx="18" fill="#F7FBFF" stroke="${colors.line}"/>
  <path d="M130 230 H585" class="pipe-blue" marker-end="url(#arrow-blue)"/>

  <g transform="translate(125 230)">
    <path d="M-30 -20 H5 V-38 H28 V-15 H48 V14 H5 V34 H-25 V14 H-45 V-8 H-30 Z" fill="#EAF2F8" stroke="#6B8499" stroke-width="3"/>
    <text x="0" y="67" class="label" text-anchor="middle">水源</text>
  </g>
  <g transform="translate(275 230)">
    <rect x="-38" y="-34" width="76" height="68" rx="15" fill="#D99B2D" stroke="#9D6510" stroke-width="3"/>
    <path d="M-14 0 H14 M0 -14 V14" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    <text x="0" y="67" class="label" text-anchor="middle">倒流防止器</text>
  </g>
  <g transform="translate(430 230)">
    <path d="M-35 -38 H35 L26 34 H-26 Z" fill="#2F4659" stroke="#142838" stroke-width="3"/>
    <path d="M-20 -20 H20 M-16 -6 H16 M-12 8 H12" stroke="#9FC0D3" stroke-width="3"/>
    <text x="0" y="67" class="label" text-anchor="middle">${xml(filter ? `${filter.mesh}目过滤器` : "过滤器")}</text>
    <text x="0" y="88" class="small" text-anchor="middle">μm值待厂家确认</text>
  </g>
  <g transform="translate(625 230)">
    <rect x="-58" y="-54" width="116" height="108" rx="22" fill="#10283D" stroke="#071725" stroke-width="4"/>
    <rect x="-39" y="-33" width="78" height="40" rx="8" fill="#17678D"/>
    <circle cx="-22" cy="29" r="9" fill="#28C176"/><circle cx="22" cy="29" r="9" fill="#F06464"/>
    <text x="74" y="-8" class="label">双路控制器</text>
    <text x="74" y="16" class="small">一进水 · 两独立出水</text>
  </g>

  <g transform="translate(535 190)">
    <circle r="17" fill="${colors.blue}"/><text y="5" class="point-id" text-anchor="middle" style="font-size:12px">P0</text>
    <text x="0" y="-26" class="small" text-anchor="middle">${xml(compactPoint(p0))}</text>
  </g>

  <text x="75" y="348" class="section" fill="${colors.green}">02 A路 · 清水灌溉 / 预灌 / 冲洗</text>
  <path d="M625 285 V386 H1125 V447" class="pipe-green"/>
  <g transform="translate(900 386)">
    <rect x="-36" y="-24" width="72" height="48" rx="12" fill="#EBF8F0" stroke="${colors.green}" stroke-width="3"/>
    <path d="M-16 -10 L8 0 L-16 10 Z M12 -12 V12" fill="none" stroke="${colors.green}" stroke-width="3"/>
    <text x="0" y="-35" class="label" text-anchor="middle">CV-A 止回阀</text>
    <text x="0" y="48" class="small" text-anchor="middle">G1/2候选 · 4分 · 内/外牙待确认</text>
  </g>

  <text x="75" y="510" class="section" fill="${colors.red}">03 B路 · 全流量串联文丘里</text>
  <path d="M665 285 V550 H770" class="pipe-red"/>
  <path d="M930 550 H1125 V447" class="pipe-red"/>
  <g transform="translate(850 550)">
    <path d="M-78 -30 H-34 L-12 -14 H32 L54 -30 H78 V30 H54 L32 14 H-12 L-34 30 H-78 Z" fill="#263B4C" stroke="#102434" stroke-width="3"/>
    <circle cx="0" cy="0" r="10" fill="#F7B733"/>
    <text x="0" y="-49" class="label" text-anchor="middle">文丘里</text>
    <text x="0" y="61" class="small" text-anchor="middle">Q驱动 · 必须核对厂家曲线</text>
  </g>
  <g transform="translate(1020 550)">
    <rect x="-34" y="-23" width="68" height="46" rx="11" fill="#FFF0F0" stroke="${colors.red}" stroke-width="3"/>
    <path d="M-14 -9 L8 0 L-14 9 Z M12 -11 V11" fill="none" stroke="${colors.red}" stroke-width="3"/>
    <text x="0" y="-34" class="label" text-anchor="middle">CV-B</text>
    <text x="0" y="46" class="small" text-anchor="middle">G1/2候选 · 4分</text>
  </g>
  <g transform="translate(745 518)">
    <circle r="17" fill="${colors.blue}"/><text y="5" class="point-id" text-anchor="middle" style="font-size:12px">P1</text>
    <text x="0" y="-25" class="small" text-anchor="middle">${xml(compactPoint(p1))}</text>
  </g>
  <g transform="translate(950 518)">
    <circle r="17" fill="${colors.blue}"/><text y="5" class="point-id" text-anchor="middle" style="font-size:12px">P2</text>
    <text x="0" y="-25" class="small" text-anchor="middle">${xml(compactPoint(p2))}</text>
  </g>

  <g transform="translate(705 742)">
    <path d="M-58 -35 H58 L45 50 H-45 Z" fill="#EAF5FA" stroke="#6A8DA4" stroke-width="3"/>
    <path d="M-43 -3 H43" stroke="#72BAD0" stroke-width="4"/>
    <text x="0" y="78" class="label" text-anchor="middle">肥液桶</text>
  </g>
  <path d="M705 695 V642 H850 V594" fill="none" stroke="#748A9B" stroke-width="7" stroke-linecap="round" stroke-dasharray="10 8"/>
  <g transform="translate(790 642)">
    <rect x="-30" y="-18" width="60" height="36" rx="9" fill="#FFF8E4" stroke="${colors.amber}" stroke-width="2"/>
    <path d="M-12 -7 L8 0 L-12 7 Z M12 -9 V9" fill="none" stroke="${colors.amber}" stroke-width="2"/>
    <rect x="-86" y="26" width="172" height="25" rx="9" fill="#FFFFFF" fill-opacity="0.96"/>
    <text x="0" y="43" class="small" text-anchor="middle">CV-S · 耐肥液止回阀</text>
  </g>
  <rect x="430" y="590" width="250" height="54" rx="10" fill="#FFFFFF" fill-opacity="0.96"/>
  <text x="445" y="613" class="small">桶内过滤头 → 调节阀</text>
  <text x="445" y="635" class="small">${xml(suction ? `吸肥软管：${pipeSpec(suction)}` : "吸肥软管：尺寸待确认")}</text>
  <text x="860" y="633" class="small">q吸 → 侧吸口</text>

  <g transform="translate(1140 447)">
    <circle r="26" fill="#fff" stroke="${colors.ink}" stroke-width="8"/>
    <path d="M-10 0 H10" stroke="${colors.ink}" stroke-width="6"/>
    <text x="0" y="-40" class="label" text-anchor="middle">先合流</text>
  </g>
  <path d="M1166 447 H1210" class="pipe-blue" marker-end="url(#arrow-blue)"/>
  <g transform="translate(1265 447)">
    <rect x="-48" y="-39" width="96" height="78" rx="18" fill="#D9A13A" stroke="#9D6510" stroke-width="3"/>
    <circle r="23" fill="#fff" stroke="#5D7285" stroke-width="3"/>
    <path d="M0 0 L14 -13" stroke="#D24B4B" stroke-width="4" stroke-linecap="round"/>
    <circle r="4" fill="${colors.ink}"/>
    <text x="0" y="69" class="label" text-anchor="middle">再减压</text>
  </g>
  <path d="M1313 447 H1510" class="pipe-blue" marker-end="url(#arrow-blue)"/>
  <g transform="translate(1342 413)">
    <circle r="17" fill="${colors.blue}"/><text y="5" class="point-id" text-anchor="middle" style="font-size:12px">P3</text>
    <text x="0" y="-25" class="small" text-anchor="middle">${xml(compactPoint(p3))}</text>
  </g>
  <text x="1450" y="397" class="label" text-anchor="middle">主管 ${xml(main ? `${main.inner_diameter_mm}/${main.outer_diameter_mm} mm` : "尺寸待确认")}</text>
  <text x="1450" y="418" class="small" text-anchor="middle">内径 / 外径</text>
  <text x="1450" y="438" class="small" text-anchor="middle">Q设计 = N × q滴头</text>

  <g transform="translate(1370 460)">
    <path d="M0 -13 V95 M55 -13 V95 M110 -13 V95" stroke="${colors.blue}" stroke-width="5"/>
    <path d="M-12 95 H12 M43 95 H67 M98 95 H122" stroke="${colors.ink}" stroke-width="9" stroke-linecap="round"/>
    <path d="M0 110 C-9 122 -9 135 0 143 C9 135 9 122 0 110Z M55 110 C46 122 46 135 55 143 C64 135 64 122 55 110Z M110 110 C101 122 101 135 110 143 C119 135 119 122 110 110Z" fill="#2B8BD2"/>
    <text x="55" y="174" class="label" text-anchor="middle">N个滴头</text>
    <text x="55" y="196" class="small" text-anchor="middle">支管 ${xml(pipeSpec(lateral))}</text>
  </g>

  <rect x="${layout.measurement_legend.x}" y="${layout.measurement_legend.y}" width="${layout.measurement_legend.width}" height="${layout.measurement_legend.height}" rx="16" fill="#F7FBFF" stroke="${colors.line}" stroke-width="1.5"/>
  <text x="1070" y="721" class="label">P0–P3 动态测压点</text>
  ${measurementRows}

  <rect x="75" y="842" width="905" height="30" rx="15" fill="#EDF4FA"/>
  <text x="92" y="862" class="small">边界：图面完整不代表水力通过。文丘里必须同时满足 Q设计、P1、P2、压差和厂家同一工况曲线。</text>
</svg>
`;
}

module.exports = {
  renderTopologySvg
};
