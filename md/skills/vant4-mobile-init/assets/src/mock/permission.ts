import type { MockRoute } from './types'

// 模拟用户权限数据
const userPermissions: Record<string, string[]> = {
  admin: [
    'admin:full',
    'car:create',
    'car:edit',
    'car:view',
    'car:delete',
    'menu:user-manage',
    'menu:report',
    'menu:settings',
    'menu:admin',
    'btn:user-create',
    'btn:user-edit',
    'btn:user-delete',
    'btn:user-export',
    'btn:report-export',
    'btn:settings-save',
    'data:user-view-sensitive',
    'data:user-view-salary',
    'data:report-view-all',
    'demo:vue-basics',
    'demo:deep-components',
    'demo:logic-reuse',
    'demo:builtin-components',
    'demo:app-scale',
    'demo:vite',
    'demo:eslint',
    'demo:prettier',
    'demo:permission',
    'demo:typescript',
    'demo:user-crud',
    'demo:api-demo',
    'demo:antd',
    'demo:vue-request',
    'demo:vue-router',
    'demo:pinia',
    'demo:crypto',
    'demo:axios',
    'demo:reactivity-deep',
    'demo:vueuse',
    'demo:pinia-persist',
    'demo:dayjs',
    'demo:i18n',
    'demo:element',
    'demo:vant',
    'demo:nuxt',
    'demo:echarts',
    'demo:vue3-features',
    'demo:unit-test',
    'demo:vue-perf',
  ],
  manager: [
    'menu:user-manage',
    'car:create',
    'car:edit',
    'car:view',
    'car:delete',
    'menu:report',
    'btn:user-create',
    'btn:user-edit',
    'btn:user-export',
    'data:user-view-sensitive',
    'data:report-view-all',
    'demo:vue-basics',
    'demo:deep-components',
    'demo:logic-reuse',
    'demo:builtin-components',
    'demo:app-scale',
    'demo:vite',
    'demo:eslint',
    'demo:prettier',
    'demo:permission',
    'demo:typescript',
    'demo:user-crud',
    'demo:api-demo',
    'demo:antd',
    'demo:vue-request',
    'demo:vue-router',
    'demo:pinia',
    'demo:crypto',
    'demo:axios',
    'demo:reactivity-deep',
    'demo:vueuse',
    'demo:pinia-persist',
    'demo:dayjs',
    'demo:i18n',
    'demo:element',
    'demo:vant',
    'demo:nuxt',
    'demo:echarts',
    'demo:vue3-features',
    'demo:unit-test',
    'demo:vue-perf',
  ],
  editor: [
    'menu:user-manage',
    'car:create',
    'car:edit',
    'car:view',
    'menu:report',
    'btn:user-edit',
    'btn:report-export',
    'data:user-view-sensitive',
    'data:report-view-own',
    'demo:vue-basics',
    'demo:deep-components',
    'demo:logic-reuse',
    'demo:builtin-components',
    'demo:app-scale',
    'demo:vite',
    'demo:eslint',
    'demo:prettier',
    'demo:permission',
    'demo:typescript',
    'demo:api-demo',
    'demo:antd',
    'demo:vue-request',
    'demo:vue-router',
    'demo:pinia',
    'demo:crypto',
    'demo:axios',
    'demo:reactivity-deep',
    'demo:vueuse',
    'demo:pinia-persist',
    'demo:dayjs',
    'demo:i18n',
    'demo:element',
    'demo:vant',
    'demo:nuxt',
    'demo:echarts',
    'demo:vue3-features',
    'demo:unit-test',
    'demo:vue-perf',
  ],
  viewer: [
    'menu:report',
    'car:view',
    'data:report-view-own',
    'demo:vue-basics',
    'demo:permission',
    'demo:typescript',
    'demo:crypto',
    'demo:axios',
    'demo:reactivity-deep',
    'demo:element',
    'demo:echarts',
    'demo:nuxt',
  ],
}

// 所有可用的权限定义（供前端展示）
const allPermissionsDefine = [
  { group: '菜单权限', items: ['menu:user-manage', 'menu:report', 'menu:settings', 'menu:admin'] },
  {
    group: '按钮权限',
    items: [
      'btn:user-create',
      'btn:user-edit',
      'btn:user-delete',
      'btn:user-export',
      'btn:report-export',
      'btn:settings-save',
    ],
  },
  { group: '车险模块权限（Stage4）', items: ['car:create', 'car:edit', 'car:view', 'car:delete'] },
  {
    group: '数据权限',
    items: [
      'data:user-view-sensitive',
      'data:user-view-salary',
      'data:report-view-all',
      'data:report-view-own',
    ],
  },
  { group: '超级权限', items: ['admin:full'] },
  {
    group: '站点模块权限（首页示例卡片）',
    items: [
      'demo:vue-basics',
      'demo:deep-components',
      'demo:logic-reuse',
      'demo:builtin-components',
      'demo:app-scale',
      'demo:vite',
      'demo:eslint',
      'demo:prettier',
      'demo:permission',
      'demo:typescript',
      'demo:user-crud',
      'demo:api-demo',
      'demo:antd',
      'demo:vue-request',
      'demo:vue-router',
      'demo:pinia',
      'demo:crypto',
      'demo:vueuse',
      'demo:pinia-persist',
      'demo:dayjs',
      'demo:i18n',
      'demo:element',
      'demo:vant',
      'demo:nuxt',
      'demo:echarts',
      'demo:vue3-features',
      'demo:unit-test',
      'demo:vue-perf',
    ],
  },
]

