# 工程计算工作表

> 文档类型：离线交互计算工具  
> 适用模型：互斥运行的单滴灌区或单上空喷灌区
> 数据保存：仅保存在当前浏览器，不上传

[下载独立工程计算工作簿](../downloads/current-design-calculation.xlsx){ .md-button .md-button--primary }
[下载接口规格事实簿](../downloads/system-interfaces.xlsx){ .md-button }

!!! warning "计算结果不等于工程验收"
    本页只执行文档中已经公开的公式。缺少动态压力、厂家压损或同一文丘里工况曲线时，结果会保持“待确认”；明确超出已录入范围时显示“不适用”。首次施肥前仍必须完成清水调试。

<div id="fertigation-calculator" class="calc-app" data-case-url="../../assets/generated/current-design-case.data.json">
  <div class="calc-toolbar" aria-label="计算工作表操作">
    <div>
      <strong>单灌区计算记录</strong>
      <span id="calc-save-status" class="calc-save-status" aria-live="polite">等待输入</span>
    </div>
    <div class="calc-toolbar__actions">
      <button type="button" class="calc-button calc-button--primary" data-calc-action="load-current">载入当前设计</button>
      <button type="button" class="calc-button calc-button--primary" data-calc-action="load-example">载入 v5 十滴头算例</button>
      <button type="button" class="calc-button calc-button--quiet" data-calc-action="import-case">导入工况</button>
      <button type="button" class="calc-button calc-button--quiet" data-calc-action="export-case">导出工况</button>
      <button type="button" class="calc-button calc-button--quiet" data-calc-action="clear">清空工作表</button>
      <input type="file" accept="application/json,.json" data-calc-import hidden>
    </div>
  </div>

  <div class="calc-summary" aria-label="计算状态摘要">
    <div class="calc-summary__item" data-summary="hydraulics">
      <span class="calc-status calc-status--pending">待确认</span>
      <strong>水力计算</strong>
      <small>等待系统与管路输入</small>
    </div>
    <div class="calc-summary__item" data-summary="fertigation">
      <span class="calc-status calc-status--pending">待确认</span>
      <strong>施肥与文丘里</strong>
      <small>等待浓度与厂家工况</small>
    </div>
    <div class="calc-summary__item" data-summary="spray">
      <span class="calc-status calc-status--pending">待确认</span>
      <strong>喷灌与喷药</strong>
      <small>等待喷头、管径与标签数据</small>
    </div>
    <div class="calc-summary__item" data-summary="field">
      <span class="calc-status calc-status--pending">待确认</span>
      <strong>冲洗与均匀度</strong>
      <small>等待现场实测数据</small>
    </div>
  </div>

  <form id="fertigation-calculator-form" novalidate>
    <input type="hidden" name="sampleCount" value="4">

    <section class="calc-section" aria-labelledby="calc-system-title">
      <div class="calc-section__heading">
        <div>
          <span class="calc-step" aria-hidden="true">01</span>
          <h2 id="calc-system-title">系统流量</h2>
        </div>
        <p>只填写同一时刻实际工作的滴头，不使用全部已购买数量。</p>
      </div>

      <div class="calc-input-grid calc-input-grid--compact">
        <label class="calc-field">
          <span>同时工作滴头数量 <b>N</b></span>
          <span class="calc-input">
            <input name="emitterCount" type="number" min="1" step="1" inputmode="numeric" autocomplete="off">
            <span>个</span>
          </span>
        </label>
        <label class="calc-field">
          <span>单滴头标称流量 <b>q<sub>滴头</sub></b></span>
          <span class="calc-input">
            <input name="emitterFlowLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L/h</span>
          </span>
        </label>
      </div>

      <div class="calc-result-grid">
        <article class="calc-result" data-result="designFlow">
          <div class="calc-result__header">
            <span>系统设计流量</span>
            <span class="calc-status calc-status--pending">待确认</span>
          </div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">Q<sub>设计</sub> = N × q<sub>滴头</sub></p>
        </article>
      </div>
    </section>

    <section class="calc-section" aria-labelledby="calc-pipe-title">
      <div class="calc-section__heading">
        <div>
          <span class="calc-step" aria-hidden="true">02</span>
          <h2 id="calc-pipe-title">管路水力</h2>
        </div>
        <p>主管按系统总流量计算；OD12节点支管按每节点2只滴头计算；3/5毛管按一个滴头流量计算。</p>
      </div>

      <h3>流体参数</h3>
      <div class="calc-input-grid">
        <label class="calc-field">
          <span>流体密度 <b>ρ</b></span>
          <span class="calc-input">
            <input name="densityKgM3" type="number" min="0" step="any" inputmode="decimal" value="1000" autocomplete="off">
            <span>kg/m³</span>
          </span>
          <small>20 ℃ 清水工程近似值。</small>
        </label>
        <label class="calc-field">
          <span>运动黏度 <b>ν</b></span>
          <span class="calc-input">
            <input name="kinematicViscosityM2s" type="number" min="0" step="any" inputmode="decimal" value="0.000001004" autocomplete="off">
            <span>m²/s</span>
          </span>
          <small>温度明显不同时应替换。</small>
        </label>
      </div>

      <div class="calc-pipe-layout">
        <fieldset class="calc-fieldset">
          <legend>主管</legend>
          <div class="calc-input-grid calc-input-grid--pipe">
            <label class="calc-field">
              <span>实际内径</span>
              <span class="calc-input">
                <input name="mainInnerDiameterMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>mm</span>
              </span>
            </label>
            <label class="calc-field">
              <span>长度</span>
              <span class="calc-input">
                <input name="mainLengthM" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>m</span>
              </span>
            </label>
            <label class="calc-field">
              <span>绝对粗糙度 <b>ε</b></span>
              <span class="calc-input">
                <input name="mainRoughnessMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>mm</span>
              </span>
              <small>层流时不参与计算；非层流必填。</small>
            </label>
            <label class="calc-field">
              <span>局部阻力系数之和 <b>ΣK</b></span>
              <span class="calc-input">
                <input name="mainLocalK" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>—</span>
              </span>
              <small>确认忽略局部损失时明确填写 0。</small>
            </label>
          </div>
        </fieldset>

        <fieldset class="calc-fieldset">
          <legend>OD12节点支管（单节点）</legend>
          <div class="calc-input-grid calc-input-grid--pipe">
            <label class="calc-field">
              <span>实际内径</span>
              <span class="calc-input">
                <input name="nodeBranchInnerDiameterMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>mm</span>
              </span>
              <small>外径固定为12 mm，实际内径按所购厚壁PE管确认。</small>
            </label>
            <label class="calc-field">
              <span>单段长度</span>
              <span class="calc-input">
                <input name="nodeBranchLengthM" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>m</span>
              </span>
            </label>
            <label class="calc-field">
              <span>绝对粗糙度 <b>ε</b></span>
              <span class="calc-input">
                <input name="nodeBranchRoughnessMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>mm</span>
              </span>
            </label>
            <label class="calc-field">
              <span>局部阻力系数之和 <b>ΣK</b></span>
              <span class="calc-input">
                <input name="nodeBranchLocalK" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>—</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="calc-fieldset">
          <legend>3/5滴箭毛管（单条）</legend>
          <div class="calc-input-grid calc-input-grid--pipe">
            <label class="calc-field">
              <span>实际内径</span>
              <span class="calc-input">
                <input name="lateralInnerDiameterMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>mm</span>
              </span>
            </label>
            <label class="calc-field">
              <span>单条长度</span>
              <span class="calc-input">
                <input name="lateralLengthM" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>m</span>
              </span>
            </label>
            <label class="calc-field">
              <span>绝对粗糙度 <b>ε</b></span>
              <span class="calc-input">
                <input name="lateralRoughnessMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>mm</span>
              </span>
              <small>层流时不参与计算；非层流必填。</small>
            </label>
            <label class="calc-field">
              <span>局部阻力系数之和 <b>ΣK</b></span>
              <span class="calc-input">
                <input name="lateralLocalK" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>—</span>
              </span>
              <small>确认忽略局部损失时明确填写 0。</small>
            </label>
          </div>
        </fieldset>
      </div>

      <div class="calc-table-wrap" tabindex="0" aria-label="管路水力计算结果，可横向滚动">
        <table class="calc-output-table">
          <thead>
            <tr>
              <th>管段</th>
              <th>流速</th>
              <th>Re / 状态</th>
              <th>摩阻系数</th>
              <th>沿程压损</th>
              <th>局部压损</th>
              <th>总压损</th>
              <th>内容积</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>主管</th>
              <td data-pipe-output="main.velocity">—</td>
              <td data-pipe-output="main.reynolds">—</td>
              <td data-pipe-output="main.friction">—</td>
              <td data-pipe-output="main.lineLoss">—</td>
              <td data-pipe-output="main.localLoss">—</td>
              <td data-pipe-output="main.totalLoss">—</td>
              <td data-pipe-output="main.volume">—</td>
            </tr>
            <tr>
              <th>OD12节点支管</th>
              <td data-pipe-output="nodeBranch.velocity">—</td>
              <td data-pipe-output="nodeBranch.reynolds">—</td>
              <td data-pipe-output="nodeBranch.friction">—</td>
              <td data-pipe-output="nodeBranch.lineLoss">—</td>
              <td data-pipe-output="nodeBranch.localLoss">—</td>
              <td data-pipe-output="nodeBranch.totalLoss">—</td>
              <td data-pipe-output="nodeBranch.volume">—</td>
            </tr>
            <tr>
              <th>3/5滴箭毛管</th>
              <td data-pipe-output="lateral.velocity">—</td>
              <td data-pipe-output="lateral.reynolds">—</td>
              <td data-pipe-output="lateral.friction">—</td>
              <td data-pipe-output="lateral.lineLoss">—</td>
              <td data-pipe-output="lateral.localLoss">—</td>
              <td data-pipe-output="lateral.totalLoss">—</td>
              <td data-pipe-output="lateral.volume">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="calc-result-grid">
        <article class="calc-result" data-result="totalVolume">
          <div class="calc-result__header">
            <span>系统管内容积</span>
            <span class="calc-status calc-status--pending">待确认</span>
          </div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">主管 + 5段OD12节点支管 + 10条3/5毛管</p>
        </article>
      </div>
    </section>

    <section class="calc-section" aria-labelledby="calc-pressure-title">
      <div class="calc-section__heading">
        <div>
          <span class="calc-step" aria-hidden="true">03</span>
          <h2 id="calc-pressure-title">压力预算</h2>
        </div>
        <p>厂家部件压损必须按当前流量录入；静态压力不能代替运行时动态压力。</p>
      </div>

      <h3>现场压力与滴头范围</h3>
      <div class="calc-input-grid">
        <label class="calc-field">
          <span>水源动态压力 <b>P<sub>源,动</sub></b></span>
          <span class="calc-input">
            <input name="sourceDynamicMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
          <small>水源端运行时测量，用于计算 A/B 压力余量。</small>
        </label>
        <label class="calc-field">
          <span>P0：过滤器后、控制器前</span>
          <span class="calc-input">
            <input name="fieldP0Mpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
          <small>可选现场记录，不直接替代部件压损。</small>
        </label>
        <label class="calc-field">
          <span>P1：文丘里入口前</span>
          <span class="calc-input">
            <input name="fieldP1Mpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>P2：文丘里出口后</span>
          <span class="calc-input">
            <input name="fieldP2Mpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>P3：A/B 合流后、末端分配前</span>
          <span class="calc-input">
            <input name="fieldP3Mpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>P4：滴灌减压阀后</span>
          <span class="calc-input">
            <input name="fieldP4Mpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>滴头相对 P4 测点高差 <b>Δz</b></span>
          <span class="calc-input">
            <input name="heightDifferenceM" type="number" step="any" inputmode="decimal" autocomplete="off">
            <span>m</span>
          </span>
          <small>向上为正，向下为负；同高明确填写 0。</small>
        </label>
        <label class="calc-field">
          <span>其他下游压损</span>
          <span class="calc-input">
            <input name="downstreamLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
          <small>不含上表已经计算的主管和代表性毛管压损。</small>
        </label>
        <label class="calc-field">
          <span>滴头最低工作压力</span>
          <span class="calc-input">
            <input name="emitterMinPressureMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>滴头最高工作压力</span>
          <span class="calc-input">
            <input name="emitterMaxPressureMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
      </div>

      <div class="calc-result-grid calc-result-grid--two">
        <article class="calc-result" data-result="emitterPressure">
          <div class="calc-result__header">
            <span>代表性滴头压力</span>
            <span class="calc-status calc-status--pending">待确认</span>
          </div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">需要 P4、管损、其他下游压损和高差。</p>
        </article>
        <article class="calc-result" data-result="heightLoss">
          <div class="calc-result__header">
            <span>高差压力项</span>
            <span class="calc-status calc-status--pending">待确认</span>
          </div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">ΔP<sub>高差</sub> = ρgΔz</p>
        </article>
      </div>

      <h3>滴灌减压与公共部件</h3>
      <div class="calc-input-grid">
        <label class="calc-field">
          <span>滴灌减压阀设定压力</span>
          <span class="calc-input">
            <input name="regulatorSetMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>滴灌减压阀最小工作压差</span>
          <span class="calc-input">
            <input name="regulatorMinDifferentialMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>L 型末端三通（滴灌位）当前流量压损</span>
          <span class="calc-input">
            <input name="dripValveLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
          <small>默认 10 只滴头；按当前实际总流量核对阀门通径和压损。</small>
        </label>
        <label class="calc-field">
          <span>倒流防止器压损</span>
          <span class="calc-input">
            <input name="backflowLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>过滤器洁净压损</span>
          <span class="calc-input">
            <input name="filterCleanLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>过滤器允许堵塞压损</span>
          <span class="calc-input">
            <input name="filterDirtyLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
      </div>

      <div class="calc-pipe-layout">
        <fieldset class="calc-fieldset">
          <legend>A 路部件</legend>
          <div class="calc-input-grid calc-input-grid--pipe">
            <label class="calc-field">
              <span>控制器 A 路压损</span>
              <span class="calc-input">
                <input name="controllerALossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>MPa</span>
              </span>
            </label>
            <label class="calc-field">
              <span>A 路止回阀压损</span>
              <span class="calc-input">
                <input name="checkALossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>MPa</span>
              </span>
            </label>
            <label class="calc-field">
              <span>A 路上游管件压损</span>
              <span class="calc-input">
                <input name="fittingsALossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>MPa</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="calc-fieldset">
          <legend>B 路部件</legend>
          <div class="calc-input-grid calc-input-grid--pipe">
            <label class="calc-field">
              <span>控制器 B 路压损</span>
              <span class="calc-input">
                <input name="controllerBLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>MPa</span>
              </span>
            </label>
            <label class="calc-field">
              <span>T1/T2压差旁路设计压差</span>
              <span class="calc-input">
                <input name="bypassDifferentialMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>MPa</span>
              </span>
              <small>没有动态P1/P2时，才填写已确认的同工况厂家压差；不得与P1-P2重复相加。</small>
            </label>
            <label class="calc-field">
              <span>B 路止回阀压损</span>
              <span class="calc-input">
                <input name="checkBLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>MPa</span>
              </span>
            </label>
            <label class="calc-field">
              <span>B 路上游管件压损</span>
              <span class="calc-input">
                <input name="fittingsBLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
                <span>MPa</span>
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      <div class="calc-table-wrap" tabindex="0" aria-label="A B 路压力预算结果，可横向滚动">
        <table class="calc-output-table">
          <thead>
            <tr>
              <th>工况</th>
              <th>所需水源压力</th>
              <th>动态压力余量</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr data-budget-row="aClean"><th>A 路 / 过滤器洁净</th><td>—</td><td>—</td><td>待确认</td></tr>
            <tr data-budget-row="aDirty"><th>A 路 / 允许堵塞</th><td>—</td><td>—</td><td>待确认</td></tr>
            <tr data-budget-row="bClean"><th>B 路 / 过滤器洁净</th><td>—</td><td>—</td><td>待确认</td></tr>
            <tr data-budget-row="bDirty"><th>B 路 / 允许堵塞</th><td>—</td><td>—</td><td>待确认</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="calc-section" aria-labelledby="calc-fertigation-title">
      <div class="calc-section__heading">
        <div>
          <span class="calc-step" aria-hidden="true">04</span>
          <h2 id="calc-fertigation-title">肥液与文丘里</h2>
        </div>
        <p>三种浓度必须使用同一单位；本工具不判断肥料溶解度或材料兼容性。</p>
      </div>

      <h3>浓度与桶容量</h3>
      <div class="calc-input-grid">
        <label class="calc-field">
          <span>清水背景浓度 <b>C<sub>水</sub></b></span>
          <span class="calc-input">
            <input name="waterConcentration" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>同单位</span>
          </span>
          <small>可忽略时明确填写 0。</small>
        </label>
        <label class="calc-field">
          <span>母液浓度 <b>C<sub>母液</sub></b></span>
          <span class="calc-input">
            <input name="motherConcentration" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>同单位</span>
          </span>
        </label>
        <label class="calc-field">
          <span>目标浓度 <b>C<sub>目标</sub></b></span>
          <span class="calc-input">
            <input name="targetConcentration" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>同单位</span>
          </span>
        </label>
        <label class="calc-field">
          <span>B 路运行时间 <b>t<sub>B</sub></b></span>
          <span class="calc-input">
            <input name="fertigationDurationMinutes" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>min</span>
          </span>
        </label>
        <label class="calc-field">
          <span>不可吸残余量</span>
          <span class="calc-input">
            <input name="unusableResidualL" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L</span>
          </span>
        </label>
        <label class="calc-field">
          <span>实测吸液流量（可选）</span>
          <span class="calc-input">
            <input name="measuredSuctionLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L/h</span>
          </span>
        </label>
      </div>

      <div class="calc-result-grid calc-result-grid--five">
        <article class="calc-result" data-result="targetSuction">
          <div class="calc-result__header"><span>目标吸液量</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">等待总流量与浓度。</p>
        </article>
        <article class="calc-result" data-result="motiveFlow">
          <div class="calc-result__header"><span>文丘里驱动流量</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">Q<sub>驱动</sub> = Q<sub>设计</sub> - q<sub>吸</sub></p>
        </article>
        <article class="calc-result" data-result="motherVolume">
          <div class="calc-result__header"><span>本周期母液量</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">等待 B 路运行时间。</p>
        </article>
        <article class="calc-result" data-result="bucketMinimum">
          <div class="calc-result__header"><span>最低有效桶容量</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">不含额外安全余量。</p>
        </article>
        <article class="calc-result" data-result="measuredSuctionDifference">
          <div class="calc-result__header"><span>实测吸液差额</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">实测吸液量 - 目标吸液量</p>
        </article>
      </div>

      <h3>厂家文丘里工况</h3>
      <p class="calc-inline-note">只录入拟购型号的数据表信息。本页不会在两个厂家工况点之间插值。</p>
      <div class="calc-input-grid">
        <label class="calc-field">
          <span>型号</span>
          <input class="calc-text-input" name="venturiModel" type="text" autocomplete="off">
        </label>
        <label class="calc-field">
          <span>资料来源、版本或日期</span>
          <input class="calc-text-input" name="venturiSourceReference" type="text" autocomplete="off">
        </label>
        <label class="calc-field">
          <span>最大工作压力</span>
          <span class="calc-input">
            <input name="venturiMaxPressureMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>允许驱动流量下限</span>
          <span class="calc-input">
            <input name="venturiMinMotiveLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L/h</span>
          </span>
        </label>
        <label class="calc-field">
          <span>允许驱动流量上限</span>
          <span class="calc-input">
            <input name="venturiMaxMotiveLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L/h</span>
          </span>
        </label>
        <label class="calc-field">
          <span>曲线工况 P1</span>
          <span class="calc-input">
            <input name="venturiCurveP1Mpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>曲线工况 P2</span>
          <span class="calc-input">
            <input name="venturiCurveP2Mpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>MPa</span>
          </span>
        </label>
        <label class="calc-field">
          <span>曲线工况驱动流量</span>
          <span class="calc-input">
            <input name="venturiCurveMotiveLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L/h</span>
          </span>
        </label>
        <label class="calc-field">
          <span>现场实测文丘里驱动流量</span>
          <span class="calc-input">
            <input name="actualVenturiMotiveLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L/h</span>
          </span>
          <small>只测文丘里旁路，不能填写10只滴头的末端总流量。</small>
        </label>
        <label class="calc-field">
          <span>曲线工况吸液量</span>
          <span class="calc-input">
            <input name="venturiCurveSuctionLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L/h</span>
          </span>
        </label>
      </div>

      <label class="calc-confirm">
        <input name="venturiCurveConfirmed" type="checkbox">
        <span>我已根据拟购型号厂家资料确认：所选工况适用于当前 P1、P2 和驱动流量。勾选只表示资料校核完成，不表示现场验收通过。</span>
      </label>

      <div class="calc-result-grid calc-result-grid--two">
        <article class="calc-result" data-result="venturiStatus">
          <div class="calc-result__header"><span>文丘里资料校核</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value calc-result__value--text">等待厂家数据</output>
          <p class="calc-result__reason">不会按接口尺寸或“最大吸肥量”判定。</p>
        </article>
        <article class="calc-result" data-result="venturiSuctionMargin">
          <div class="calc-result__header"><span>曲线吸液余量</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">曲线吸液量 - 目标吸液量</p>
        </article>
      </div>
    </section>

    <section class="calc-section" aria-labelledby="calc-spray-title">
      <div class="calc-section__heading">
        <div>
          <span class="calc-step" aria-hidden="true">05</span>
          <h2 id="calc-spray-title">上空喷灌与喷药工况</h2>
        </div>
        <p>喷灌管径必须按喷头总流量计算；农药浓度和施用方法只接受登记标签输入。</p>
      </div>

      <h3>现场模式与喷灌水力</h3>
      <div class="calc-input-grid">
        <label class="calc-field">
          <span>现场手动模式</span>
          <select class="calc-text-input" name="operatingMode">
            <option>停止</option>
            <option>清水滴灌</option>
            <option selected>滴灌施肥</option>
            <option>清水喷灌</option>
            <option>上空喷药</option>
          </select>
        </label>
        <label class="calc-field">
          <span>同时工作喷头数量 <b>M</b></span>
          <span class="calc-input"><input name="sprayNozzleCount" type="number" min="1" step="1" inputmode="numeric" autocomplete="off"><span>个</span></span>
        </label>
        <label class="calc-field">
          <span>单喷头标称流量</span>
          <span class="calc-input"><input name="sprayNozzleFlowLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>L/h</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌管实际内径</span>
          <span class="calc-input"><input name="sprayPipeInnerDiameterMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>mm</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌管外径</span>
          <span class="calc-input"><input name="sprayPipeOuterDiameterMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>mm</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌主管及立管总长度</span>
          <span class="calc-input"><input name="sprayPipeLengthM" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>m</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌管绝对粗糙度 ε</span>
          <span class="calc-input"><input name="sprayPipeRoughnessMm" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>mm</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌管局部阻力 ΣK</span>
          <span class="calc-input"><input name="sprayPipeLocalK" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"></span>
        </label>
        <label class="calc-field">
          <span>喷头相对 P3 高差</span>
          <span class="calc-input"><input name="sprayHeightDifferenceM" type="number" step="any" inputmode="decimal" value="0" autocomplete="off"><span>m</span></span>
        </label>
        <label class="calc-field">
          <span>P5 最不利喷头入口实测</span>
          <span class="calc-input"><input name="fieldP5Mpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>喷头最低工作压力</span>
          <span class="calc-input"><input name="sprayNozzleMinPressureMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>喷头最高工作压力</span>
          <span class="calc-input"><input name="sprayNozzleMaxPressureMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>喷头前其他下游压损</span>
          <span class="calc-input"><input name="sprayDownstreamLossMpa" type="number" min="0" step="any" inputmode="decimal" value="0" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>L 型末端三通（喷淋位）当前流量压损</span>
          <span class="calc-input"><input name="sprayValveLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌过滤器压损</span>
          <span class="calc-input"><input name="sprayFilterLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌调压阀设定压力</span>
          <span class="calc-input"><input name="sprayRegulatorSetMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌调压阀最小工作压差</span>
          <span class="calc-input"><input name="sprayRegulatorMinDifferentialMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>喷灌支路其他管件压损</span>
          <span class="calc-input"><input name="sprayFittingsLossMpa" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>MPa</span></span>
        </label>
        <label class="calc-field">
          <span>实测喷灌清水置换流量</span>
          <span class="calc-input"><input name="actualSprayFlushFlowLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off"><span>L/h</span></span>
        </label>
      </div>

      <div class="calc-result-grid calc-result-grid--four">
        <article class="calc-result" data-result="modeStatus">
          <div class="calc-result__header"><span>模式阀位</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output><p class="calc-result__reason">液源和末端必须互斥。</p>
        </article>
        <article class="calc-result" data-result="sprayFlow">
          <div class="calc-result__header"><span>喷灌总流量</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output><p class="calc-result__reason">Q喷灌 = M × q喷头</p>
        </article>
        <article class="calc-result" data-result="nozzlePressure">
          <div class="calc-result__header"><span>计算 P5</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output><p class="calc-result__reason">P3 减去喷灌管损、其他压损和高差。</p>
        </article>
        <article class="calc-result" data-result="sprayFlushMinutes">
          <div class="calc-result__header"><span>理论清水置换时间</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output><p class="calc-result__reason">仅为一个喷灌管内容积。</p>
        </article>
      </div>

      <div class="calc-table-wrap" tabindex="0" aria-label="喷灌管水力结果，可横向滚动">
        <table class="calc-output-table">
          <thead><tr><th>管段</th><th>流速</th><th>Re / 流态</th><th>摩阻系数</th><th>沿程压损</th><th>局部压损</th><th>总压损</th><th>管内容积</th></tr></thead>
          <tbody>
            <tr><th>喷灌主管/立管</th><td data-pipe-output="spray.velocity">—</td><td data-pipe-output="spray.reynolds">—</td><td data-pipe-output="spray.friction">—</td><td data-pipe-output="spray.lineLoss">—</td><td data-pipe-output="spray.localLoss">—</td><td data-pipe-output="spray.totalLoss">—</td><td data-pipe-output="spray.volume">—</td></tr>
          </tbody>
        </table>
      </div>

      <h3>喷灌末端压力预算</h3>
      <div class="calc-table-wrap" tabindex="0" aria-label="喷灌 A B 路压力预算结果，可横向滚动">
        <table class="calc-output-table">
          <thead><tr><th>工况</th><th>所需水源压力</th><th>动态压力余量</th><th>状态</th></tr></thead>
          <tbody>
            <tr data-budget-row="sprayAClean"><th>喷灌 A 路 / 过滤器洁净</th><td>—</td><td>—</td><td>待确认</td></tr>
            <tr data-budget-row="sprayADirty"><th>喷灌 A 路 / 允许堵塞</th><td>—</td><td>—</td><td>待确认</td></tr>
            <tr data-budget-row="sprayBClean"><th>喷药 B 路 / 过滤器洁净</th><td>—</td><td>—</td><td>待确认</td></tr>
            <tr data-budget-row="sprayBDirty"><th>喷药 B 路 / 允许堵塞</th><td>—</td><td>—</td><td>待确认</td></tr>
          </tbody>
        </table>
      </div>

      <h3>农药载水、吸液与独立文丘里工况</h3>
      <div class="calc-input-grid">
        <label class="calc-field calc-field--wide"><span>农药登记标签/说明书</span><input class="calc-text-input" name="pesticideLabelReference" type="text" autocomplete="off"><small>记录产品名称与标签版本；本工具不推荐剂量。</small></label>
        <label class="calc-field calc-checkbox"><input name="pesticideMethodConfirmed" type="checkbox"><span>已确认登记标签允许该作物、上空喷施方式和剂量</span></label>
        <label class="calc-field"><span>载水背景浓度</span><span class="calc-input"><input name="pesticideWaterConcentration" type="number" min="0" step="any" value="0" autocomplete="off"></span></label>
        <label class="calc-field"><span>农药桶母液浓度</span><span class="calc-input"><input name="pesticideMotherConcentration" type="number" min="0" step="any" autocomplete="off"></span></label>
        <label class="calc-field"><span>标签给定目标喷液浓度</span><span class="calc-input"><input name="pesticideTargetConcentration" type="number" min="0" step="any" autocomplete="off"></span></label>
        <label class="calc-field"><span>B 路喷药时间</span><span class="calc-input"><input name="pesticideDurationMinutes" type="number" min="0" step="any" autocomplete="off"><span>min</span></span></label>
        <label class="calc-field"><span>农药桶不可吸残余量</span><span class="calc-input"><input name="pesticideUnusableResidualL" type="number" min="0" step="any" value="0" autocomplete="off"><span>L</span></span></label>
        <label class="calc-field"><span>实测农药吸液流量</span><span class="calc-input"><input name="measuredPesticideSuctionLph" type="number" min="0" step="any" autocomplete="off"><span>L/h</span></span></label>
        <label class="calc-field"><span>喷药工况 P1</span><span class="calc-input"><input name="sprayFieldP1Mpa" type="number" min="0" step="any" autocomplete="off"><span>MPa</span></span></label>
        <label class="calc-field"><span>喷药工况 P2</span><span class="calc-input"><input name="sprayFieldP2Mpa" type="number" min="0" step="any" autocomplete="off"><span>MPa</span></span></label>
        <label class="calc-field"><span>喷灌曲线工况 P1</span><span class="calc-input"><input name="sprayVenturiCurveP1Mpa" type="number" min="0" step="any" autocomplete="off"><span>MPa</span></span></label>
        <label class="calc-field"><span>喷灌曲线工况 P2</span><span class="calc-input"><input name="sprayVenturiCurveP2Mpa" type="number" min="0" step="any" autocomplete="off"><span>MPa</span></span></label>
        <label class="calc-field"><span>喷灌曲线驱动流量</span><span class="calc-input"><input name="sprayVenturiCurveMotiveLph" type="number" min="0" step="any" autocomplete="off"><span>L/h</span></span></label>
        <label class="calc-field"><span>喷药工况实测文丘里驱动流量</span><span class="calc-input"><input name="sprayActualVenturiMotiveLph" type="number" min="0" step="any" autocomplete="off"><span>L/h</span></span></label>
        <label class="calc-field"><span>喷灌曲线吸液量</span><span class="calc-input"><input name="sprayVenturiCurveSuctionLph" type="number" min="0" step="any" autocomplete="off"><span>L/h</span></span></label>
        <label class="calc-field calc-checkbox"><input name="sprayVenturiCurveConfirmed" type="checkbox"><span>已核对喷药工况所用厂家曲线点</span></label>
      </div>

      <div class="calc-result-grid calc-result-grid--four">
        <article class="calc-result" data-result="pesticideTargetSuction"><div class="calc-result__header"><span>目标吸液量</span><span class="calc-status calc-status--pending">待确认</span></div><output class="calc-result__value">—</output><p class="calc-result__reason">仅按标签输入和质量平衡。</p></article>
        <article class="calc-result" data-result="pesticideMotherVolume"><div class="calc-result__header"><span>农药母液体积</span><span class="calc-status calc-status--pending">待确认</span></div><output class="calc-result__value">—</output><p class="calc-result__reason">计入 B 路喷药时间。</p></article>
        <article class="calc-result" data-result="pesticideBucketMinimum"><div class="calc-result__header"><span>农药桶最低有效容积</span><span class="calc-status calc-status--pending">待确认</span></div><output class="calc-result__value">—</output><p class="calc-result__reason">母液体积加不可吸残余量。</p></article>
        <article class="calc-result" data-result="pesticideVenturiStatus"><div class="calc-result__header"><span>喷药文丘里核对</span><span class="calc-status calc-status--pending">待确认</span></div><output class="calc-result__value">—</output><p class="calc-result__reason">与滴灌施肥工况分开核对。</p></article>
      </div>
    </section>

    <section class="calc-section" aria-labelledby="calc-field-title">
      <div class="calc-section__heading">
        <div>
          <span class="calc-step" aria-hidden="true">06</span>
          <h2 id="calc-field-title">冲洗与滴头均匀度</h2>
        </div>
        <p>理论冲洗时间只对应一个管内容积；均匀度是否合格由项目目标决定。</p>
      </div>

      <div class="calc-input-grid calc-input-grid--compact">
        <label class="calc-field">
          <span>实测冲洗总流量</span>
          <span class="calc-input">
            <input name="actualFlushFlowLph" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>L/h</span>
          </span>
        </label>
        <label class="calc-field">
          <span>统一收集时间</span>
          <span class="calc-input">
            <input name="collectionMinutes" type="number" min="0" step="any" inputmode="decimal" autocomplete="off">
            <span>min</span>
          </span>
        </label>
      </div>

      <div class="calc-sample-header">
        <div>
          <h3>滴头收集体积</h3>
          <p>采样数量必须不少于 4 个且为 4 的倍数。</p>
        </div>
        <div class="calc-toolbar__actions">
          <button type="button" class="calc-button calc-button--quiet" data-calc-action="add-samples">增加 4 个</button>
          <button type="button" class="calc-button calc-button--quiet" data-calc-action="remove-samples">减少 4 个</button>
        </div>
      </div>

      <div id="calc-sample-grid" class="calc-sample-grid" aria-live="polite"></div>

      <div class="calc-result-grid calc-result-grid--four">
        <article class="calc-result" data-result="flushMinutes">
          <div class="calc-result__header"><span>理论冲洗时间</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">仍须以末端水质恢复确认终点。</p>
        </article>
        <article class="calc-result" data-result="uniformityAverage">
          <div class="calc-result__header"><span>平均滴头流量</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">等待采样数据。</p>
        </article>
        <article class="calc-result" data-result="uniformityLowest">
          <div class="calc-result__header"><span>最低四分位平均</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">最低 n/4 个滴头。</p>
        </article>
        <article class="calc-result" data-result="dulq">
          <div class="calc-result__header"><span>DUlq</span><span class="calc-status calc-status--pending">待确认</span></div>
          <output class="calc-result__value">—</output>
          <p class="calc-result__reason">不内置合格阈值。</p>
        </article>
      </div>
    </section>
  </form>

  <div class="calc-safety-note">
    <strong>最终检查</strong>
    <p>任何“已计算”都只说明输入足以执行公式。采购前仍要取得阀门、喷头和文丘里厂家资料；现场先以清水分别测量 P0～P5、两桶吸液量、两个末端流量与冲洗终点。农药剂量及施用方法必须来自登记标签。</p>
  </div>
</div>

## 计算边界

- 管路模型覆盖一条滴灌主管及代表性毛管，或一条喷灌主管/立管；两末端按互斥运行计算，不求解同时开启。
- 阀门、过滤器、控制器、倒流防止器、减压阀和文丘里的压损必须采用厂家数据或现场实测。
- 浏览器只保存输入和保存时间；所有结果会在页面加载时重新计算。
- 详细公式和变量定义见[压力、肥液与冲洗计算](../design/hydraulic-calculation.md)。
