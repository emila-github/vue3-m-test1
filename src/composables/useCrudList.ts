import { ref, reactive, computed, onMounted } from 'vue'
import { usePermission } from './usePermission'
import type { PageParams, PageResult } from '@/api/types'

/**
 * 通用 CRUD 列表 Hook（Vant4 列表页快速制作基座）
 * ------------------------------------------------------------------
 * 抽取「查询 / 列表无限加载 / 新增 / 编辑 / 详情 / 删除 / 权限控制 / 日志」
 * 等公共逻辑，任意 Vant4 列表页只需：
 *   1. 定义接口类型（T 列表项、F 表单、Q 查询条件）
 *   2. 传入 api 集合与初始 form
 *   3. 在模板里绑定返回的状态/方法即可
 *
 * 约定：
 *   - 列表项 T 必须带 `id: number`
 *   - api.update 接收「含 id 的完整表单 F」（与本项目 car-insurance 模块一致）
 *   - 权限码采用 `prefix:action`（action ∈ create|edit|view|delete），无 prefix 时直接用 action
 *
 * 配合全局 v-permission 指令与 usePermission 单例，角色切换后自动重渲染。
 */

/** CRUD 接口集合（create/update/remove 缺省则该操作不可用） */
export interface CrudApi<T, F, Q> {
  /** 列表查询。支持三种返回结构：
   *   - 分页（标准）：PageResult<T> = { list, total, page, pageSize }
   *   - 不分页：T[]（数组直接返回到 data，不带分页结构）
   *   - 自定义字段：Record<string, any>（配合 responseMap 指定 list/total 等字段名）
   */
  list: (params: Q & PageParams) => Promise<PageResult<T> | T[] | Record<string, any>>
  /** 新增 */
  create?: (data: F) => Promise<any>
  /** 编辑（表单自带 id） */
  update?: (data: F) => Promise<any>
  /** 删除 */
  remove?: (id: number) => Promise<any>
  /** 详情（可选，用于点击列表进入详情） */
  detail?: (id: number) => Promise<T>
}

export type CrudAction = 'create' | 'edit' | 'view' | 'delete'

export interface UseCrudListOptions<T, F, Q> {
  /** CRUD 接口集合 */
  api: CrudApi<T, F, Q>
  /** 新增/编辑表单初始值（必须提供，用于 resetForm 与 openCreate） */
  initialForm: F
  /** 查询初始条件（含 keyword、status 等），将自动合并分页参数 */
  initialQuery?: Q
  /** 每页条数，默认 10 */
  pageSize?: number
  /** 权限前缀，如 'car' 生成 car:create / car:edit ... */
  permissionPrefix?: string
  /** 自定义权限操作码映射（覆盖默认 create/edit/view/delete 后缀） */
  permissionActions?: Partial<Record<CrudAction, string>>
  /**
   * 免权限动作：列出的动作不受权限门禁限制，按钮始终可见（对应 v-permission 的空值恒可见规则）。
   * 例：freeActions: ['view'] → 详情按钮任何角色都能看，无需 ydl:view 权限码。
   * 适用于「只读/查看人人可进」或「后端未配置该动作权限」的场景。
   */
  freeActions?: CrudAction[]
  /** 是否启用操作日志，默认 false */
  enableLog?: boolean
  /** 列表响应字段映射（适配不同后端字段命名）。
   *  缺省 list='list' total='total' page='page' pageSize='pageSize'。
   *  例：后端返回 { records, totalCount } 时配 { list: 'records', total: 'totalCount' } */
  responseMap?: { list?: string; total?: string; page?: string; pageSize?: string }
  /** 请求分页参数名映射（适配不同后端命名）。
   *  缺省 page='page' pageSize='pageSize'。
   *  例：后端要求 current/size 时配 { page: 'current', pageSize: 'size' } */
  requestMap?: { page?: string; pageSize?: string }
}

