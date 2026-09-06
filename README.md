# 水肥工程计算器 · V5 双液源系统

本项目以独立工程计算器为主要入口，用于单灌区的水力、压力预算、肥液与文丘里、喷灌与喷药、冲洗和滴头均匀度计算。参考文档提供设计、安装、数据来源与维护说明。

当前 V5 设计采用 A/B 互斥控制；B 路在 T1/T2 之间由减压主路与文丘里旁路并联组成。普通 L 型末端三通在滴灌与喷淋之间二选一，停止依靠 A/B 均关。设计与工况依据见参考文档中的当前设计数据。

## 快速入口

| 要做的事 | 入口 |
|---|---|
| 开始输入计算 | [独立工程计算器](docs/tools/calculator/index.html) · 网站根地址即计算器 |
| 从整体了解系统 | [参考文档](docs/guide/index.md) |
| 查看水路、测点和流向 | [v5 工程拓扑图](docs/assets/generated/fertigation-system-topology-v5.svg) · [读图说明](docs/architecture/diagram-walkthrough.md) |
| 核对部件、牙型和管径 | [部件选型](docs/design/component-sizing.md) · [接口规格清单](docs/reference/interface-schedule.md) |
| 进行滴灌/喷灌压力、吸液和冲洗计算 | [计算规则](docs/design/hydraulic-calculation.md) · [计算器使用说明](docs/calculations/engineering-calculator.md) |
| 安装、调试和运行 | [安装与清水调试](docs/operations/installation-commissioning.md) · [A → B → A 程序](docs/operations/controller-program.md) · [故障诊断](docs/operations/troubleshooting.md) |
| 核对标准和厂家资料 | [资料来源](docs/reference/sources.md) |
| 维护程序与生成文件 | [程序路径与生成流程](docs/reference/program-structure.md) |

通过下方命令启动后，根地址直接打开计算器；参考文档位于 `/guide/`。`/tools/calculator/` 提供同一计算器的独立入口。需通过 HTTP 运行以便读取当前设计工况；GitHub 只展示源文件。

工具与参考文档共用顶部横栏：品牌、主导航、当前页标识和文档搜索保持一致。搜索会打开参考文档的原生搜索结果；手机第二行提供导航，文档页另有目录按钮。横栏源文件为 `src/fertigation_pipeline/web/header.html`，样式为 `shared-shell.css`；同步时同时生成独立工具、首页模板和文档 header partial。

## 直接下载

- [系统接口规格事实簿](docs/downloads/system-interfaces.xlsx)：设备端口、内外牙、密封、管径、测点及来源。
- [独立工程计算工作簿](docs/downloads/current-design-calculation.xlsx)：现场工况输入、压力预算、文丘里、肥液、冲洗和均匀度。

这两个文件是发布副本。需要长期维护时，应编辑下一节列出的事实源，而不是直接修改 `docs/downloads/`。

## 设计事实维护入口

| 文件 | 是否人工维护 | 用途 |
|---|---:|---|
| `data/fertigation/input/system-interfaces.xlsx` | 是 | 接口、牙型、内外牙、密封、管材、测点和过滤参数 |
| `data/fertigation/input/current-design-calculation.xlsx` | 是 | 当前工况、现场实测和 Excel 公式结果 |
| `config/fertigation/data/rules.json` | 是 | 单位、校验和转接件判定规则 |
| `config/fertigation/presentation/diagram-layout.json` | 是 | 工程图坐标、颜色和字号 |
| `config/fertigation/content/sources/*.data.json` | 否 | Excel 同步生成的设计事实和工况 JSON |
| `docs/_generated/`、`docs/assets/generated/` | 否 | 自动生成的表格、SVG 和 PNG |
| `src/fertigation_pipeline/web/index.html`、`workbench.css`、`calculator.js` | 是 | 唯一工具结构、样式与交互源 |
| `docs/tools/calculator/`、`overrides/workbench.html`、`docs/stylesheets/generated/` | 否 | 同源生成的独立工具、首页模板与样式 |
| `docs/downloads/`、`docs/javascripts/generated/` | 否 | 网站发布用工作簿和浏览器文件 |

修改人工维护文件后运行 `npm.cmd run data:sync`，统一刷新 JSON、工作簿公式、工程图、接口表、网页工况和下载副本。

## 启动计算器与参考文档

首次使用，在 Windows PowerShell 中执行：

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm.cmd ci
```

以后启动网站只需：

```powershell
npm.cmd run docs:serve
```

脚本会先执行数据同步，再以严格模式启动 MkDocs。打开以下地址即可输入计算：

```text
http://127.0.0.1:8001/
```

按 `Ctrl+C` 停止。需要跳过本次数据同步时可运行：

```powershell
npm.cmd run docs:serve -- -SkipSync
```

严格构建和完整验收：

```powershell
npm.cmd run docs:build
```

常用维护命令：

| 命令 | 作用 |
|---|---|
| `npm.cmd run data:sync` | Excel → JSON → 工作簿/图纸/表格/网页发布文件 |
| `npm.cmd run data:check` | 只检查事实源与生成物是否一致 |
| `npm.cmd test` | 运行公式、接口规则和完整流水线测试 |
| `npm.cmd run docs:serve` | 同步数据并启动本地文档站 |
| `npm.cmd run docs:build` | 数据检查、测试及 MkDocs 严格构建 |

构建产物位于 `site/`，临时计算结果位于 `data/fertigation/output/`，测试及视觉验收产物位于 `tests/.artifacts/`；这些目录都不是设计事实源，也不会提交。

## 重要边界

- 本文档按 `N` 个滴头或 `M` 个喷头分别计算；`4 × 2 L/h = 8 L/h` 只作为滴灌低流量边界。
- 喷灌管径不能直接套用现有 9/12 PE 管；尚未取得喷头总流量、压力范围、管长和具体产品曲线前，不能声称喷灌或吸液条件满足。
- 农药剂量及施用方法只能来自登记标签；计算器不推荐农药剂量。
- 饮用水水源的倒流防护必须按当地规范选型；A/B 支路止回阀不能替代水源污染防护。
- 本仓库是设计、采购核对和调试依据，不替代现场安装人员或当地给排水专业人员的安全确认。