// 模拟菜单列表
const allMenus = [
  {
    key: 'user-manage',
    label: '用户管理',
    icon: 'TeamOutlined',
    requiredPermissions: ['menu:user-manage'],
  },
  {
    key: 'report',
    label: '数据报表',
    icon: 'BarChartOutlined',
    requiredPermissions: ['menu:report'],
  },
  {
    key: 'settings',
    label: '系统设置',
    icon: 'SettingOutlined',
    requiredPermissions: ['menu:settings'],
  },
  {
    key: 'admin',
    label: '管理员面板',
    icon: 'SafetyOutlined',
    requiredPermissions: ['menu:admin', 'admin:full'],
  },
]

// 模拟用户数据（含敏感和薪资字段）
const mockUsers = [
  {
    id: 1,
    name: '张三',
    dept: '技术部',
    phone: '13800001001',
    idCard: '110101199001011234',
    salary: 15000,
    email: 'zhangsan@example.com',
  },
  {
    id: 2,
    name: '李四',
    dept: '产品部',
    phone: '13800001002',
    idCard: '110101199102022345',
    salary: 18000,
    email: 'lisi@example.com',
  },
  {
    id: 3,
    name: '王五',
    dept: '市场部',
    phone: '13800001003',
    idCard: '110101199203033456',
    salary: 12000,
    email: 'wangwu@example.com',
  },
  {
    id: 4,
    name: '赵六',
    dept: '技术部',
    phone: '13800001004',
    idCard: '110101199304044567',
    salary: 22000,
    email: 'zhaoliu@example.com',
  },
  {
    id: 5,
    name: '钱七',
    dept: '产品部',
    phone: '13800001005',
    idCard: '110101199405055678',
    salary: 20000,
    email: 'qianqi@example.com',
  },
]

const routes: MockRoute[] = [
  {
    url: '/permission/user-permissions',
    method: 'GET',
    response: (req) => {
      // 从 query 参数获取模拟角色
      const url = new URL(req.url!, 'http://localhost')
      const role = url.searchParams.get('role') || 'viewer'
      const permissions = userPermissions[role] || userPermissions.viewer
      return {
        code: 200,
        data: {
          role,
          permissions,
          username: `${role}-user`,
        },
        message: 'ok',
      }
    },
  },
  {
    url: '/permission/all-permissions',
    method: 'GET',
    response: {
      code: 200,
      data: allPermissionsDefine,
      message: 'ok',
    },
  },
  {
    url: '/permission/menus',
    method: 'GET',
    response: (req) => {
      const url = new URL(req.url!, 'http://localhost')
      const role = url.searchParams.get('role') || 'viewer'
      const permissions = (userPermissions[role] || userPermissions.viewer)!
      // 根据权限过滤菜单
      const filteredMenus = allMenus.filter((menu) =>
        menu.requiredPermissions.some((p) => permissions.includes(p)),
      )
      return {
        code: 200,
        data: { menus: filteredMenus, allMenus },
        message: 'ok',
      }
    },
  },
  {
    url: '/permission/users',
    method: 'GET',
    response: (req) => {
      const url = new URL(req.url!, 'http://localhost')
      const role = url.searchParams.get('role') || 'viewer'
      const permissions = (userPermissions[role] || userPermissions.viewer)!
      const canViewAll = permissions.includes('data:report-view-all')
      const canViewOwn = permissions.includes('data:report-view-own')
      const canViewSensitive = permissions.includes('data:user-view-sensitive')
      const canViewSalary = permissions.includes('data:user-view-salary')

      // 数据级权限过滤
      let filteredUsers = [...mockUsers]
      if (!canViewAll && canViewOwn) {
        // 只能查看本部门（模拟当前用户部门是技术部）
        filteredUsers = mockUsers.filter((u) => u.dept === '技术部')
      } else if (!canViewAll && !canViewOwn) {
        filteredUsers = []
      }

      // 字段级权限脱敏
      const result = filteredUsers.map((u) => ({
        id: u.id,
        name: u.name,
        dept: u.dept,
        phone: canViewSensitive ? u.phone : '****',
        idCard: canViewSensitive ? u.idCard : '****',
        salary: canViewSalary ? `¥${u.salary.toLocaleString()}` : '***',
        email: u.email,
      }))

      return {
        code: 200,
        data: {
          list: result,
          total: result.length,
          permissions: { canViewAll, canViewOwn, canViewSensitive, canViewSalary },
        },
        message: 'ok',
      }
    },
  },
]

export default routes
