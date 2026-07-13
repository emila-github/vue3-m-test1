import { get } from '../request'

export interface PermissionInfo {
  role: string
  permissions: string[]
  username: string
}

export interface PermissionGroup {
  group: string
  items: string[]
}

export interface MenuItem {
  key: string
  label: string
  icon: string
  requiredPermissions: string[]
}

export interface MenuResult {
  menus: MenuItem[]
  allMenus: MenuItem[]
}

export interface UserRecord {
  id: number
  name: string
  dept: string
  phone: string
  idCard: string
  salary: string
  email: string
}

export interface UserListResult {
  list: UserRecord[]
  total: number
  permissions: {
    canViewAll: boolean
    canViewOwn: boolean
    canViewSensitive: boolean
    canViewSalary: boolean
  }
}

export function getUserPermissions(role: string) {
  return get<PermissionInfo>('/permission/user-permissions', { role })
}

export function getAllPermissions() {
  return get<PermissionGroup[]>('/permission/all-permissions')
}

export function getMenusByRole(role: string) {
  return get<MenuResult>('/permission/menus', { role })
}

export function getUsersByRole(role: string) {
  return get<UserListResult>('/permission/users', { role })
}