export function useCrudList<T extends { id: number }, F, Q extends Record<string, any>>(
  options: UseCrudListOptions<T, F, Q>,
) {
  const pageSize = options.pageSize ?? 10
  const enableLog = options.enableLog ?? false

  // ==================== 列表状态 ====================
  const loading = ref(false)
  const refreshing = ref(false)
  const finished = ref(false)
  const list = ref<T[]>([])
  const page = ref(1)
  /** 请求在飞标志：防止 van-list 的 @load 与 @refresh 并发导致同一页请求发两次（新增/编辑后刷新时易触发） */
  const requesting = ref(false)

  // ==================== 查询条件 ====================
  const query = reactive({ ...(options.initialQuery ?? ({} as Q)) }) as Q & Record<string, any>

  // ==================== 权限控制（共享 usePermission 单例） ====================
  const { currentRole, hasAny, permissions, loaded, loadPermissions } = usePermission()

  onMounted(() => {
    // 首次进入页面确保按当前角色加载权限（在 Stage6 切换过角色则沿用）
    if (!loaded.value) loadPermissions()
  })

  // 权限 / 角色变化时触发根组件重渲染，使 v-permission 指令 updated 重新求值
  const permTick = computed(() => `${currentRole.value}|${permissions.value.join(',')}`)

  // 权限码：prefix + action；freeActions 中的动作解析为空串（v-permission 对空值恒可见）
  const freeSet = new Set(options.freeActions ?? [])
  const permCodes = computed<Record<CrudAction, string>>(() => {
    const prefix = options.permissionPrefix ?? ''
    const custom = options.permissionActions ?? {}
    const build = (action: CrudAction) => {
      if (freeSet.has(action)) return '' // 不需要权限：空码令 v-permission 始终放行
      const suffix = custom[action] ?? action
      return prefix ? `${prefix}:${suffix}` : suffix
    }
    return {
      create: build('create'),
      edit: build('edit'),
      view: build('view'),
      delete: build('delete'),
    }
  })

  /** 权限判断（支持单个码或码数组，OR 逻辑） */
  function hasPerm(...codes: (string | string[])[]): boolean {
    const flat = codes.flat()
    return hasAny(...flat)
  }

  // ==================== 新增 / 编辑 ====================
  const isEdit = ref(false)
  const editingId = ref(0)
  const formVisible = ref(false)
  const submitting = ref(false)
  const form = reactive({ ...options.initialForm } as Record<string, any>) as unknown as F

  function resetForm() {
    Object.assign(form as Record<string, any>, options.initialForm as Record<string, any>)
  }

  function openCreate() {
    isEdit.value = false
    editingId.value = 0
    resetForm()
    formVisible.value = true
    if (enableLog) addLog('打开新增')
  }

  function openEdit(item: T) {
    isEdit.value = true
    editingId.value = item.id
    Object.assign(form as Record<string, any>, item as unknown as Partial<F>)
    formVisible.value = true
    if (enableLog) addLog(`打开编辑 #${item.id}`)
  }

  async function submit() {
    if (!options.api.create && !options.api.update) {
      console.warn('[useCrudList] 未配置 create / update 接口')
      return
    }
    submitting.value = true
    try {
      if (isEdit.value) {
        await options.api.update?.({ ...form } as F)
      } else {
        await options.api.create?.({ ...form } as F)
      }
      formVisible.value = false
      onRefresh()
      if (enableLog) addLog(isEdit.value ? `提交编辑 #${editingId.value}` : '提交新增')
    } finally {
      submitting.value = false
    }
  }

  // ==================== 详情 ====================
  const detailVisible = ref(false)
  const detailItem = ref<T | null>(null)

  function openDetail(item: T) {
    detailItem.value = item
    detailVisible.value = true
  }

  // ==================== 删除 ====================
  const deleteId = ref(0)
  const showDeleteDialog = ref(false)

  function confirmDelete(item: T) {
    deleteId.value = item.id
    showDeleteDialog.value = true
    if (enableLog) addLog(`确认删除 #${item.id}`)
  }

  async function doDelete() {
    if (!options.api.remove) {
      console.warn('[useCrudList] 未配置 remove 接口')
      return
    }
    try {
      await options.api.remove(deleteId.value)
      showDeleteDialog.value = false
      onRefresh()
      if (enableLog) addLog(`已删除 #${deleteId.value}`)
    } catch {
      showDeleteDialog.value = false
    }
  }

  // ==================== 工具：过滤空值属性 ====================
  /** 过滤掉空值（'' / null / undefined / 空数组），保留 0 / false 等有效值；page/pageSize 恒保留 */
  function omitEmptyParams<T extends Record<string, any>>(params: T): Partial<T> {
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(params)) {
      if (v === '' || v === null || v === undefined) continue
      if (Array.isArray(v) && v.length === 0) continue
      result[k] = v
    }
    return result as Partial<T>
  }

  // ==================== 列表加载 ====================
  async function fetchList(reset = false) {
    // 防重入：同一时刻只允许一个列表请求在飞，避免 load 与 refresh 并发造成重复请求
    if (requesting.value) return
    requesting.value = true
    try {
      // 请求分页参数名映射（适配后端入参命名，如 current/size）
      const pageKey = options.requestMap?.page ?? 'page'
      const sizeKey = options.requestMap?.pageSize ?? 'pageSize'
      const params = { ...query, [pageKey]: page.value, [sizeKey]: pageSize } as Record<string, any>
      // 查询时过滤空值属性再发送后端
      const cleaned = omitEmptyParams(params) as Record<string, any>

      // 兼容三种列表返回结构：
      //   - 分页（标准）：PageResult<T> = { list, total, page, pageSize }
      //   - 不分页：T[]（数组直接返回到 data）
      //   - 自定义字段：对象（配合 responseMap 指定 list/total 等字段名）
      const raw = (await options.api.list(cleaned as Q & PageParams)) as
        | PageResult<T>
        | T[]
        | Record<string, any>

      // 解析列表数组：数组直返 或 按 responseMap.list 取字段（缺省 'list'）
      const listKey = options.responseMap?.list ?? 'list'
      const resultList: T[] = Array.isArray(raw)
        ? raw
        : ((raw as Record<string, any>)?.[listKey] ?? [])

      if (reset) {
        list.value = resultList
      } else {
        list.value = [...list.value, ...resultList]
      }

      if (Array.isArray(raw)) {
        // 不分页：返回值为数组，一次性加载完成
        finished.value = true
      } else {
        // 响应字段映射（适配后端命名，如 total→totalCount / pageSize→pageSize）
        const obj = raw as Record<string, any>
        const totalKey = options.responseMap?.total ?? 'total'
        const respSizeKey = options.responseMap?.pageSize ?? 'pageSize'
        const total = Number(obj?.[totalKey] ?? 0)
        const respPageSize = Number(obj?.[respSizeKey] ?? pageSize)
        // 已加载数量达到 total，或 本页数据不足一页（取后端 pageSize）→ 加载完成
        if (total > 0 && list.value.length >= total) {
          finished.value = true
        } else if (resultList.length < respPageSize) {
          finished.value = true
        } else {
          page.value++
        }
      }
    } catch {
      finished.value = true
    } finally {
      requesting.value = false
    }
  }

  async function onRefresh() {
    refreshing.value = true
    loading.value = true // 阻止 van-list 在刷新期间并发触发 @load，避免重复请求
    page.value = 1
    finished.value = false
    await fetchList(true)
    loading.value = false
    refreshing.value = false
  }

  async function onLoad() {
    loading.value = true
    await fetchList()
    loading.value = false
  }

  function onSearch() {
    page.value = 1
    finished.value = false
    list.value = []
    loading.value = true // 阻止 van-list 在搜索期间并发触发 @load
    fetchList(true).finally(() => {
      loading.value = false
    })
  }

  // ==================== 操作日志 ====================
  const logs = ref<string[]>([])
  function addLog(msg: string) {
    logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
  }

  return {
    // 列表
    loading,
    refreshing,
    finished,
    list,
    page,
    pageSize,
    query,
    onSearch,
    onLoad,
    onRefresh,
    fetchList,
    // 表单 / 弹层
    isEdit,
    editingId,
    form,
    formVisible,
    submitting,
    resetForm,
    openCreate,
    openEdit,
    submit,
    // 详情
    detailVisible,
    detailItem,
    openDetail,
    // 删除
    deleteId,
    showDeleteDialog,
    confirmDelete,
    doDelete,
    // 权限
    permTick,
    permCodes,
    hasPerm,
    currentRole,
    permissions,
    loaded,
    loadPermissions,
    // 日志
    logs,
    addLog,
  }
}
