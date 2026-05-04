import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { jwtDecode } from 'jwt-decode'
import { authApi } from '../api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)
  const permissions = ref({
    canView: true,
    canDownload: false,
    canUpload: false,
    canDelete: false,
    canManageUsers: false,
    canViewStats: false
  })

  const isAuthenticated = computed(() => !!token.value)
  
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isSupervisor = computed(() => user.value?.role === 'supervisor' || user.value?.role === 'admin')
  const canDownload = computed(() => permissions.value.canDownload)
  const canUpload = computed(() => permissions.value.canUpload)
  const canDelete = computed(() => permissions.value.canDelete)
  const canManageUsers = computed(() => permissions.value.canManageUsers)

  function decodeToken() {
    if (token.value) {
      try {
        const decoded = jwtDecode(token.value)
        user.value = {
          id: decoded.sub,
          username: decoded.username || decoded.sub,
          role: decoded.role || 'employee',
          exp: decoded.exp
        }
        
        if (user.value.exp && Date.now() >= user.value.exp * 1000) {
          logout()
          return false
        }
        return true
      } catch (e) {
        console.error('Token解码失败:', e)
        logout()
        return false
      }
    }
    return false
  }

  async function fetchPermissions() {
    try {
      const response = await authApi.getPermissions()
      permissions.value = response.data.permissions
    } catch (e) {
      console.error('获取权限失败:', e)
    }
  }

  async function login(username, password) {
    try {
      const response = await authApi.login(username, password)
      
      if (response.data.token) {
        token.value = response.data.token
        localStorage.setItem('token', response.data.token)
        decodeToken()
        await fetchPermissions()
        return { success: true }
      }
      
      return { success: false, message: '登录失败，请检查凭据' }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '登录失败，请检查网络连接' 
      }
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    permissions.value = {
      canView: true,
      canDownload: false,
      canUpload: false,
      canDelete: false,
      canManageUsers: false,
      canViewStats: false
    }
    localStorage.removeItem('token')
  }

  if (token.value) {
    decodeToken()
    fetchPermissions()
  }

  return {
    token,
    user,
    permissions,
    isAuthenticated,
    isAdmin,
    isSupervisor,
    canDownload,
    canUpload,
    canDelete,
    canManageUsers,
    login,
    logout,
    decodeToken,
    fetchPermissions
  }
})
