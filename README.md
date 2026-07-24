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

## 文档入口

- [文档首页](docs/index.md)
- [工程图读图与测点](docs/architecture/diagram-walkthrough.md)
- [系统原理](docs/architecture/system-overview.md)
- [部件选型与数量计算](docs/design/component-sizing.md)
- [压力与肥液计算](docs/design/hydraulic-calculation.md)
- [安装与清水调试](docs/operations/installation-commissioning.md)
- [A → B → A 控制程序](docs/operations/controller-program.md)
- [故障诊断](docs/operations/troubleshooting.md)

## 本地文档站

Windows PowerShell：

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
& npm.cmd install
& npm.cmd run data:sync
.\.venv\Scripts\python.exe -m mkdocs serve -a 127.0.0.1:8001
```

严格构建：

```powershell
& npm.cmd run docs:build
```

构建产物位于 `site/`，它不是设计事实源；长期维护内容以 `docs/` 为准。

## 数据入口

- `data/fertigation/input/system-interfaces.xlsx`：设备端口、牙型、管径、测点和过滤参数。
- `data/fertigation/input/current-design-calculation.xlsx`：当前工况、现场实测和Excel公式结果。

修改工作簿后运行 `npm run data:sync`，统一更新事实 JSON、工程图、网页工况、接口表和下载副本。`src/` 保存计算与生成源码；`tests/` 与之对称，验证公式、接口规则和完整生成链。

## 重要边界

- 本文档按可扩展的 `N` 个同时工作滴头计算；`4 × 2 L/h = 8 L/h` 只作为低流量边界示例。
- 尚未取得水源动态压力、管长、高差和具体产品曲线前，不能声称系统已经满足压力或吸肥条件。
- 饮用水水源的倒流防护必须按当地规范选型；A/B 支路止回阀不能替代水源污染防护。
- 本仓库是设计、采购核对和调试依据，不替代现场安装人员或当地给排水专业人员的安全确认。
