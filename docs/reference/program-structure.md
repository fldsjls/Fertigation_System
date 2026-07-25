# 文件夹结构与边界约定

本页约定仓库中程序源代码、网页内容、数据输入、数据输出和自动生成文件的存放边界。所有路径均相对于仓库根目录，不能写成本机的 `C:\Users\...` 绝对路径。

根目录的核心职责为：

- `src/` 保存程序源代码和计算逻辑，包括数据解析、计算、生成及网页行为。
- `docs/` 保存网页正文，以及网站需要发布的样式、脚本、图片和下载副本。
- `data/` 保存原始数据输入和运行数据输出，不保存网页正文或程序逻辑。

## 目录结构

```text
Fertigation_System/
├─ package.json
├─ data/fertigation/
│  ├─ input/                         人工维护的原始数据输入
│  └─ output/                        可重新生成的运行数据输出
├─ config/fertigation/
│  ├─ data/rules.json                单位、校验和接口判定规则
│  ├─ presentation/diagram-layout.json
│  │                                  工程拓扑图布局
│  └─ content/sources/*.data.json    Excel 同步生成的标准化数据
├─ src/fertigation_pipeline/
│  ├─ data/                           数据输入解析、校验和回写逻辑
│  ├─ calculation/                    水力、吸液、冲洗和模式计算
│  ├─ render/                         Markdown 与 SVG 生成
│  └─ web/                            网页工程计算器行为
├─ scripts/                           同步、校验、渲染和文档启动脚本
├─ docs/
│  ├─ **/*.md                         网页正文与页面结构
│  ├─ stylesheets/                    网站样式
│  ├─ assets/                         网站图片和公开数据
│  ├─ downloads/                      网站下载副本
│  └─ javascripts/generated/          网站使用的生成脚本副本
├─ tests/                             单元、场景和集成测试
└─ site/                              MkDocs 构建结果
```

## 职责边界

| 目录 | 应保存 | 不得保存 |
| --- | --- | --- |
| `src/` | 可人工维护的程序源代码、计算规则、数据解析、内容生成和网页行为 | 工程数据输入、运行结果、网页正文和生成后的发布副本 |
| `docs/` | Markdown 网页正文、页面结构，以及网站需要发布的样式、脚本、图片和下载副本 | 原始工程数据、运行缓存，以及需要在 `src/` 中维护的程序源代码 |
| `data/` | `input/` 中的原始数据输入和 `output/` 中的运行数据输出 | Markdown 网页正文、网站样式、程序源代码和计算逻辑 |

`docs/_generated/`、`docs/assets/generated/` 和 `docs/javascripts/generated/` 属于网站发布文件，必须由同步脚本从 `data/`、`config/` 或 `src/` 生成，不能作为人工维护的源文件。`docs/downloads/` 同样是供网页下载的发布副本，原始工作簿仍以 `data/fertigation/input/` 中的文件为准。

`data/fertigation/output/` 是可重新生成的运行缓存和临时结果，不是设计事实源，也不属于网页内容。`site/` 和 `tests/.artifacts/` 也都是输出位置；测试、图片检查和工作簿渲染产生的临时文件统一放在 `tests/.artifacts/`，不在仓库根目录另建 `outputs/`。

## 人工维护入口

| 路径 | 内容 | 修改方式 |
| --- | --- | --- |
| `data/fertigation/input/system-interfaces.xlsx` | 设备端口、连接、管材、测点、过滤和材料事实 | 在工作簿中维护 |
| `data/fertigation/input/current-design-calculation.xlsx` | 当前滴灌/喷灌工况、压力预算和现场实测 | 在工作簿黄色输入区维护 |
| `config/fertigation/data/rules.json` | 单位、字段和接口匹配规则 | 修改 JSON 后运行完整校验 |
| `config/fertigation/presentation/diagram-layout.json` | 工程拓扑图坐标、颜色和字号 | 修改后重新执行数据同步 |
| `src/fertigation_pipeline/` | 计算、解析、绘图和网页行为的程序源代码 | 修改源文件，不修改 `docs/` 中的发布副本 |
| `docs/**/*.md` | 人工编写的网页正文和页面结构 | 直接修改对应 Markdown，不写入 `data/` |

## 程序模块

