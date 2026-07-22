# API 层约定

按业务模块拆分 API，并支持不同模块目录对接**不同后端格式**。

## 目录结构

```
src/api/
├── core/                 # 通用核心（与具体业务/格式无关）
│   ├── types.ts          # ResponseAdapter / PaginationAdapter / ClientOptions / ApiClient
│   ├── adapters.ts       # 内置格式：vantFormat、ydlFormat、ydlPagination、defaultPagination
│   └── http.ts           # createClient 工厂 + BizError
├── request.ts            # 默认客户端（vant 格式），向后兼容原 get/post/put/del/instance
├── types.ts              # 公共类型 PageParams / PageResult / ApiResponse
├── modules/
│   ├── login.ts          # 共享/演示 API（沿用默认 vant 客户端）
│   ├── permission.ts
│   ├── demo-*.ts
│   └── ydl/              # ydl 模块：自带客户端，对接 JeecgBoot 格式
│       ├── client.ts     # ydlClient / ydlGet / ydlPost / ydlPut / ydlDel / ydlPaginate ...
│       └── ydl-renewal.ts      # 车险续保保源（功能同 demo-renewal，ydl 数据格式示例 JeecgBoot 分页 records/current/size）
└── index.ts              # 统一导出
```

## 两种核心差异

| 维度 | vant（默认） | ydl（JeecgBoot） |
|---|---|---|
| 响应包络 | `{ code, data, message }` | `{ success, message, code, result, timestamp }` |
| 成功判定 | `code === 0 \| 200` | `success === true` |
| 业务数据位置 | `data` | `result` |
| 分页入参 | `page / pageSize` | `current / size` |
| 分页出参 | `list / total / page / pageSize` | `records / total / current / size / pages` |

## 通用设计：适配器 + 工厂

核心只认两个抽象：

- **ResponseAdapter**：如何判断成功、从包络里取出业务数据、取错误信息/code。
- **PaginationAdapter**：通用 `{page,pageSize}` ⇄ 后端实际分页字段。

`createClient(options)` 用这两个 adapter 构建 axios 实例与 `get/post/put/del/paginate`，
所有拦截器、异常处理、分页转换逻辑**只写一遍**。

## 新增一个模块目录（未来第三种格式）

假设 `src/views/abc` 的后端返回 `{ ok, payload }`、分页用 `idx/limit/rows`：

1. 在 `src/api/core/adapters.ts` 加适配器（或就近定义）：

   ```ts
   export const abcFormat: ResponseAdapter = {
     isSuccess: (r) => r?.ok === true,
     extractData: (r) => r?.payload,
     extractMessage: (r) => r?.msg ?? '请求失败',
     extractCode: (r) => r?.code,
   }
   export const abcPagination: PaginationAdapter = {
     toParams: (p) => ({ idx: p.page, limit: p.pageSize }),
     fromResult: (raw) => ({ list: raw?.rows ?? [], total: raw?.total ?? 0, page: raw?.idx ?? 1, pageSize: raw?.limit ?? 10 }),
   }
   ```

2. 建 `src/api/modules/abc/client.ts`：

   ```ts
   export const abcClient = createClient({ adapter: abcFormat, pagination: abcPagination, baseURL: '/abc-api' })
   export const { get: abcGet, post: abcPost, paginate: abcPaginate } = abcClient
   ```

3. 写业务 API（`src/api/modules/abc/xxx.ts`）从 `./client` 导入方法即可。

调用方始终拿到**统一**的 `PageResult<T>` 与 `Promise<T>`，与后端格式解耦。

## 调用示例

```ts
// vant（默认）—— 沿用原写法，零改动
import { get } from '@/api'
get<LoginConfig>('/login/config')

// ydl —— 分页自动转回通用 PageResult<YdlRenewal>
import { getYdlRenewalList } from '@/api'   // 或 '@/api/modules/ydl/ydl-renewal'
const { list, total } = await getYdlRenewalList({ page: 1, pageSize: 10 })

// ydl 列表接口内部：ydlGet 解包出 result（records/current/size/total），
// 再经 ydlPagination.fromResult 转回通用分页结构，调用方无感知：
//   export function getYdlRenewalList(params) {
//     return ydlGet<YdlPageResult<YdlRenewal>>('/data/renewal/list', params)
//       .then((res) => ydlPagination.fromResult(res))
//   }
```

