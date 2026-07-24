# 程序路径与生成流程

本页说明仓库中程序、人工维护数据、自动生成文件和测试输出的位置。所有路径均相对于仓库根目录，不能写成本机的 `C:\Users\...` 绝对路径。

## 目录结构

```text
Fertigation_System/
├─ package.json
├─ data/fertigation/
│  ├─ input/                         人工维护的 Excel 事实源
│  └─ output/                        运行缓存和临时结果
├─ config/fertigation/
│  ├─ data/rules.json                单位、校验和接口判定规则
│  ├─ presentation/diagram-layout.json
│  │                                  工程拓扑图布局
│  └─ content/sources/*.data.json    Excel 同步生成的标准化数据
├─ src/fertigation_pipeline/
│  ├─ data/                           工作簿读取、校验和回写
│  ├─ calculation/                    水力、吸液、冲洗和模式计算
│  ├─ render/                         Markdown 与 SVG 生成
│  └─ web/                            网页工程计算器
├─ scripts/                           同步、校验、渲染和文档启动脚本
├─ docs/                              MkDocs 文档源和网站发布文件
├─ tests/                             单元、场景和集成测试
└─ site/                              MkDocs 构建结果
```

`site/`、`data/fertigation/output/` 和 `tests/.artifacts/` 都是输出位置，不是设计事实源。测试、图片检查和工作簿渲染产生的临时文件统一放在 `tests/.artifacts/`，不在仓库根目录另建 `outputs/`。

## 人工维护入口

| 路径 | 内容 | 修改方式 |
| --- | --- | --- |
| `data/fertigation/input/system-interfaces.xlsx` | 设备端口、连接、管材、测点、过滤和材料事实 | 在工作簿中维护 |
| `data/fertigation/input/current-design-calculation.xlsx` | 当前滴灌/喷灌工况、压力预算和现场实测 | 在工作簿黄色输入区维护 |
| `config/fertigation/data/rules.json` | 单位、字段和接口匹配规则 | 修改 JSON 后运行完整校验 |
| `config/fertigation/presentation/diagram-layout.json` | 工程拓扑图坐标、颜色和字号 | 修改后重新执行数据同步 |
| `src/fertigation_pipeline/` | 计算、解析、绘图和网页程序 | 修改源文件，不修改发布副本 |
| `docs/**/*.md` | 人工编写的工程、安装和参考说明 | 直接修改对应 Markdown |

## 程序模块

### 数据层

- `src/fertigation_pipeline/data/interface-workbook.js`：读取接口事实工作簿，标准化端口、连接、管材和测点，并检查悬空引用。
- `src/fertigation_pipeline/data/calculation-workbook.js`：读取和更新计算工作簿，保留人工输入并刷新公式结果。

### 计算层

- `src/fertigation_pipeline/calculation/core.js`：滴灌、喷灌、压力预算、文丘里、吸液量、冲洗、均匀性和合法模式的共同计算核心。
- 浏览器发布副本位于 `docs/javascripts/generated/fertigation-calculator-core.js`，该文件由同步脚本生成，不能直接编辑。

### 渲染层

- `src/fertigation_pipeline/render/svg.js`：根据接口事实与布局配置生成 v4 SVG 工程拓扑。
- `src/fertigation_pipeline/render/markdown.js`：生成测点表、接口清单和当前设计摘要。
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
计算器当前工况       接口/测点说明      v4 SVG/PNG 工程图

src/.../calculation/core.js ──→ docs/javascripts/generated/
src/.../web/calculator.js  ──→ docs/javascripts/generated/

data/fertigation/input/*.xlsx ──→ docs/downloads/*.xlsx
```

主入口 `scripts/sync-data.mjs` 依次完成：

1. 读取接口事实工作簿、规则和工程图布局。
2. 生成标准化接口 JSON。
3. 更新计算工作簿并生成当前工况 JSON。
4. 生成测点表、接口清单、设计摘要和 v4 工程拓扑。
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

1. 接口、连接和测点事实只改 `data/fertigation/input/system-interfaces.xlsx`。
2. 工况和现场实测只改 `data/fertigation/input/current-design-calculation.xlsx`。
3. 计算或网页行为只改 `src/fertigation_pipeline/` 下的源文件。
4. 不直接修改 `config/fertigation/content/sources/`、`docs/_generated/`、`docs/assets/generated/`、`docs/downloads/` 或 `docs/javascripts/generated/` 中的生成文件。
5. 完成修改后依次运行 `npm.cmd run data:sync` 和 `npm.cmd run docs:build`。

