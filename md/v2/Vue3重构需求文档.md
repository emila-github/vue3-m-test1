# 一站式微信企业号应用 —— Vue3 重构需求文档

> 入口页：`src/views/Menu.vue`（应用首页九宫格菜单）
> 技术现状：Vue2 + Vant2 + Ant Design Vue（表格）+ Vuex + vue-router + axios + moment
> 目标：以菜单项为入口，梳理全站功能模块、每个模块的「列表 / 新增 / 编辑 / 删除」字段、执行逻辑、后端数据格式、Mock 数据、API 接口与查询参数。**公共部分（下拉、字典、选择器、分页、权限）统一抽离为公共模块，各业务页面不得各自实现。**

---

## 目录

- [第 0 章 全局约定与 Mock 规范](#第-0-章-全局约定与-mock-规范)
- [第 1 章 公共模块（重构必须先落地）](#第-1-章-公共模块重构必须先落地)
  - [1.1 统一响应结构](#11-统一响应结构)
  - [1.2 分页与列表加载（ListMixin / TableMixin）](#12-分页与列表加载listmixin--tablemixin)
  - [1.3 权限体系](#13-权限体系)
  - [1.4 公共下拉 / 字典数据源](#14-公共下拉--字典数据源)
  - [1.5 公共选择器组件](#15-公共选择器组件)
  - [1.6 公共枚举常量字典](#16-公共枚举常量字典)
- [第 2 章 功能模块总览](#第-2-章-功能模块总览)
- [第 3 章 数据统计模块](#第-3-章-数据统计模块)
- [第 4 章 工作台模块](#第-4-章-工作台模块)
- [第 5 章 千万级企业决策模块](#第-5-章-千万级企业决策模块)
- [第 6 章 续保管理（非车）模块](#第-6-章-续保管理非车模块)
- [第 7 章 车险续保管理模块](#第-7-章-车险续保管理模块)
- [第 8 章 领航足迹模块](#第-8-章-领航足迹模块)
- [第 9 章 Vue3 重构落地建议](#第-9-章-vue3-重构落地建议)

---

## 第 0 章 全局约定与 Mock 规范

### 0.1 baseURL 约定
- 业务接口统一 baseURL = `process.env.VUE_APP_IS_BASE_URL`（源码中常量 `ISBaseUri = ''`，即空串，真实前缀由环境变量注入）。
- 微信授权/消息类接口 baseURL = `process.env.VUE_APP_BASE_URL`（本文档不展开，属登录/鉴权范畴）。
- 下文所有 URL 均为相对路径，需拼接业务 baseURL。

### 0.2 HTTP 动作封装（`src/api/manage.js`）
| 封装函数 | HTTP 方法 | 说明 |
|---|---|---|
| `getAction` | GET | 查询，参数走 query |
| `postAction` | POST | 新增/提交，参数走 body |
| `putAction` | PUT | 编辑 |
| `deleteAction` | DELETE | 删除，参数走 query |
| `downFile` | GET/POST | 文件流下载（导出） |

### 0.3 Mock 数据规范（供 Vue3 重构联调用）
- 所有列表分页接口返回统一结构见 [1.1](#11-统一响应结构)。
- 金额字段：字符串或数值，前端 `toFixed(2)` 处理，Mock 用数值。
- 百分比字段：**后端直接返回带 `%` 的字符串**（如 `"80.00%"`），前端不再计算。
- 枚举字段：Mock 用枚举的 `id`（数值/字符），文本由前端映射（见 [1.6](#16-公共枚举常量字典)）。
- 日期字段：`YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm:ss`。
- 建议 Mock 工具：`vite-plugin-mock` / `msw`，按接口路径组织。

---

## 第 1 章 公共模块（重构必须先落地）

> 本章内容是全站复用的基础设施，Vue3 重构时应先实现为 **composable / 公共组件 / 统一 service**，业务页面通过引用使用，**严禁各页面重复实现**。

### 1.1 统一响应结构

所有业务接口返回 JBoot/JeecgBoot 风格：

```jsonc
{
  "success": true,        // 业务是否成功
  "code": 200,            // 状态码，401/510 为登录态/权限异常
  "message": "操作成功",   // 提示文案
  "result": {},           // 业务数据（对象 / 数组 / 分页对象）
  "timestamp": 1690000000000
}
```

**分页型 `result`：**
```jsonc
{
  "records": [ /* 行数据数组 */ ],
  "current": 1,     // 当前页
  "size": 10,       // 每页条数
  "total": 135      // 总条数
}
```

**统计型 `result`**：直接为**数组**（无分页，一次性返回全部行，首行常为合计行）。

### 1.2 分页与列表加载（ListMixin / TableMixin）

现状存在两套分页 Mixin，Vue3 重构应合并为一个 `useList` composable。

#### 1.2.1 ListMixin（移动端上拉加载，`src/mixins/ListMixin.js`）
- 适用：Vant `van-list` 上拉分页页面（我的保源、续保、领航等）。
- 内置 `data`：`queryParam / dataSource / ipagination{current,pageSize:10,total} / isorter{column:'createTime',order:'desc'} / loading / finished / url{}`。
- 核心方法：
  - `loadData(arg)`：`arg===1` 时清空重查；调用 `getAction(url.list, params)`，`dataSource` 累加 `records`，`total <= current*size` 时 `finished=true`。
  - `searchQuery()`：`loadData(1)`。
  - `getQueryParams()`：合并 `queryParam + isorter + filters`，追加 `pageNo/pageSize`，`filterObj` 去空。
  - `handleDelete(id)`：`Dialog.confirm`（标题「删除」，文案「删除操作不可逆，确定删除吗？」）→ `deleteAction(url.delete,{id})` → 前端 `filter` 移除该行。
- **页面必须设置 `url.list`（及删除页 `url.delete`）**。

#### 1.2.2 TableMixin（PC/表格分页，`src/mixins/TableMixin.js`）
- 适用：`a-table`（Ant Design Vue）横向大表页面（拜访明细、签单明细、渗透率、增量保费）。
- `ipagination.pageSize` 默认 15（部分页面覆盖为 200 一次拉全量，配合 `pagination:false` + 横向滚动）。
- `loadData` 用 `result.records` 覆盖（非累加），`result.total` 赋分页；`handleTableChange` 处理排序/筛选/翻页。
- `formatDataSource(datas)` 钩子：给首行打 `__total` 标记等。

> ⚠️ 重构注意：`getQueryParams()` 末尾 `this.queryParam = sqp` 会清空原 `queryParam` 引用，Vue3 用 reactive 时须避免此副作用。

### 1.3 权限体系

数据源：`store.state.user`，包含两类：
- `menuAuth`：**字符串数组**（菜单权限 key），如 `['dashboard-analysis','xb-renewedList']`。
- `buttonAuth`：**对象数组**，元素形如 `{ action: 'visitTracksDetail:export' }`（按钮权限）。

来源：登录后 `queryPermissionsByUser` → `GET /sys/permission/getUserPermissionByToken` → 后端 `result.menu` 树 → 递归提取 `name` 扁平化为 `menuAuth`；`result.auth`（按钮）→ `buttonAuth`。同时持久化到 `Vue.ls`。

#### 指令清单（`src/directive/permissionDirect.js`）
| 指令 | 数据源 | 语义 |
|---|---|---|
| `v-has-permission-menu="[k1,k2]"` | menuAuth | **全部命中**才显示 |
| `v-has-any-permission-menu="[k1,k2]"` | menuAuth | **任一命中**即显示 |
| `v-has-permission="[a1]"` | buttonAuth.action | 全部命中才显示 |
| `v-has-any-permission="[a1,a2]"` | buttonAuth.action | 任一命中即显示 |
| `v-has-no-permission="[a1]"` | buttonAuth.action | 不含时才显示 |

> ⚠️ 现指令用 `bind` + `el.parentNode.removeChild(el)` 物理移除节点。Vue3 中 `bind`→`mounted`，且移除 DOM 会破坏虚拟节点，**建议重构为 `v-if` + 权限判断函数**（`hasMenu(keys)` / `hasBtn(actions)` composable）。

#### 菜单权限 key 对照（来自 Menu.vue）
| 分组 | 菜单项 | menuAuth key |
|---|---|---|
| 数据统计 | 数据汇总 | `dashboard-analysis` |
| 数据统计 | 跟踪统计 | `insurance-source-stats-TrackSummary` |
| 数据统计 | 劳效统计 | `insurance-source-stats-UserSummary` |
| 数据统计 | 拜访明细 | `insurance-source-stats-Visit` |
| 数据统计 | 签单明细 | `insurance-source-stats-PolicySummary` |
| 工作台 | 我的保源 | `insurance-source-workplace` / `...-my-insurance-source` / `...-my-is-detail-@id` |
| 工作台 | 非车待续保跟踪 | `insurance-source-fcdd-policy-main` |
| 工作台 | 拜访汇总 | `insurance-source-monitor-track-visit` |
| 千万级企业决策 | 客户渗透率 | `jc-JcEnterpriseItemList` |
| 千万级企业决策 | 新续企业增量保费 | `jc-JcEnterpriseRiskList` |
| 续保管理 | 我的续保 | `xb-renewedList` |
| 续保管理 | 问题项目 | `xb-questionList` |
| 续保管理 | 项目终止 | `xb-endList` |
| 车险续保管理 | 我的续保 | `xbCar-renewedList` |
| 领航足迹 | 我的领航 | `lhzj-lhVisitInfoList` |

### 1.4 公共下拉 / 字典数据源

> 全站复用，Vue3 应封装为 `useDict()` / `useOrgTree()` 等 composable，带缓存，避免每页重复请求。

| 用途 | API 函数 | 方法 | URL | 请求参数 | 返回结构 |
|---|---|---|---|---|---|
| 机构/分支公司树 | `isSysDepartTree` | GET | `/sys/sysDepart/queryTreeListAll` | 无 | 树数组，节点 `{orgCode,title,parentId,children[]}` |
| 数据字典项（通用） | `getDictItems` | GET | `/sys/dict/getDictItems/{type}` | `type` 字典编码 | `[{value,text}]`（前端映射为 `{id:value,name:text}`） |
| 归属渠道 | `getDictItems` | GET | 同上，`type='source_channel'` | — | 同上 |
| 保源标签（取id） | `isLabelTypePullDownAll` | GET | `/data/labelType/pullDownAll` | 无 | `[{id,name}]` |
| 保源标签（id+文字，树节点） | `isLabelTypePullDownNode` | GET | `/data/labelType/pullDownNode` | 无 | `[{id,name}]` |
| 客户类型下拉 | `isCustomerTypePullDown` | GET | `/arch/customerType/pullDown` | 无 | 树 `[{id,title,parentId,children}]` |
| 产品线 | `isProductLineTypes` | GET | `/arch/productLineType/pullDown` | 无 | `[{id,name}]` |
| 目标险种树 | `isRiskTypeTree` | GET | `/arch/riskType/tree` | 无 | 树 |
| 客户类型（领航，树） | `lhzjCustomerType` | GET | `/lhzj/lhVisitInfo/customerType` | 无 | 树 `[{id,title,parentId,children}]` |
| 报告日期下拉（渗透率） | `jcEnterpriseItemSelectDates` | GET | `/policy/jcEnterpriseItem/selectDates` | 无 | `["202401","202402",...]`，附 `others.currOrgCode` |

**机构树 Mock：**
```json
{
  "success": true, "code": 200, "message": "成功",
  "result": [
    { "orgCode": "3500", "title": "福建省分公司", "parentId": "0", "children": [
      { "orgCode": "3501", "title": "福州市分公司", "parentId": "3500", "children": [
        { "orgCode": "350101", "title": "鼓楼支公司", "parentId": "3501", "children": [] }
      ]}
    ]}
  ]
}
```

**字典项 Mock（source_channel）：**
```json
{ "success": true, "result": [ { "value": "01", "text": "直销" }, { "value": "02", "text": "中介" } ] }
```

**辅助工具函数（`src/utils/util.js`）：**
- `filterObj(obj)`：剔除 `''/null/undefined` 字段后再发请求。
- `initSelectDatas(cfgList)`：按配置数组批量拉取下拉数据并写入 `selectDatas`，每项 `{action, varName, requestParams, success?}`。

### 1.5 公共选择器组件

> 位于 `src/components/`，Vue3 重构建议全部改为组合式 API，`v-model` 用 `modelValue`/`update:modelValue`。

| 组件 | 文件 | 用途 | v-model | 关键 props | 事件 |
|---|---|---|---|---|---|
| 单选下拉 | `VanFieldSelectPicker.vue` | 单选 picker | `selectKey` | `columnsKeyValue` / `dataKey`(默认id) / `dataLabel`(默认name) / `clearable` | `input(key, attr)` |
| 多选下拉 | `VanFieldCheckboxPicker.vue` | 复选 | `selectKeys`(数组) | `columnsKeyValue`([{id,name}]) | `input(ids[], attrs[])` |
| 日期时间 | `VanFieldDatetimePicker.vue` | 日期/时间 | `currentTime` | `type`(date/datetime) / `timeFormat` / `minDate` / `maxDate` | `input(格式化字符串)` |
| 树形选择 | `CustomerTypePicker.vue` | 多级树联动（客户分类/机构） | `value` | `customerTypes`(树) / `fieldNames{id,text,parentId,children}` / `maxDeep`(默认3) | `input(id)` / `change({id,text})` |
| 导出按钮 | `ExportXlsBtn.vue` | Excel 导出（移动端已废弃，改后端推送） | — | `exportXlsUrl` / `queryParamBase` / `options` | — |
| 机构树（内联） | 多页面自带 `formatRiskTypeDatas` | 分支公司多级 picker | `orgCode`/`__orgCode` | 用 `isSysDepartTree` 数据 | — |

> ⚠️ 「分支公司多级 picker」逻辑（`formatRiskTypeDatas` / `getSelectedIndexArray` / `initPickerRiskTypeTree`）在 Analysis、TrackSummary、UserSummary、Visit、PolicySummary、jc、xb 等**多个页面重复粘贴**。Vue3 必须抽为单一 `<OrgTreePicker>` 组件复用。

### 1.6 公共枚举常量字典

来源：`src/config/dataConfig.js`（全局）、`src/views/xb/dataConfig.js`（续保）、`src/views/xbCar/dataConfig.js`（车险）、`src/views/lhzj/dataConfig.js`（领航）。Vue3 建议统一为 `src/enums/*.ts` 并 TS 枚举化。

#### 全局（config/dataConfig.js）
| 常量 | 含义 | 取值(id→name) |
|---|---|---|
| `PROJECT_FLAG` | 是否工程项目 | 0否 / 1是 |
| `PROJECT_LEVEL` | 项目层级 | 0省级 / 1市级 / 2区县级 |
| `SALE_TYPE` | 销售归属 | 0团险 / 1个险 / 2农险 |
| `VISIT_TYPE` | 拜访类型 | 0电话沟通 / 1微信沟通 / 2上门拜访 |
| `VISIT_PROCESS_STATUS` | 拜访进程 | 0已签单 / 1跟进中 / 2同业投保 / 3无意向 |
| `VISIT_FINISH_FLAG` | 是否完成拜访 | Y是 / N否 |
| `UP_FLAG` | 是否上级支持 | Y是 / N否 |
| `LEADER_COMMENT_LEVEL` | 领导点评等级 | 1差 / 2良 / 3优 |
| `RISKIY_TYPE` | 保险类型 | 0待定…11航空险（共12项） |
| `WAIT_COMMENTS` | 待点评标签 | 1待点评 / 2新增 |
| `ORDER_TYPE` | 成单类型 | NEW新保 / RENEWAL续保 |
| `FCDD_DAY_TYPE` | 到期天数 | 1每日代办/7/15/30/45/60 |
| `FCDD_FEEDBACK_FLAG` | 反馈状态 | 0待反馈 / 1已反馈 |
| `FCDD_RENEWAL_STATUS` | 保单状态 | 0未续保 / 1已续保 / 3不可续保 |
| `FCDD_REASON` | 反馈原因 | 1已续保/2正在跟踪/3尚未联系/4不可续保/6其他 |
| `SALES_RESULT_STATUS` | 销售结果 | Y成功 / N失败 |
| `BUSSINESS_BELONG_TYPE` | 业务去向主体 | 0平安…9其他 |
| `CUSTOMER_LEVEL/REGISTER_TYPE/REGISTER_CAPITAL_TYPE/COMPANY_STATUS/CUSTOMER_STATUS` | 客户/企业属性 | 见源码 |

#### 续保（xb/dataConfig.js）
| 常量 | 含义 | 取值 |
|---|---|---|
| `FEE_RANGE` | 上年保费规模 | 0(5万以下)/1(5-20万)/2(20-50万)/3(50万以上) |
| `YN_FLAG` | 是否 | 1是/0否 |
| `AUDIT_STATUS` | 预审核状态 | 1待审核/2审核通过 |
| `AUDIT_DELAY_STATUS` | 预审核逾期 | 0未开始/1新增/2正常/3逾期 |
| `IS_LOCK` | 编辑锁定 | 0可编辑/1不可编辑 |
| `RENEWED_STATUS` | 续保状态 | 0未续保/1已续保/2已终止 |
| `RENEWED_QUESTION_STATUS` | 是否问题报送 | 0未知/1否/2是 |
| `RENEWED_END_STATUS` | 终止状态 | 1未终止/2申请终止/3已终止 |
| `FEEDBACK_DELAY_STATUS` | 反馈逾期 | 0无需/1新增/2待反馈/3逾期 |
| `RENEWED_QUESTION_INPUT_TYPE` / `QUESTION_TYPE` | 问题类型 | 0承保条件/1客户关系/2理赔/3费用/4其他 |
| `RENEWED_END_INPUT_TYPE` | 终止原因(回显) | 0良好/1停业/2倒闭/3其他 |
| `QUESTION_STATUS` | 问题状态 | 1非问题/2未解决/3已解决 |
| `QUESTION_DELAY_STATUS` | 问题逾期 | 0未知/1新增/2正常/3逾期 |
| `END_STATUS` | 项目终止状态 | 2申请终止/3已终止 |
| `END_TYPE` | 终止原因类型 | 0承保条件/1费用/2理赔/3客户关系/4其他/5自动终止 |
| `END_DELAY_STATUS` | 终止审批逾期 | 0未知/1新增/2正常/3逾期 |

#### 车险（xbCar/dataConfig.js）
| 常量 | 含义 | 取值 |
|---|---|---|
| `SHOW_STATUS` | 保单状态 | 1未反馈/2已反馈/3已脱保/4已终止/5已续保 |
| `YN_FLAG` | 新能源标志等 | 1是/0否 |
| `RENEWED_STATUS2` | 续保状态 | 0未续保/1已续保 |
| `CAR_RENEWED_END_INPUT_TYPE` | 车险终止原因 | 1卖车/2过户/3报废/4其他 |

#### 领航（lhzj/dataConfig.js）
| 常量 | 含义 | 取值 |
|---|---|---|
| `VISIT_POSITION` | 拜访人职务 | 1市公司总经理室/2市公司部门经理/3支公司经理室 |
| `COMDNAME` | 地市 | 1福州/2泉州/3漳州/4莆田/5南平/6宁德/7龙岩/8三明 |

---

## 第 2 章 功能模块总览

| # | 分组 | 菜单项 | 路由 | 主要能力 | 分页机制 |
|---|---|---|---|---|---|
| 1 | 数据统计 | 数据汇总 | `/analysis` | 机构维度综合看板（大表，含合计行） | 无分页 |
| 2 | 数据统计 | 跟踪统计 | `/track-summary` | 机构维度跟踪统计 | 无分页 |
| 3 | 数据统计 | 劳效统计 | `/user-summary` | 机构维度人效统计 | 无分页 |
| 4 | 数据统计 | 拜访明细 | `/visit` | 拜访明细大表（可导出推送） | 分页 |
| 5 | 数据统计 | 签单明细 | `/policy-summary` | 签单明细大表（可导出推送） | 分页 |
| 6 | 工作台 | 我的保源 | `/myis` | 保源列表 + 新增/修正 + 保源详情(保源信息/活动量/销售结果) + 活动量录入·编辑·点评·打卡 + 销售结果录入·编辑 | 上拉 |
| 7 | 工作台 | 非车待续保跟踪 | `/fcdd-policy-main` | 待续保列表 + 详情 + 反馈 | 上拉 |
| 8 | 工作台 | 拜访汇总 | `/monitor/track/visit` | 汇总统计 + 结果推送 | — |
| 9 | 千万级企业决策 | 客户渗透率 | `/JcEnterpriseItemList` | 多维渗透率报表 | 一次全量 |
| 10 | 千万级企业决策 | 新续企业增量保费 | `/JcEnterpriseRiskList` | 增量保费报表 | 一次全量 |
| 11 | 续保管理 | 我的续保 | `/xb/renewedList` | 续保列表 + 6 类录入/反馈 | 上拉 |
| 12 | 续保管理 | 问题项目 | `/xb/questionList` | 问题项目列表 + 反馈 | 上拉 |
| 13 | 续保管理 | 项目终止 | `/xb/endList` | 终止项目列表 + 反馈 | 上拉 |
| 14 | 车险续保管理 | 我的续保 | `/xbCar/renewedList` | 车险续保列表 + 反馈/终止/取消/退回 | 上拉 |
| 15 | 领航足迹 | 我的领航 | `/lhzj` | 拜访列表 + 新增/编辑/预览/删除 | 上拉 |

> Menu.vue 显隐规则：分组容器用 `v-has-any-permission-menu`（工作台组无分组指令，容器恒渲染），组内每项用 `v-has-permission-menu`。整组可见 ≠ 每项可见。

---

## 第 3 章 数据统计模块

> 共性：顶部 `van-sticky` 筛选表单（分支公司树 picker + 统计时间日历 range + 若干下拉），下方 `a-table` 横向大表。统计类（1/2/3）返回**数组**，明细类（4/5）走分页。首行 `index=0` 为**合计行**（`formatDataSource` 打 `__total`，排序时锁定首行）。均无 echarts。

### 3.1 数据汇总 `/analysis`（`Analysis/index.vue`）

**业务逻辑**：按机构维度汇总保源/拜访/签单综合指标；右上 `?` 弹指标释义；表格不分页，横向滚动 `x:1710`，支持前端数值/百分比排序。

**查询条件：**
| label | 参数名 | 控件 | 数据源 |
|---|---|---|---|
| 分支公司 | `orgCode`(显示 `__orgCode`) | 机构树 picker | `isSysDepartTree` |
| 统计时间(起/止) | `begin` / `end` | 日历 range | 默认上月1号 ~ 昨天 |
| 归属渠道 | `sourceChannel` | 下拉 | 字典 `source_channel` |

**列表字段：**
| label | 字段 | 类型/格式 |
|---|---|---|
| 机构 | `departName` | string（fixed 左） |
| 新增保源数 | `newCount` | int |
| 拜访数 | `visitCount` | int |
| 上门拜访数 | `doorVisitCount` | int |
| 已点评数 | `commentCount` | int |
| 点评率 | `commentCountPercent` | "80.00%" |
| 签单数 | `successCount` | int |
| 签单保费 | `policyFee` | number(toFixed2) |
| 无新增保源天数 | `noAddDay` | int |
| 总保源数 | `totalCount` | int |
| 已认领保源数 | `distributeCount` | int |
| 已认领占比 | `distributeCountPercent` | "%" |
| 已拜访保源数 | `visitSourceCount` | int |
| 已拜访保源占比 | `visitSourceCountPercent` | "%" |
| 跟踪中保源数 | `trackCount` | int |

**API**：`isMainPageData` → `GET /data/mainPageData/mainPage`，参数 `{begin,end,orgCode,sourceChannel}`。

**Mock：**
```json
{
  "success": true, "code": 200, "message": "成功",
  "result": [
    { "departName": "合计", "newCount": 120, "visitCount": 340, "doorVisitCount": 210, "commentCount": 272, "commentCountPercent": "80.00%", "successCount": 88, "policyFee": 1258000.00, "noAddDay": 0, "totalCount": 5600, "distributeCount": 4200, "distributeCountPercent": "75.00%", "visitSourceCount": 3100, "visitSourceCountPercent": "73.81%", "trackCount": 900 },
    { "departName": "福州市分公司", "newCount": 45, "visitCount": 130, "doorVisitCount": 80, "commentCount": 104, "commentCountPercent": "80.00%", "successCount": 32, "policyFee": 468000.00, "noAddDay": 2, "totalCount": 2100, "distributeCount": 1500, "distributeCountPercent": "71.43%", "visitSourceCount": 1100, "visitSourceCountPercent": "73.33%", "trackCount": 320 }
  ]
}
```

### 3.2 跟踪统计 `/track-summary`（`TrackSummary/index.vue`）
**业务逻辑**：机构维度跟踪统计（拜访+签单+渠道拆分），首行合计，不分页 `x:1590`。
**查询条件**：分支公司、统计时间 range、标签(`labelName`，`isLabelTypePullDownNode`)、归属渠道(`sourceChannel`，字典)。
**API**：`isMainPageDataTrackSummary` → `GET /data/mainPageData/trackSummary`，参数 `{begin,end,orgCode,labelName,sourceChannel}`。返回**数组**，字段以机构名 `departName` + 各类拜访/签单/渠道计数（结构同 3.1 风格，字段名以后端为准）。

### 3.3 劳效统计 `/user-summary`（`UserSummary/index.vue`）
**业务逻辑**：机构维度人效统计，首行合计，`pagination:false`。指标释义见页面 `help-content`。
**查询条件**：分支公司、统计时间 range、标签、归属渠道。
**列表字段：**
| label | 字段 | 格式 |
|---|---|---|
| 机构 | `departName` | string |
| 拜访数 | `visitCount` | int |
| 业务员总人数 | `memberCount` | int |
| 有拜访的业务员 | `visitMemberCount` | int |
| 有拜访业务员占比 | `memberVisitCountPercent` | "%" |
| 人均拜访数 | `visitPerUser` | number |
| 拜访保源数 | `visitSourceCount` | int |
| 拜访签单保源数 | `successCount` | int |
| 拜访成功率 | `visitSuccessPercent` | "%" |
| 签单数 | `policyCount` | int |
| 人均签单数 | `policyCountPerUser` | number |
| 签单保费 | `policyFee` | number(toFixed2) |
| 人均签单保费 | `policyFeePerUser` | number |

**API**：`isMainPageDataUserSummary` → `GET /data/mainPageData/getUserSummary`，参数 `{begin,end,orgCode,labelName,sourceChannel}`。

**Mock：**
```json
{ "success": true, "result": [
  { "departName": "合计", "visitCount": 340, "memberCount": 60, "visitMemberCount": 52, "memberVisitCountPercent": "86.67%", "visitPerUser": 6.5, "visitSourceCount": 310, "successCount": 88, "visitSuccessPercent": "28.39%", "policyCount": 90, "policyCountPerUser": 1.73, "policyFee": 1258000.00, "policyFeePerUser": 24192.31 }
] }
```

### 3.4 拜访明细 `/visit`（`Visit/index.vue`）
**业务逻辑**：拜访明细分页大表（`TableMixin`，`x:1700`）；右上导出图标（权限 `visitTracksDetail:export`）触发**后端推送**（非直接下载）；`projectFlag===1` 时追加工程项目相关列。
**查询条件：**
| label | 参数名 | 控件 | 数据源 |
|---|---|---|---|
| 分支公司 | `orgCode`(显示`__orgCode`) | 机构树 picker | `isSysDepartTree` |
| 统计时间 | `visitTime_begin`/`visitTime_end` | 日历 range | 默认昨天~昨天 |
| 标签 | `labelName` | 下拉 | `isLabelTypePullDownNode` |
| 归属渠道 | `sourceChannel` | 下拉 | 字典 `source_channel` |
| 工程项目 | `projectFlag` | 下拉 | `PROJECT_FLAG` |
| 最后一次拜访 | `isLastRecord` | 下拉 | 0否/1是 |

**列表字段（部分枚举映射）：** 上级机构 `parentOrg`、保源机构 `createOrg`、客户名称 `customerName`、客户地址 `customerAddress`、联系人 `contactsName`、联系人电话 `contactsPhone`、行业类型 `industryName`、保源推送时间 `distributeTime`、认领业务员 `realName`、目标险种 `mriskTypeName`、已保险种 `yriskTypeName`、拜访时间 `visitTime`、打卡时间 `createTime`、拜访类型 `visitTypeCode`(→`VISIT_TYPE`)、拜访进程 `visitProcess`(→`VISIT_PROCESS_STATUS`)、项目名称 `customerProjectName`、预计签单时间 `planDate`、预估保费 `planAmount`、拜访情况 `remark`、点评人 `reviewer`、分管经理点评 `comments`、领导评价 `commentsLv`(→`LEADER_COMMENT_LEVEL`)、是否上级支持 `upFlag`(→`UP_FLAG`,tag)、支持内容 `upContent`、预计下次拜访 `nextVisitTime`、更新时间 `updateTime`、保源标签 `labelName`。
工程项目列（`projectFlag===1`）：`projectArea/projectContent/projectProgress/projectUnit/projectParentUnit/projectLevel`(→`PROJECT_LEVEL`)。

**API**：
- 列表 `GET /data/visitTracks/queryVisitAllList`（`url.list`，走 TableMixin 分页）。
- 导出推送 `isVisitTracksExportXlsNewWx` → `GET /data/visitTracks/exportXlsNewWx`，参数=`queryParam`。

**Mock（分页）：**
```json
{ "success": true, "result": {
  "records": [
    { "id": "1", "parentOrg": "福州市分公司", "createOrg": "鼓楼支公司", "customerName": "某某科技有限公司", "customerAddress": "福州市鼓楼区XX路1号", "contactsName": "张三", "contactsPhone": "13800000000", "industryName": "制造业", "distributeTime": "2026-07-01 09:00:00", "realName": "李业务", "mriskTypeName": "企财险", "yriskTypeName": "责任险", "visitTime": "2026-07-20 14:00:00", "createTime": "2026-07-20 14:05:00", "visitTypeCode": 2, "visitProcess": 1, "customerProjectName": "厂房建设", "planDate": "2026-08-01", "planAmount": 50000, "remark": "客户有意向", "reviewer": "王经理", "comments": "跟进及时", "commentsLv": 3, "upFlag": "Y", "upContent": "总公司支持", "nextVisitTime": "2026-07-28", "updateTime": "2026-07-20 15:00:00", "labelName": "重点客户" }
  ], "current": 1, "size": 15, "total": 1 } }
```

### 3.5 签单明细 `/policy-summary`（`PolicySummary/index.vue`）
**业务逻辑**：签单明细分页大表；导出推送权限 `policyDetail:export`。
**查询条件**：分支公司 `orgCode`、统计时间 `begin`/`end`、标签 `labelName`、归属渠道 `sourceChannel`。
**列表字段：** 上级机构 `parentName`、机构名称 `departName`、业务员 `taskUserRealName`、客户名称 `customerName`、保单号 `policyNo`、续保/新保 `renewFlag`(1无此单/2续保/3新保)、我方净保费 `policyFee`(可排序)、保单录入时间 `createTime`、保单起保时间 `bgnDate`、投保人 `applicantName`、被保人 `insuredName`、客户与投/被保人是否一致 `isCustomerMatch`(0否/1是)。
**API**：列表 `GET /data/mainPageData/policySummary`（`url.list`）；导出 `isMainPageDataPolicySummaryExportWx` → `GET /data/mainPageData/policySummaryExportWx`。

**Mock（分页）：**
```json
{ "success": true, "result": { "records": [
  { "id": "1", "parentName": "福州市分公司", "departName": "鼓楼支公司", "taskUserRealName": "李业务", "customerName": "某某科技有限公司", "policyNo": "PDAA202600001", "renewFlag": 2, "policyFee": 52000.00, "createTime": "2026-07-15 10:00:00", "bgnDate": "2026-07-20", "applicantName": "某某科技有限公司", "insuredName": "某某科技有限公司", "isCustomerMatch": 1 }
], "current": 1, "size": 15, "total": 1 } }
```

---

## 第 4 章 工作台模块

### 4.1 我的保源 `/myis`（菜单项原名称：**我的保源**）

> 入口 `MyInsuranceSource.vue`；点击进入「保源详情」后顶部 `van-tabs` 含三个 tab，原站点名称分别为：**保源信息 / 活动量 / 销售结果**（重构不得改名）。

**业务逻辑**：保源列表（`ListMixin` 上拉），高级搜索含「我的/近期/待点评」；`mounted` 调 `sysUserGroupHasGroup`，返回 `result=false` 时 `Dialog.alert` 提示；底部固定「新增保源」。

**列表字段：** 待点评标签 `waitComments`(→`WAIT_COMMENTS`,tag)、客户名称 `customerName`、客户地址 `customerAddress`、联系人 `contactsName`、联系人电话 `contactsPhone`(tel 拨号)、`id`(跳详情)。
**查询条件：** `updateTimeBegin/updateTimeEnd`(近期时间)、`customerName`、`isSelf`、`isNear`、`isWaitComments`；排序固定 `updateTime desc`。

**API：**
| 用途 | 函数 | 方法 | URL |
|---|---|---|---|
| 列表 | `isMyInsuranceSourceList` | GET | `/data/insuraceSourceDistribution/querySelf` |
| 团队校验 | `sysUserGroupHasGroup` | GET | `/system/sysUserGroup/hasGroup` |
| 详情 | `isMyInsuranceSourceQueryDetailById` / `isQueryById` | GET | `/data/insuraceSource/queryDetailById` / `/data/insuraceSource/queryById` |

**列表 Mock：**
```json
{ "success": true, "result": { "records": [
  { "id": "1001", "customerName": "某某贸易公司", "customerAddress": "福州市台江区XX路8号", "contactsName": "陈经理", "contactsPhone": "13900000000", "waitComments": 1, "updateTime": "2026-07-25 16:00:00" }
], "current": 1, "size": 10, "total": 1 } }
```

#### 4.1.1 新增 / 修正保源（页面 `MyInsuranceSourceAdd/index.vue`，原名称：**新增保源**）
`id` 存在=修正（编辑），否则新增。编辑先 `isQueryById` 回填；新增时客户名称 `blur` 调 `isAddCheck` 查重，命中展示历史收录公司。
**表单字段：**
| label | 字段 | 控件 | 必填 | 校验 | 数据源 |
|---|---|---|---|---|---|
| 统一社会信用码 | `socialCreditCode` | 输入 | 是 | required | — |
| 客户名称 | `customerName` | 输入 | 是 | required + 长度≥5 | — |
| 客户地址 | `customerAddress` | 输入 | 是 | required | — |
| 联系人 | `contactsName` | 输入 | 是 | required | — |
| 联系电话 | `contactsPhone` | 输入 | 是 | required | — |
| 产品线 | `__productLine`→`productLine`(逗号串) | 多选 picker | 是 | required | `isProductLineTypes` |
| 保源标签 | `__customerLabel`→`customerLabel`(逗号串) | 多选 picker | 是 | required + ≤2个 | `isLabelTypePullDownAll` |

**API：** 查重 `isAddCheck` `GET /data/insuraceSource/addCheck`（`{customerName}`）；新增 `isAdd` `POST /data/insuraceSource/add`；编辑 `isEdit` `PUT /data/insuraceSource/edit`。
**详情/回填 result Mock：**
```json
{ "success": true, "result": { "id": "1001", "socialCreditCode": "913500001XXXXXXXXX", "customerName": "某某贸易有限公司", "customerAddress": "福州市台江区XX路8号", "contactsName": "陈经理", "contactsPhone": "13900000000", "productLine": "1,2", "customerLabel": "3,5" } }
```

#### 4.1.2 保源详情（页面 `MyISDetail`，原名称：**保源详情**）
顶部 `van-tabs` 三 tab；当前 tab 序号持久化到 `app/SET_PAGE_MYIS_DETAIL_TAB_ACTIVE`。

**Tab 一 · 保源信息（`Detail.vue`）** —— `isMyInsuranceSourceQueryDetailById` 回填，`result` 直接渲染：
| label | 字段 | 说明 |
|---|---|---|
| 统一社会信用码 | `socialCreditCode` | — |
| 客户名称 | `customerName` | — |
| 客户地址 | `customerAddress` | — |
| 行业类型 | `industryTypeName` | — |
| 注册资本 | `registerCapital` | — |
| 单位电话 | `companyPhone` | — |
| 联系人部门 | `contactsDepartment` | — |
| 联系人职务 | `contactsPosition` | — |
| 联系人名称 | `contactsName` | — |
| 联系人电话 | `contactsPhone` | tel 拨号 |
| 产品线 | `productLineStr` | 逗号串 |
| 保源标签 | `labelList[].labelName` | 多标签拼接显示 |
| 已保险种 | `yriskyTypeStr` | — |
| 备注 | `remark` | — |
| 推荐险种 | `recommends[].riskyName` + `recommends[].fee` | 分组内多行 |

**Tab 二 · 活动量（`ActiveList.vue`，原名称：**活动量**）**
- 新增按钮权限 `visitTracks:add` → 跳 `MyISActiveAdd`（`/myis/active-add/:sourceId`）。
- 列表（`ListMixin`）：`GET /data/visitTracks/queryVisitList`，参数 `sourceId` + `pageNo/pageSize`，排序 `updateTime desc`。
- 列表字段：
  | label | 字段 | 映射/格式 |
  |---|---|---|
  | 业务员 | `realName` | — |
  | 拜访类型 | `visitTypeCode` | →`VISIT_TYPE`（0电话/1微信/2上门） |
  | 打卡状态 | `signInImgUrl`/`signInPosAddr` | 上门(`=2`)时：缺→「待打卡」(warning)；全→「打卡成功」(success) |
  | 拜访进程 | `visitProcess` | →`VISIT_PROCESS_STATUS` |
  | 活动时间 | `visitTime` | `YYYY-MM-DD HH:mm:ss` |
  | 领导点评 | `commentsLv`/`comments` | →`LEADER_COMMENT_LEVEL`，缺→「待点评」(warning) |
- 左滑操作（权限 `visitTracks:comments`/`edit`/`delete`，且 `isSelfData` 仅本人可见编辑/删除）：
  - **点评**（领导，`visitTracks:comments`）：`MyISCommentEdit` → 见 4.1.5。
  - **详情**（`visitTracks:comments`，业务员）：`MyISActiveEdit` 只读 → 见 4.1.4。
  - **编辑**（`visitTracks:edit`，业务员）：`MyISActiveEdit` → 见 4.1.4。
  - **删除**（`visitTracks:delete`，业务员）：`handleDelete` → `Dialog.confirm`（「确定删除吗？」）→ `isVisitTracksDelete` `DELETE /data/visitTracks/delete` → 前端移除。
- 列表 Mock（`result.records`）：
```json
{ "id":"9001", "realName":"李业务", "visitTypeCode":2, "visitProcess":1, "visitTime":"2026-07-20 14:00:00", "signInImgUrl":"/signInImg/xx.jpg", "signInPosAddr":"福州市鼓楼区XX", "commentsLv":3, "comments":"跟进及时", "isSelfData":true }
```

**Tab 三 · 销售结果（`ResultList.vue`，原名称：**销售结果**）**
- 新增按钮权限 `visitTracks:result` → 跳 `MyISResultAdd`（`/myis/result-add/:sourceId`）。
- 列表（`ListMixin`）：`GET /data/policyInfo/list`，参数 `sourceId` + 分页，排序 `createTime desc`。
- 列表字段：
  | label | 字段 | 映射/格式 |
  |---|---|---|
  | 业务员 | `realName` | — |
  | 销售结果 | `saleFlag` | →`SALES_RESULT_STATUS`（Y成功/green，N失败/red） |
  | 销售归属 | `saleType` | →`SALE_TYPE`（仅 `saleFlag=Y` 显示） |
  | 保单号 | `policyNo` | 仅成功显示 |
  | 保费 | `policyFee` | 仅成功显示 |
  | 时间 | `createTime` | — |
- 左滑操作（权限 `visitTracks:edit`/`delete`，且 `isSelfData`）：**编辑** → `MyISResultEdit`（见 4.1.3）；**删除** → `isPolicyInfoDelete` `DELETE /data/policyInfo/delete`。
- 列表 Mock（`result.records`）：
```json
{ "id":"9101", "realName":"李业务", "saleFlag":"Y", "saleType":1, "policyNo":"PDAA202600001", "policyFee":52000.00, "createTime":"2026-07-15 10:00:00", "isSelfData":true }
```

#### 4.1.3 录入销售结果 / 编辑（页面 `MyISResultEdit`，原名称：**录入销售结果** / **销售结果编辑**）
`id` 存在=编辑（`isPolicyInfoQueryById` 回填），否则新增（`sourceId` 进入）。
**表单字段：**
| label | 字段 | 控件 | 必填 | 数据源/说明 |
|---|---|---|---|---|
| 销售归属 | `saleType` | 单选 picker | 是 | `SALE_TYPE`（`selectDatas.saleType`） |
| 保单号 | `policyNo` | 输入 | 是 | `blur` 调 `getInsureOrderInfo` 自动带出保费/险种/渠道/起止期/被保人证件 |
| 保费 | `policyFee` | 数字输入(只读) | 是 | 由保单号自动回填 `sumnetpremium` |

提交时一并带出（保单号回显）：`riskTypeCode`/`riskCategoryName`/`channelTypeName`/`bgnDate`/`endDate`/`renewFlag`/`insuredIdCode`；`saleFlag` 恒为 `Y`。

**API：**
| 用途 | 函数 | 方法 | URL |
|---|---|---|---|
| 查询保单信息（自动带出） | `getInsureOrderInfo` | GET | `/data/policyInfo/getInsureOrderInfo` |
| 回显 | `isPolicyInfoQueryById` | GET | `/data/policyInfo/queryById` |
| 新增 | `isPolicyInfoAdd` | POST | `/data/policyInfo/add` |
| 编辑 | `isPolicyInfoEdit` | PUT | `/data/policyInfo/edit` |
| 删除 | `isPolicyInfoDelete` / `isPolicyInfoDeleteBatch` | DELETE | `/data/policyInfo/delete` / `/data/policyInfo/deleteBatch` |

> 当前实现 `__saleFlag` 恒为 true（仅支持成功结果录入）；失败结果(`saleFlag=N`)分支在源码中被注释。重构如需保留「失败」录入，须与后端确认 `saleFlag=N` 时字段约束。

#### 4.1.4 活动量录入 / 编辑（页面 `MyISEdit`，原名称：**活动量录入** / **活动量编辑**）
`id` 存在=编辑（`isVisitTracksQueryById` 回填，含照片回显、险种名回显），否则新增（`sourceId` 带入「上次拜访对象快捷填入」`isLastVisitTarget`）。
**表单字段：**
| label | 字段 | 控件 | 必填 | 数据源/说明 |
|---|---|---|---|---|
| 目标险种 | `mriskTypeCode`/`__mriskTypeLable` | 多级联动 picker(`formatRiskTypeDatas`) | 是 | `isRiskTypeTree` |
| 拜访时间 | `visitTime` | 日期时间 | 是 | `YYYY-MM-DD HH:mm:ss` |
| 拜访类型 | `visitTypeCode` | 单选 picker | 是 | `VISIT_TYPE`（`selectDatas.visitTypeCode`） |
| 拜访凭证(电话/微信) | `uploader` | 上传(`max-count=2`) | 是(类型0/1) | `isVisitTracksUploadPhoto`；示例图 `tel-demo.png` |
| 拍照打卡(上门) | `uploader` | 相机上传 | 是(类型=2) | 同上 |
| 打卡地点 | `signInPosAddr` | 文本(禁用,按钮定位) | 是(类型=2) | 腾讯地图 `qq.maps.Geolocation` |
| 打卡时间 | `signInTime` | 文本(只读) | 编辑态显示 | — |
| 拜访进程 | `visitProcess` | 单选 picker | 是 | `VISIT_PROCESS_STATUS`；选「跟进中(1)」「同业投保(2)」联动后续字段 |
| 业务去向 | `bussinessBelong` | 单选 picker | 进程=2时 | `BUSSINESS_BELONG_TYPE`(id=name) |
| 其他同业投保 | `bussinessBelongOther` | 输入 | 去向=其他时 | — |
| 其他主体承保条件 | `insuranceCondition` | 文本域 | 进程=2时 | — |
| 预计签单时间 | `planDate` | 日期 | 进程=1时 | — |
| 预估保费 | `planAmount` | 数字 | 进程=1时 | — |
| 预估保额 | `planSumamount` | 数字 | 进程=1时 | — |
| 是否可持续跟踪 | `__continueFlag` | 开关 | 否(默认开) | →`continueFlag`(1/0) |
| 是否上级支持 | `__upFlag` | 开关 | 否 | →`upFlag`(Y/N) |
| 上级支持内容 | `upContent` | 文本域 | 开时 | ≥10字 |
| 拜访对象 | `targetName` | 输入 | 是 | 支持「最近一次拜访对象」快捷带入 |
| 拜访对象职务 | `targetPosition` | 输入 | 是 | — |
| 拜访对象联系方式 | `targetPhone` | 输入 | 是 | — |
| 拜访情况 | `remark` | 文本域 | 是 | ≥20字 |

**API：**
| 用途 | 函数 | 方法 | URL |
|---|---|---|---|
| 回显 | `isVisitTracksQueryById` | GET | `/data/visitTracks/queryById` |
| 新增 | `isVisitTracksAdd` | POST | `/data/visitTracks/add` |
| 编辑 | `isVisitTracksEdit` | PUT | `/data/visitTracks/edit` |
| 上传照片 | `isVisitTracksUploadPhoto` | POST(multipart) | `/data/visitTracks/uploadPhoto` |
| 上次拜访对象 | `isLastVisitTarget` | GET | `/data/visitTracks/lastVisitTarget` |

> 上门拜访(`visitTypeCode=2`)提交时额外带 `signInLatitude/signInLongitude/signInPosAddr/signInPosName`；照片取 `uploader[0/1].originUrl`→`signInImgUrl/signInImgUrl2`。`formatRiskTypeDatas`/`getSelectedIndexArray` 多级联动逻辑属本页私有，建议重构时并入公共险种树组件。

#### 4.1.5 活动量点评（页面 `MyISComment`，原名称：**活动量点评** / 领导点评）
**表单字段：**
| label | 字段 | 控件 | 必填 | 数据源 |
|---|---|---|---|---|
| 领导点评 | `comments` | 文本域 | 否 | — |
| 领导评价 | `commentsLv` | 单选 picker | 是 | `LEADER_COMMENT_LEVEL` |
| 下次拜访时间 | `nextVisitTime` | 日期时间 | 是 | `YYYY-MM-DD HH:mm:ss` |

**API：** 回显 `isVisitTracksQueryById` `GET /data/visitTracks/queryById`；提交 `isVisitTracksCommentsEdit` `PUT /data/visitTracks/comments`。权限 `visitTracks:comments`。

#### 4.1.6 外出打卡（页面 `MyISActiveCardEdit`，原名称：**外出打卡**）
对已有活动量记录（`id`）补/改拍照打卡。
**表单字段：**
| label | 字段 | 控件 | 必填 | 说明 |
|---|---|---|---|---|
| 拍照打卡 | `uploader`→`signInPhotoUrls[]` | 上传(`max-count=2`) | 否 | `isVisitTracksUploadPhoto` |
| 打卡地点 | `signInPosAddr`/`signInLatitude`/`signInLongitude` | 文本+定位 | 是 | 腾讯地图定位 |
| 地图预览 | — | TMap | — | `signInLatitude/Longitude` 非空才渲染 |

**API：** 回显 `isVisitTracksQuerySignIn` `GET /data/visitTracks/querySignIn`；提交 `isVisitTracksSignIn` `POST /data/visitTracks/signIn`，参数 `signInLatitude/signInLongitude/signInPosAddr/visitId/signInPhotoUrls[]`。

> ⚠️ 原站点「打卡」入口（`MyISActiveCardEdit`）在 `MyISDetail` 左滑菜单中已被注释，仍可经 `/myis/active-card-edit/:id` 直达。重构时建议恢复为上门拜访记录的「打卡 / 查看打卡」入口，避免功能不可达。

### 4.2 非车待续保跟踪 `/fcdd-policy-main`（`FcddPolicyMain/` + `FcddPolicyDetail/`）

**业务逻辑**：待续保保单列表（上拉）→ 点击进详情 → 反馈。反馈状态、保单状态、反馈原因见枚举 `FCDD_FEEDBACK_FLAG` / `FCDD_RENEWAL_STATUS` / `FCDD_REASON`；到期筛选 `FCDD_DAY_TYPE`。

**列表字段（典型）：** 客户/投保人、保单号 `policyno`、险种、到期时间 `enddate`、上年保费、反馈状态 `feedbackflag`(→tag)、保单状态 `renewalstatus`(→tag)。
**查询条件：** 分支公司、到期时间类型 `dayType`(`FCDD_DAY_TYPE`)、反馈状态、保单状态、保单号。
**详情字段：** 保单基本信息 + 历史反馈记录列表。
**反馈表单：** 反馈原因 `reason`(`FCDD_REASON`)、反馈内容 `content`、（可选）预计续保时间。

**API：**
| 用途 | 函数 | 方法 | URL |
|---|---|---|---|
| 列表 | `fcddPolicyMainList` | GET | `/data/fcddPolicyMain/list` |
| 详情 | `fcddPolicyMainDetail` | GET | `/data/fcddPolicyMain/detail` |
| 反馈 | `fcddPolicyMainFeedBack` | POST | `/data/fcddPolicyMain/feedBack` |

**列表 Mock：**
```json
{ "success": true, "result": { "records": [
  { "id": "2001", "policyno": "PDDD202500001", "appliname": "某某制造公司", "riskcname": "企财险", "enddate": "2026-08-15", "coinsnetpremium": 86000, "feedbackflag": 0, "renewalstatus": 0 }
], "current": 1, "size": 10, "total": 1 } }
```

### 4.3 拜访汇总 `/monitor/track/visit`（`monitor/track/Visit/`）
**业务逻辑**：拜访汇总统计 + 结果推送页（推送动作触发后端导出）。
**API：** 推送 `isVisitTracksExportXlsWx` → `GET /data/visitTracks/exportXlsWx`，参数=筛选条件。
> ⚠️ 现有 `exportXlsWx` 失败提示误写为「添加失败」，重构应改为「推送失败」。

---

## 第 5 章 千万级企业决策模块

> 共性：`TableMixin`，`a-table` `pagination:false`，`pageSize=200` 一次全量，横向滚动。筛选：分支公司 `comdcode`(树) + 报告日期 `reportdate`(下拉) + 产品线 `reporttype`(前端固定「全量/商团」，默认全量)。无子组件、无钻取、无 tab、无图表。

### 5.1 客户渗透率 `/JcEnterpriseItemList`（`jc/JcEnterpriseItemList/index.vue`）
**列表 API**：`GET /policy/jcEnterpriseItem/list`（组件内硬编码 `url.list`，未在 api/index 单独导出）。
**查询条件：**
| label | 参数 | 数据源 |
|---|---|---|
| 分支公司 | `comdcode`(显示`__orgCode`) | 机构树 |
| 报告日期 | `reportdate`(YYYYMM) | `jcEnterpriseItemSelectDates`，默认最后一项 |
| 产品线 | `reporttype` | 固定 全量/商团 |

**列表字段（多维报表，行=分支公司 `comzname`）：** 企业数量 `enterCount`、标的渗透率(全险)`enterRateHasbf`、标的渗透率(不含车险)`enterRateHasbfFc`、产品渗透率(全险)`enterRateHasbfTwo`、产品渗透率(不含车险)`enterRateHasbfTwoFc`、公司承保客户数(全险)`enterCountHasbf`… 及分险种客户数量（12 险种口径，字段以后端为准）。比例字段后端返回 0~1，前端 `*100 + '%'`。

**Mock：**
```json
{ "success": true, "result": { "records": [
  { "comzname": "福州市分公司", "enterCount": 1200, "enterRateHasbf": 0.62, "enterRateHasbfFc": 0.41, "enterRateHasbfTwo": 0.55, "enterRateHasbfTwoFc": 0.33, "enterCountHasbf": 744 }
], "current": 1, "size": 200, "total": 1 },
  "others": { "currOrgCode": "3501" } }
```

### 5.2 新续企业增量保费 `/JcEnterpriseRiskList`（`jc/JcEnterpriseRiskList/index.vue`）
**列表 API**：`GET /policy/jcEnterpriseRisk/list`（同样组件内硬编码，结构同 5.1）。
**查询条件**：同 5.1（分支公司/报告日期/产品线）。
**列表字段**：行=分支公司，列为新保/续保企业数、增量保费（按险种口径）等（字段以后端为准）。
**Mock**：结构同 5.1 分页 `result.records`。

---

## 第 6 章 续保管理（非车）模块

> 共性：`ListMixin` 上拉；公共筛选=分支公司(树，`comcode`/`__orgCode`) + 保单到期时间 range(`enddate_begin`/`enddate_end`，默认上月1日~昨天)。列表左滑 `van-swipe-cell` 出操作。枚举见 [1.6 续保](#续保xbdataconfigjs)。

### 6.1 我的续保 `/xb/renewedList`（`xb/RenewedList/`）
**业务逻辑**：续保保源列表；左滑 6 入口：已续保单信息 / 续保反馈 / 续保录入 / 问题项目录入 / 申请项目终止 / 再次预审核；右箭头进详情。
**查询条件：** 分支公司 `comcode`、到期时间 `enddate_begin/end`、续保状态 `renewedStatus`(`RENEWED_STATUS`)、上年保单号 `policyno`。
**列表字段：** 续保状态 `renewedStatus`(tag)、地市 `comdname`、支公司 `comzname`、投保人 `appliname`、上年保单号 `policyno`、上年保费 `coinsnetpremium`、产品名称 `riskcname`、到期时间 `enddate`、服务经理 `contactsName`、`id`。

**API 与子操作：**
| 操作 | 函数 | 方法 | URL |
|---|---|---|---|
| 列表 | (url.list) | GET | `/xb/xbExtendInfo/renewedList` |
| 续保详情 | `xbRenewedSearchByPolicyNo` | GET | `/xb/xbExtendInfo/renewedSearchByPolicyNo` |
| 已续保单信息 | `xbExtendInfoRenewedInfo` | GET | `/xb/xbExtendInfo/renewedInfo` |
| 续保反馈-提交 | `xbFeedbackDataAdd` | POST | `/xb/xbFeedbackData/add` |
| 续保反馈-回显 | `xbGetCurrentFeedbackData` | GET | `/xb/xbFeedbackData/getCurrentFeedbackData` |
| 续保录入 | `xbRenewedInput` | POST | `/xb/xbExtendInfo/renewedInput` |
| 问题项目录入 | `xbRenewedQuestionInput` | POST | `/xb/xbExtendInfo/renewedQuestionInput` |
| 申请项目终止 | `xbRenewedEndInput` | POST | `/xb/xbExtendInfo/renewedEndInput` |
| 再次预审核 | `xbRenewedRequestAudit` | POST | `/xb/xbExtendInfo/requestAudit` |

**各 EditModal 表单字段（源码实际提取）：**
| 弹窗（原名称） | 字段 | 控件 | 必填 | 校验/数据源 | 提交 API |
|---|---|---|---|---|---|
| `EditModalFeedback`（续保反馈） | `feedbackContent` | 文本域 | 是 | ≥10字；携带 `policyNo`/`dayFlag`/`type` | `xbFeedbackDataAdd` POST `/xb/xbFeedbackData/add` |
| `EditModalRenewedInput`（续保录入） | `renewedPolicyNo`/`renewedStart`/`renewedEnd`/`renewedFee` | 输入+日历 | 均必填 | 起止期 `van-calendar`；携带 `policyNo` | `xbRenewedInput` POST `/xb/xbExtendInfo/renewedInput` |
| `EditModalRenewedQuestionInput`（问题项目录入） | `content`+`type` | 文本域+单选 | 均必填 | `content`≥10字；`type`→`RENEWED_QUESTION_INPUT_TYPE`；携带 `policyNo` | `xbRenewedQuestionInput` POST `/xb/xbExtendInfo/renewedQuestionInput` |
| `EditModalRenewedEndInput`（申请项目终止） | `content`+`type` | 文本域+单选 | 均必填 | `content`≥10字；`type`→`END_TYPE`；携带 `policyNo` | `xbRenewedEndInput` POST `/xb/xbExtendInfo/renewedEndInput` |
| `EditModalRequestAudit`（再次预审核） | `content` | 文本域 | 是 | ≥10字；携带 `policyNo` | `xbRenewedRequestAudit` POST `/xb/xbExtendInfo/requestAudit` |

> 反馈弹窗回显：`xbGetCurrentFeedbackData` GET `/xb/xbFeedbackData/getCurrentFeedbackData`（带 `dayFlag`，标题动态显示「脱保N天/到期N天续保反馈」）。所有弹窗均经路由参数 `policyNo` 关联主记录。

**列表 Mock：**
```json
{ "success": true, "result": { "records": [
  { "id": "3001", "renewedStatus": 0, "comdname": "福州", "comzname": "鼓楼支公司", "appliname": "某某物流公司", "policyno": "PDAA202500088", "coinsnetpremium": 120000, "riskcname": "货运险", "enddate": "2026-08-31", "contactsName": "李服务" }
], "current": 1, "size": 10, "total": 1 } }
```

### 6.2 问题项目 `/xb/questionList`（`xb/QuestionList/`）
**业务逻辑**：问题项目列表（上拉），左滑「反馈」。
**列表字段**：问题状态 `questionStatus`(`QUESTION_STATUS`,tag)、问题类型 `questionType`(`QUESTION_TYPE`)、逾期状态 `delayStatus`(`QUESTION_DELAY_STATUS`) + 保单/客户基本字段（同 6.1 风格）。
**反馈表单** `EditModalFeedback`：问题反馈内容、（可选）是否解决；提交 `xbExtendInfoQuestionInput` `POST /xb/xbExtendInfo/questionInput`。
**列表 API**：`GET /xb/xbExtendInfo/questionList`（`url.list`）。

### 6.3 项目终止 `/xb/endList`（`xb/EndList/`）
**业务逻辑**：终止项目列表（上拉），左滑「反馈」。
**列表字段**：终止状态 `endStatus`(`END_STATUS`,tag)、终止原因 `endType`(`END_TYPE`)、逾期状态 `delayStatus`(`END_DELAY_STATUS`) + 保单/客户基本字段。
**反馈表单** `EditModalFeedback`：终止反馈内容；提交 `xbExtendInfoEndInput` `POST /xb/xbExtendInfo/endInput`。
**列表 API**：`GET /xb/xbExtendInfo/endList`（`url.list`）。

> 6.1/6.2/6.3 共用 `/xb/xbExtendInfo/*` 接口族与 `xb/dataConfig.js` 枚举，仅列表 URL、状态字段、反馈动作不同。

---

## 第 7 章 车险续保管理模块

### 7.1 车险我的续保 `/xbCar/renewedList`（`xbCar/RenewedList/`）
**业务逻辑**：车险续保保单列表（`ListMixin`，`GET /xb/xbExtendInfoCar/renewedList`），默认终保日期 上月月初~昨天；左滑操作受按钮权限 + `showStatus∈[3,4,5]` 隐藏。

**查询条件：**
| label | 参数 | 控件 | 数据源 |
|---|---|---|---|
| 终保日期 | `enddate_begin/end` | 日历 range | 默认上月初~昨天 |
| 车牌号 | `licenseno` | 输入 | — |
| 车架号 | `frameno` | 输入 | — |
| 保单号 | `policyno` | 输入 | — |
| 新能源标志 | `energyflag` | 下拉 | `YN_FLAG` |
| 续保状态 | `renewedStatus` | 下拉 | `RENEWED_STATUS2` |
| 保单状态 | `showStatus` | 下拉 | `SHOW_STATUS` |

**列表字段：** 保单状态 `showStatus`(→`SHOW_STATUS`)、地市 `comdname`、支公司 `comzname`、服务经理 `dutyName`、车牌号 `licenseno`、车架号 `frameno`、新能源 `energyflag`(→`YN_FLAG`)、投保人 `appliname`、被保险人 `insuredname`、我方净保费 `coinsnetpremium`、起保 `startdate`、终保 `enddate`、保单号 `policyno`、`id`、终止按钮状态 `endBtnStatus`(1显示终止/2显示取消终止)。

**按钮权限与操作：**
| 操作 | 权限 | 触发 | API |
|---|---|---|---|
| 续保反馈 | `xbCarRenewedList:Feedback` | 跳反馈页 | `xbFeedbackDataAdd`(共用) / 回显 `xbGetCurrentFeedbackCarData` `GET /xb/xbFeedbackData/getCurrentFeedbackCarData` |
| 项目终止 | `xbCarRenewedList:RenewedEndInput` 且 `endBtnStatus===1` | 跳终止页 | `xbCarExtendInfoEndInput` `POST /xb/xbExtendInfoCar/endInput` |
| 取消终止 | `xbCarRenewedList:RenewedEndInput` 且 `endBtnStatus===2` | 直接调用 | `xbExtendInfoCarEndPass` `POST /xb/xbExtendInfoCar/endPass`，参数 `{pass:3,id}` |
| 退回业务 | `xbCarRenewedList:RenewedBack` | 跳退回页 | `xbExtendInfoCarBack` `POST /xb/xbExtendInfoCar/back` |
| 续保录入 | — | — | `xbCarRenewedInput` `POST /xb/xbExtendInfoCar/renewedInput` |
| 详情 | — | tab（基本信息/反馈） | `xbCarRenewedSearchByPolicyNo` `GET /xb/xbExtendInfoCar/renewedSearchByPolicyNo` |

**各反馈/终止/退回表单字段（源码实际提取）：**
| 弹窗（原名称） | 触发 | 字段 | 控件 | 必填 | 校验/数据源 | 提交 API |
|---|---|---|---|---|---|---|
| `EditModalFeedback`（续保反馈） | `xbCarRenewedList:Feedback` | `renewedStart`(预计签单时间)+`feedback` | 日历+文本域 | 均必填 | `feedback`≥10字；回显 `xbGetCurrentFeedbackCarData`(`dayFlag` 决定标题) | `xbCarRenewedInput` POST `/xb/xbExtendInfoCar/renewedInput` |
| `EditModalRenewedEndInput`（项目终止） | `xbCarRenewedList:RenewedEndInput` 且 `endBtnStatus===1` | `type`(终止原因)+`content`(说明) | 单选+文本域 | 均必填 | `content`≥10字；`type`→`CAR_RENEWED_END_INPUT_TYPE`(1卖车/2过户/3报废/4其他)；携带 `id` | `xbCarExtendInfoEndInput` POST `/xb/xbExtendInfoCar/endInput` |
| `EditModalRenewedBack`（退回业务） | `xbCarRenewedList:RenewedBack` | `content`(退回原因说明) | 文本域 | 是 | ≥10字；携带 `id` | `xbExtendInfoCarBack` POST `/xb/xbExtendInfoCar/back` |
> 取消终止：`xbExtendInfoCarEndPass` POST `/xb/xbExtendInfoCar/endPass`（参数 `{pass:3,id}`，`endBtnStatus===2` 直调）。

**详情字段（基本信息）：** 地市 `comdname`、支公司 `comzname`、服务经理 `dutyName`、车牌号 `licenseno`、车架号 `frameno`、新能源 `energyflag`、保监会分类 `usenature`(逗号合并)、投保人 `appliname` 等。反馈 tab：历史反馈列表 `GET /xb/xbFeedbackData/list`（`queryParam.policyNo`）+ 录入按钮（权限 `xbCarRenewedList:Feedback`）。

**列表 Mock：**
```json
{ "success": true, "result": { "records": [
  { "id": "4001", "showStatus": 1, "comdname": "福州", "comzname": "鼓楼支公司", "dutyName": "王服务", "licenseno": "闽A12345", "frameno": "LFV1234567890", "energyflag": 1, "appliname": "张三", "insuredname": "张三", "coinsnetpremium": 4200, "startdate": "2025-08-01", "enddate": "2026-07-31", "policyno": "PDAM202500123", "endBtnStatus": 1 }
], "current": 1, "size": 10, "total": 1 } }
```

---

## 第 8 章 领航足迹模块

### 8.1 我的领航 `/lhzj`（`lhzj/index.vue` / `Edit.vue` / `Preview.vue`）

**业务逻辑**：领航拜访记录列表（`ListMixin` + `van-list` 上拉），可折叠筛选表单；列表左滑按 `btnStatus` + 按钮权限出「查看/编辑/删除」；底部固定「添加拜访」（权限 `lhVisitInfo:add`）。首条带闪烁「左划」提示图标，滑动后消失。

**查询条件：**
| label | 参数 | 控件 | 数据源 |
|---|---|---|---|
| 拜访时间 | `visitTime_begin/end` | 日历 range | 默认本周一~周日，可清空 |
| 拜访机构 | `comzcode` | 树 picker(`CustomerTypePicker`) | `isSysDepartTree`（`fieldNames:{id:orgCode,text:title}`) |
| 地市 | `comdname` | 下拉 | `COMDNAME` |
| 拜访人职务 | `visitPosition` | 下拉 | `VISIT_POSITION` |
| 拜访人 | `visitName` | 输入 | — |
| 客户名称 | `customerName` | 输入 | — |
| 客户分类 | `customerTypeId` | 树 picker | `lhzjCustomerType` |

**列表字段：** 地市 `comdname`、支公司 `comzname`、拜访人 `visitName`、拜访人职务 `visitPosition`、拜访时间 `visitTime`、客户名称 `customerName`、客户类型 `customerTypeName`、拜访内容 `visitContent`、拜访对象 `targetName`、`btnStatus`(1仅查看/2查看+编辑+删除)、`id`。

**API：**
| 操作 | 函数 | 方法 | URL |
|---|---|---|---|
| 列表 | `lhzjList` / url.list | GET | `/lhzj/lhVisitInfo/list` |
| 详情/回填 | `lhzjQueryById` | GET | `/lhzj/lhVisitInfo/queryById` |
| 新增 | `lhzjAdd` | POST | `/lhzj/lhVisitInfo/add` |
| 编辑 | `lhzjEdit` | POST | `/lhzj/lhVisitInfo/edit` |
| 删除 | `lhzjDelete` | DELETE | `/lhzj/lhVisitInfo/delete`（`{id}`） |
| 上传照片 | `lhzjUploadPhoto` | POST(multipart) | `/lhzj/lhVisitInfo/uploadPhoto` |
| 删除照片 | `lhzjRemoveAttach` | POST | `/lhzj/lhVisitInfo/removeAttach`（`{id}`） |
| 客户分类 | `lhzjCustomerType` | GET | `/lhzj/lhVisitInfo/customerType` |
| 导出 | `lhzjExport` | GET(downFile) | `/lhzj/lhVisitInfo/exportXls` |

#### 新增/编辑表单（`Edit.vue`，`id` 存在=编辑）
| label | 字段 | 控件 | 必填 | 数据源/说明 |
|---|---|---|---|---|
| 拜访机构 | `comzcode` | 树 picker | 是 | `isSysDepartTree` |
| 拜访人 | `visitName` | 输入 | 是 | — |
| 拜访人职务 | `visitPosition` | 多选 picker | 是 | `VISIT_POSITION`；提交时 id 数组→name 逗号串，回填时反解析 |
| 客户名称 | `customerName` | 输入 | 是 | — |
| 客户分类 | `customerTypeId` | 树 picker | 是 | `lhzjCustomerType` |
| 拜访对象 | `targetName` | 输入 | 是 | — |
| 拜访对象职务 | `targetPosition` | 输入 | 是 | — |
| 拜访时间 | `visitTime` | 日期 picker | 是 | `YYYY-MM-DD` |
| 拜访内容 | `visitContent` | 文本域 | 是 | 以项目储备为主 |
| 拜访照片 | `files` | van-uploader | 否 | 单张，先上传得 `fileUrl`，提交 `[{id?,fileName,fileUrl}]` |

**删除逻辑**：列表 `onDelete` → `Dialog.confirm`（「确定要删除该拜访记录吗？」）→ `lhzjDelete({id})` → 成功后 `loadData(1)`。照片删除 `before-delete` → `lhzjRemoveAttach`。

**详情/回填 Mock：**
```json
{ "success": true, "result": {
  "id": "5001", "comzcode": "350101", "comzname": "鼓楼支公司", "comdname": "福州",
  "visitName": "李领航", "visitPosition": "支公司经理室,市公司部门经理",
  "visitTime": "2026-07-20", "customerName": "某某集团", "customerTypeId": "T01", "customerTypeName": "大型企业",
  "targetName": "赵总", "targetPosition": "董事长", "visitContent": "洽谈XX项目合作",
  "files": [ { "id": "f1", "fileName": "现场.jpg", "fileUrl": "/upload/lhzj/2026/07/xxx.jpg" } ]
} }
```
> 图片访问 URL = `defaultSettings.imgBaseUrl + fileUrl + '?token=' + token`。

---

## 第 9 章 Vue3 重构落地建议

1. **公共层先行**：按第 1 章落地 `useList`（合并两套 Mixin）、`useDict/useOrgTree`（带缓存）、权限 composable（`hasMenu/hasBtn` + `v-permission` 用 `v-if` 逻辑，弃用 removeChild）、统一 `request`（Axios 拦截统一响应/登录态 401/510）。
2. **公共组件重写**：`OrgTreePicker`（消灭各页 `formatRiskTypeDatas` 重复代码）、`SelectPicker`、`CheckboxPicker`、`DatetimePicker`、`TreePicker`，`v-model` 改 `modelValue`。
3. **枚举集中化**：合并 4 处 `dataConfig.js` 为 `src/enums/`，TS 枚举 + `label(id)` 工具；后端返回带 `%` 的字符串字段维持不变以减少改动。
4. **表格方案**：`a-table` 在移动端体验差，建议评估替换为虚拟滚动表格或卡片式；分页统一（上拉 vs 全量 vs 翻页）。
5. **接口具名化**：`jc/*`、`xb/*List`、`policySummary`、`visitList` 等多处 `url.list` 硬编码，统一登记到 `api/` 具名导出并加 TS 类型。
6. **文案/隐患修复**：拜访明细/签单明细/拜访汇总导出失败提示「添加失败」应改「推送失败」；`getQueryParams` 清空 `queryParam` 副作用；详情页字段拼接空串保护。
7. **状态流转**：续保「续保/问题/终止」及车险「反馈/终止/取消/退回」状态由后端主导（`showStatus`/`endBtnStatus`/各 delayStatus 驱动按钮显隐），前端无需内置状态机，仅按返回值渲染。
8. **导出**：移动端 `ExportXlsBtn` 直接下载已废弃，统一走后端「推送到微信」的 exportXlsWx 系列接口。

---

> 附：本文档以 `Menu.vue` 全部 15 个可用菜单项为入口，逐一覆盖了功能模块、列表/新增/编辑/删除字段、执行逻辑、后端数据格式、Mock 数据、API 地址与查询参数，并将下拉/字典/选择器/分页/权限/枚举等公共能力统一抽离到第 1 章，避免重构时各页面重复实现。字段以源码为准，标「以后端为准/以组件为准」处需结合真实接口再校订。
