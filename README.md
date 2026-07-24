# 双路自动水肥一体化系统

本仓库保存“单进水口、A/B 双独立出水口、按计划互斥运行”的微型滴灌施肥系统设计说明。

设计基准水路为：

```text
水源 → 倒流防止器 → 过滤器 → 双路控制器
                           ├─ A → 止回阀 ─────────────┐
                           └─ B → 文丘里 → 止回阀 ───┤
                                                    └→ 合流 → 减压阀 → 主管
肥液桶过滤头 → 调节阀 → 耐肥液止回阀 → 文丘里侧吸口
```

控制程序使用 `A → B → A` 完成预灌、施肥和冲洗。控制逻辑成立不代表文丘里一定能够吸肥；文丘里必须通过实际动态压力、流量和厂家性能曲线验算。

## 快速入口

| 要做的事 | 入口 |
|---|---|
| 从整体了解系统 | [文档首页](docs/index.md) |
| 查看水路、测点和流向 | [v3 工程拓扑图](docs/assets/generated/fertigation-system-topology-v3.svg) · [读图说明](docs/architecture/diagram-walkthrough.md) |
| 核对部件、牙型和管径 | [部件选型](docs/design/component-sizing.md) · [接口规格清单](docs/reference/interface-schedule.md) |
| 进行压力、肥液和冲洗计算 | [计算规则](docs/design/hydraulic-calculation.md) · [网页工程计算器](docs/calculations/engineering-calculator.md) |
| 安装、调试和运行 | [安装与清水调试](docs/operations/installation-commissioning.md) · [A → B → A 程序](docs/operations/controller-program.md) · [故障诊断](docs/operations/troubleshooting.md) |
| 核对标准和厂家资料 | [资料来源](docs/reference/sources.md) |

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

- 本文档按可扩展的 `N` 个同时工作滴头计算；`4 × 2 L/h = 8 L/h` 只作为低流量边界示例。
- 尚未取得水源动态压力、管长、高差和具体产品曲线前，不能声称系统已经满足压力或吸肥条件。
- 饮用水水源的倒流防护必须按当地规范选型；A/B 支路止回阀不能替代水源污染防护。
- 本仓库是设计、采购核对和调试依据，不替代现场安装人员或当地给排水专业人员的安全确认。