## ydl 模块业务 API 示例（ydl-renewal.ts）

`src/api/modules/ydl/ydl-renewal.ts` 与 `src/api/modules/demo-renewal.ts` **功能完全一致**（列表 / 新增 / 编辑 / 删除 /
详情 / 承保公司联想 / 投保人核验），但全部走 `ydlClient`（baseURL 默认 `/ydl-api`），对接 JeecgBoot 风格后端。
mock 由 `src/mock/ydl-renewal.ts` 在 `/ydl-api` 前缀下拦截。

### 导出清单

| 导出 | 说明 | 后端接口（不含 /ydl-api 前缀） |
|---|---|---|
| `getYdlRenewalList(query & PageParams)` | 分页列表（多条件过滤） | `GET /data/renewal/list` |
| `getYdlRenewalDetail(id)` | 详情 | `GET /data/renewal` |
| `createYdlRenewal(form)` | 新增 | `POST /data/renewal` |
| `updateYdlRenewal(form)` | 编辑（表单带 id） | `PUT /data/renewal` |
| `deleteYdlRenewal(id)` | 删除（DELETE 带 body） | `DELETE /data/renewal` |
| `searchYdlInsurers(keyword)` | 承保公司联想 | `GET /data/renewal/insurers` |
| `verifyYdlApplicant(name)` | 投保人核验 | `GET /data/renewal/verify-applicant` |
| `YDL_INSURERS / YDL_CHANNELS / YDL_INSURANCE_TYPE_OPTIONS / YDL_STATUS_OPTIONS` | 选项常量 | — |
| `YDL_ORG_TREE / YDL_TAG_TREE / YDL_ORG_NAME` | 机构树 / 标签树 / 名称映射 | — |
| `YDL_DEFAULT_RENEWAL_QUERY / YDL_DEFAULT_RENEWAL_FORM` | 初始查询 / 表单 | — |

### 关键约定（与 vant 默认模块的差异）

1. **列表分页适配**：ydl 后端返回 `{ records, current, size, total, pages }`，
   `getYdlRenewalList` 用 `ydlPagination.fromResult` 转回通用 `PageResult<T>`，
   因此 `VantList` / `useCrudList` **无需**再配 `responseMap`。
2. **请求分页参数映射**：`useCrudList` 默认发 `page`/`pageSize`，而 ydl 后端要 `current`/`size`。
   在页面给 `VantList` 传 `:request-map="{ page: 'current', pageSize: 'size' }"` 即可，
   mock 端据此读取 `current`/`size`（并兼容 `page`/`pageSize` 兜底）。
3. **删除用 body**：`deleteYdlRenewal(id)` 以 `ydlDel('/data/renewal', { data: { id } })` 发送，
   mock 从 DELETE 请求体读取 `id`（与 `demo-renewal` 的 `del` 写法不同，后者不保证带 body）。
4. **响应包络**：所有接口成功返回 `{ success: true, code: 200, message, result, timestamp }`，
   失败返回 `{ success: false, code, message, result: null }`，由 `ydlFormat` 适配器统一解包。

### 页面接入（YdlListDemo）

`src/views/ydl/YdlListDemo.vue` 是 `VantListDemo` 的 ydl 版镜像，核心差别：

```ts
const api: CrudApi<YdlRenewal, YdlRenewalForm, YdlRenewalQuery> = {
  list: getYdlRenewalList,
  create: createYdlRenewal,
  update: updateYdlRenewal,
  remove: deleteYdlRenewal,
}
```

```html
<VantList
  :api="api"
  permission-prefix="ydl"
  :request-map="{ page: 'current', pageSize: 'size' }"
  :show-more="true"
  ...
/>
```

> 其余查询区域组件（VantSearch / VantSelectField / VantTreeSelectField …）、投保人核验门禁、
> 附件上传（复用 `uploadDemoFile`）、行级权限（`rowPermission`）、自定义扩展操作（`actions`）等
> 均与 `VantListDemo` 完全一致。