### 数据层

- `src/fertigation_pipeline/data/interface-workbook.js`：读取接口事实工作簿，标准化端口、连接、管材和测点，并检查悬空引用。
- `src/fertigation_pipeline/data/calculation-workbook.js`：读取和更新计算工作簿，保留人工输入并刷新公式结果。

### 计算层

- `src/fertigation_pipeline/calculation/core.js`：滴灌、喷灌、压力预算、文丘里、吸液量、冲洗、均匀性和合法模式的共同计算核心。
- 浏览器发布副本位于 `docs/javascripts/generated/fertigation-calculator-core.js`，该文件由同步脚本生成，不能直接编辑。

### 渲染层

- `src/fertigation_pipeline/render/svg.js`：根据接口事实与布局配置生成 v5 SVG 工程拓扑。
- `src/fertigation_pipeline/render/markdown.js`：生成测点表、接口清单、采购清单和当前设计摘要。
- `scripts/render-png.mjs`：把生成的 SVG 转换为网站使用的 PNG。

### 网页层

- `src/fertigation_pipeline/web/calculator.js`：网页工程计算器的表单、案例导入、结果展示和本地保存逻辑。
- 发布副本位于 `docs/javascripts/generated/fertigation-calculator.js`，必须通过同步脚本刷新。
- 页面结构位于 `docs/calculations/engineering-calculator.md`。

## 数据生成链路

```text
人工维护 Excel + rules.json + diagram-layout.json
                        │
                        ▼
              scripts/sync-data.mjs
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
config/...data.json  docs/_generated/  docs/assets/generated/
       │                │                │
       ├────────────────┼────────────────┤
       ▼                ▼                ▼
计算器当前工况       接口/测点/采购说明      v5 SVG/PNG 工程图

src/.../calculation/core.js ──→ docs/javascripts/generated/
src/.../web/calculator.js  ──→ docs/javascripts/generated/

data/fertigation/input/*.xlsx ──→ docs/downloads/*.xlsx
```

主入口 `scripts/sync-data.mjs` 依次完成：

1. 读取接口事实工作簿、规则和工程图布局。
2. 生成标准化接口 JSON。
3. 更新计算工作簿并生成当前工况 JSON。
4. 生成测点表、接口清单、采购清单、设计摘要和 v5 工程拓扑。
5. 复制网站下载用工作簿。
6. 发布计算核心与网页计算器的浏览器副本。

## 脚本和命令

| 命令 | 程序入口 | 作用 |
| --- | --- | --- |
| `npm.cmd run data:sync` | `scripts/sync-data.mjs` | 从事实源刷新全部数据、图纸、页面片段和发布副本 |
| `npm.cmd run data:check` | `scripts/verify-generated.mjs` | 检查生成物是否与事实源一致，不接受过期副本 |
| `npm.cmd test` | `tests/unit/`、`tests/integration/` | 验证计算、模式、接口和完整数据流水线 |
| `npm.cmd run docs:serve` | `scripts/serve-docs.ps1` | 先同步数据，再以严格模式启动本地文档站 |
| `npm.cmd run docs:build` | `scripts/build-docs.ps1` | 执行数据检查、测试和 MkDocs 严格构建 |

本地文档站默认地址为 `http://127.0.0.1:8001/`，构建后的静态网站位于 `site/`。

## 修改规则

1. 原始数据输入只放在 `data/fertigation/input/`：接口、连接和测点事实维护在 `system-interfaces.xlsx`，工况和现场实测维护在 `current-design-calculation.xlsx`。
2. 运行缓存和临时数据只写入 `data/fertigation/output/`，不得把其中的文件当作网页正文或长期维护的数据源。
3. 计算、解析、内容生成或网页行为只修改 `src/fertigation_pipeline/` 下的程序源文件。
4. 网页正文和页面结构只修改 `docs/**/*.md`；网站样式和人工维护的静态资源也保存在 `docs/` 下。
5. 不直接修改 `config/fertigation/content/sources/`、`docs/_generated/`、`docs/assets/generated/`、`docs/downloads/` 或 `docs/javascripts/generated/` 中的生成文件。
6. 完成修改后依次运行 `npm.cmd run data:sync` 和 `npm.cmd run docs:build`。

