# V4 双液源水肥药一体化系统

本仓库保存“单一水源、A/B 双路控制、肥料/农药双液源、滴灌/上空喷灌双末端互斥运行”的工程设计说明。

设计基准水路为：

```text
水源 → 倒流防止器 → 过滤器 → 双路控制器
                           ├─ A → CV-A ──────────────┐
                           └─ B → 文丘里 → CV-B ─────┤
                                                    └→ 合流 → MV-END（三通选择阀）
肥料桶 → 过滤头 → 调节阀 → CV-F ┐                            ├→ 滴灌减压 → 滴头
                                 ├→ MV-SOURCE → 文丘里侧吸口
农药桶 → 过滤头 → 调节阀 → CV-P ┘                            └→ 喷灌过滤/调压 → 上空喷头
```

手机控制器仍只负责 A/B；当前样机用两只带中位全关的三通手动选择阀：`MV-END` 在滴灌/关闭/喷灌之间选择，`MV-SOURCE` 在肥料/关闭/农药之间选择。水力与防串液验收通过后，第二阶段再确定电动三通执行方案。施肥与喷药都可使用 `A → B → A`，但必须按两个不同流量工况分别验算文丘里。

## 快速入口

| 要做的事 | 入口 |
|---|---|
| 从整体了解系统 | [文档首页](docs/index.md) |
| 查看水路、测点和流向 | [v4 工程拓扑图](docs/assets/generated/fertigation-system-topology-v4.svg) · [读图说明](docs/architecture/diagram-walkthrough.md) |
| 核对部件、牙型和管径 | [部件选型](docs/design/component-sizing.md) · [接口规格清单](docs/reference/interface-schedule.md) |
| 进行滴灌/喷灌压力、吸液和冲洗计算 | [计算规则](docs/design/hydraulic-calculation.md) · [网页工程计算器](docs/calculations/engineering-calculator.md) |
| 安装、调试和运行 | [安装与清水调试](docs/operations/installation-commissioning.md) · [A → B → A 程序](docs/operations/controller-program.md) · [故障诊断](docs/operations/troubleshooting.md) |
| 核对标准和厂家资料 | [资料来源](docs/reference/sources.md) |
| 维护程序与生成文件 | [程序路径与生成流程](docs/reference/program-structure.md) |

网页工程计算器中的交互功能需要通过下方的 MkDocs 本地文档站运行；直接在 GitHub 中打开 Markdown 只能阅读页面源码。

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
| `docs/downloads/`、`docs/javascripts/generated/` | 否 | 网站发布用工作簿和浏览器文件 |

修改人工维护文件后运行 `npm.cmd run data:sync`，统一刷新 JSON、工作簿公式、工程图、接口表、网页工况和下载副本。

## 本地文档站

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

脚本会先执行数据同步，再以严格模式启动 MkDocs。访问：

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
