<template>
  <div class="page-container">
    <header class="header">
      <div class="logo-section" @click="$router.push('/')" style="cursor: pointer;">
        <div class="logo-icon">📚</div>
        <span class="logo-text">企业文档系统</span>
      </div>
      
      <div class="header-actions">
        <button class="btn btn-outline" @click="$router.push('/')">返回首页</button>
        <button class="btn btn-outline" @click="handleLogout">退出</button>
      </div>
    </header>
    
    <main class="main-content">
      <div class="admin-header">
        <h1>后台管理</h1>
        <p>管理用户、文档和查看系统统计</p>
      </div>
      
      <div class="admin-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </div>
      
      <div v-if="activeTab === 'users'" class="admin-section">
        <div class="section-header">
          <h2>用户管理</h2>
          <button class="btn btn-primary" @click="showUserModal = true">添加用户</button>
        </div>
        
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
        </div>
        <div v-else class="data-table">
          <table>
            <thead>
              <tr>
                <th>用户名</th>
                <th>角色</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.username }}</td>
                <td>
                  <span class="role-badge" :class="user.role">
                    {{ getRoleName(user.role) }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="user.status">
                    {{ user.status === 'active' ? '正常' : '禁用' }}
                  </span>
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td>
                  <button class="btn-small" @click="editUser(user)">编辑</button>
                  <button class="btn-small" @click="openResetModal(user)">重置密码</button>
                  <button 
                    class="btn-small" 
                    :class="user.status === 'active' ? 'warning' : 'success'"
                    @click="toggleUserStatus(user)"
                  >
                    {{ user.status === 'active' ? '禁用' : '启用' }}
                  </button>
                  <button class="btn-small danger" @click="deleteUser(user)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div v-if="activeTab === 'documents'" class="admin-section">
        <div class="section-header">
          <h2>文档管理</h2>
        </div>
        
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
        </div>
        <div v-else-if="allDocuments.length === 0" class="empty-state">
          <div class="empty-icon">📂</div>
          <p>暂无文档</p>
        </div>
        <div v-else class="file-grid">
          <div v-for="doc in allDocuments" :key="doc.name" class="file-card">
            <div class="file-icon">📄</div>
            <h4>{{ doc.name }}</h4>
            <span>{{ doc.path }}</span>
            <div class="file-actions">
              <button class="btn-small" @click="previewDoc(doc)">预览</button>
              <button v-if="authStore.canDelete" class="btn-small danger" @click="deleteDoc(doc)">删除</button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="activeTab === 'roles'" class="admin-section">
        <div class="section-header">
          <h2>角色权限管理</h2>
          <button class="btn btn-primary" @click="openRoleModal">添加角色</button>
        </div>
        
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
        </div>
        <div v-else class="data-table">
          <table>
            <thead>
              <tr>
                <th>角色名称</th>
                <th>显示名称</th>
                <th>描述</th>
                <th>权限</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in roles" :key="role.id">
                <td>{{ role.name }}</td>
                <td>{{ role.display_name }}</td>
                <td>{{ role.description }}</td>
                <td>
                  <div class="role-perms">
                    <span 
                      v-for="perm in allPermissions" 
                      :key="perm.key"
                      v-if="role.permissions[perm.key]"
                      class="perm-tag"
                    >
                      {{ perm.label }}
                    </span>
                  </div>
                </td>
                <td>
                  <button class="btn-small" @click="editRole(role)">编辑</button>
                  <button 
                    v-if="!['admin','supervisor','employee'].includes(role.name)"
                    class="btn-small danger" 
                    @click="deleteRole(role)"
                  >删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div v-if="activeTab === 'stats'" class="admin-section">
        <h2>系统统计</h2>
        <div v-if="loading" class="loading">
          <div class="loading-spinner"></div>
        </div>
        <div v-else class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalUsers }}</span>
              <span class="stat-label">总用户数</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📄</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalDocs }}</span>
              <span class="stat-label">总文档数</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📖</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalReads }}</span>
              <span class="stat-label">总阅读次数</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🕐</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.todayReads }}</span>
              <span class="stat-label">今日阅读</span>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <div v-if="showUserModal" class="modal-overlay" @click.self="closeUserModal">
      <div class="user-modal">
        <div class="modal-header">
          <h3>{{ editingUser ? '编辑用户' : '添加用户' }}</h3>
          <button class="close-btn" @click="closeUserModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>用户名</label>
            <input 
              v-model="userForm.username" 
              type="text" 
              placeholder="请输入用户名"
              :disabled="!!editingUser"
            />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input 
              v-model="userForm.password" 
              type="password" 
              placeholder="请输入密码"
            />
          </div>
          <div class="form-group">
            <label>角色</label>
            <select v-model="userForm.role">
              <option value="employee">员工</option>
              <option value="supervisor">班组长</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div v-if="editingUser" class="form-group">
            <label>状态</label>
            <select v-model="userForm.status">
              <option value="active">正常</option>
              <option value="disabled">禁用</option>
            </select>
          </div>
          <div v-if="formError" class="error-message">{{ formError }}</div>
          <button 
            class="btn btn-primary submit-btn" 
            :disabled="submitting"
            @click="submitUser"
          >
            {{ submitting ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="showResetModal" class="modal-overlay" @click.self="closeResetModal">
      <div class="user-modal">
        <div class="modal-header">
          <h3>重置密码 - {{ resetUser?.username }}</h3>
          <button class="close-btn" @click="closeResetModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>新密码</label>
            <input 
              v-model="resetPassword" 
              type="password" 
              placeholder="请输入新密码（至少6位）"
            />
          </div>
          <div v-if="resetError" class="error-message">{{ resetError }}</div>
          <button 
            class="btn btn-primary submit-btn" 
            :disabled="resetting"
            @click="submitResetPassword"
          >
            {{ resetting ? '提交中...' : '确认重置' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRoleModal" class="modal-overlay" @click.self="closeRoleModal">
      <div class="user-modal role-modal">
        <div class="modal-header">
          <h3>{{ editingRole ? '编辑角色' : '添加角色' }}</h3>
          <button class="close-btn" @click="closeRoleModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>角色标识</label>
            <input 
              v-model="roleForm.name" 
              type="text" 
              placeholder="如：editor"
              :disabled="!!editingRole"
            />
          </div>
          <div class="form-group">
            <label>显示名称</label>
            <input 
              v-model="roleForm.display_name" 
              type="text" 
              placeholder="如：编辑员"
            />
          </div>
          <div class="form-group">
            <label>描述</label>
            <input 
              v-model="roleForm.description" 
              type="text" 
              placeholder="角色描述"
            />
          </div>
          <div class="form-group">
            <label>权限配置</label>
            <div class="permissions-grid">
              <label 
                v-for="perm in allPermissions" 
                :key="perm.key"
                class="permission-item"
              >
                <input 
                  type="checkbox" 
                  v-model="roleForm.permissions[perm.key]"
                />
                <div class="permission-info">
                  <span class="permission-label">{{ perm.label }}</span>
                  <span class="permission-desc">{{ perm.description }}</span>
                </div>
              </label>
            </div>
          </div>
          <div v-if="roleError" class="error-message">{{ roleError }}</div>
          <button 
            class="btn btn-primary submit-btn" 
            :disabled="roleSubmitting"
            @click="submitRole"
          >
            {{ roleSubmitting ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>

    <PdfPreview 
      v-if="showPreview"
      :url="previewUrl"
      :filename="previewFilename"
      :filePath="previewFilePath"
      @close="showPreview = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { userApi, statsApi, roleApi } from '../api'
import { useDocumentStore } from '../stores/document'
import PdfPreview from '../components/PdfPreview.vue'

const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const tabs = [
  { id: 'users', name: '用户管理' },
  { id: 'roles', name: '角色权限' },
  { id: 'documents', name: '文档管理' },
  { id: 'stats', name: '系统统计' }
]

const activeTab = ref('users')
const users = ref([])
const allDocuments = ref([])
const stats = ref({
  totalUsers: 0,
  totalDocs: 0,
  totalReads: 0,
  todayReads: 0
})

const loading = ref(false)
const showPreview = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')
const previewFilePath = ref('')
const showUserModal = ref(false)
const editingUser = ref(null)
const submitting = ref(false)
const formError = ref('')

const userForm = ref({
  username: '',
  password: '',
  role: 'employee',
  status: 'active'
})

const showResetModal = ref(false)
const resetUser = ref(null)
const resetPassword = ref('')
const resetting = ref(false)
const resetError = ref('')

const roles = ref([])
const showRoleModal = ref(false)
const editingRole = ref(null)
const roleSubmitting = ref(false)
const roleError = ref('')

const allPermissions = [
  { key: 'canView', label: '查看文档', description: '允许浏览和查看文档内容' },
  { key: 'canDownload', label: '下载文档', description: '允许下载文档到本地' },
  { key: 'canUpload', label: '上传文档', description: '允许上传新文档' },
  { key: 'canDelete', label: '删除文档', description: '允许删除文档' },
  { key: 'canManageUsers', label: '管理用户', description: '允许创建、编辑、删除用户' },
  { key: 'canViewStats', label: '查看统计', description: '允许查看系统统计数据' },
  { key: 'canManageRoles', label: '管理角色', description: '允许管理角色和权限' },
  { key: 'canManageFolders', label: '管理文件夹', description: '允许创建和删除文件夹' }
]

const roleForm = ref({
  name: '',
  display_name: '',
  description: '',
  permissions: {}
})

function getRoleName(role) {
  const roleMap = {
    employee: '员工',
    supervisor: '班组长',
    admin: '管理员'
  }
  return roleMap[role] || role
}

function formatDate(date) {
  if (!date) return '未知'
  return new Date(date).toLocaleDateString('zh-CN')
}

async function loadUsers() {
  loading.value = true
  try {
    const response = await userApi.getUsers()
    users.value = response.data.users
  } catch (e) {
    console.error('加载用户失败:', e)
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  loading.value = true
  try {
    const response = await statsApi.get()
    stats.value = response.data
  } catch (e) {
    console.error('加载统计失败:', e)
  } finally {
    loading.value = false
  }
}

async function loadDocuments() {
  loading.value = true
  try {
    await documentStore.fetchFiles('')
    allDocuments.value = documentStore.currentFiles
    stats.value.totalDocs = allDocuments.value.length
  } catch (e) {
    console.error('加载文档失败:', e)
  } finally {
    loading.value = false
  }
}

function editUser(user) {
  editingUser.value = user
  userForm.value = {
    username: user.username,
    password: '',
    role: user.role,
    status: user.status
  }
  showUserModal.value = true
}

async function deleteUser(user) {
  if (!confirm(`确定删除用户 ${user.username} 吗？`)) return
  
  try {
    await userApi.deleteUser(user.id)
    await loadUsers()
  } catch (e) {
    alert('删除失败')
  }
}

function closeUserModal() {
  showUserModal.value = false
  editingUser.value = null
  userForm.value = {
    username: '',
    password: '',
    role: 'employee',
    status: 'active'
  }
  formError.value = ''
}

async function submitUser() {
  formError.value = ''
  
  if (!editingUser.value && !userForm.value.password) {
    formError.value = '请输入密码'
    return
  }
  
  submitting.value = true
  try {
    if (editingUser.value) {
      const updateData = { role: userForm.value.role, status: userForm.value.status }
      if (userForm.value.password) {
        updateData.password = userForm.value.password
      }
      await userApi.updateUser(editingUser.value.id, updateData)
    } else {
      await userApi.createUser({
        username: userForm.value.username,
        password: userForm.value.password,
        role: userForm.value.role
      })
    }
    closeUserModal()
    await loadUsers()
  } catch (e) {
    formError.value = e.response?.data?.message || '操作失败'
  } finally {
    submitting.value = false
  }
}

function previewDoc(doc) {
  previewFilePath.value = doc.path || ''
  previewUrl.value = documentStore.getPreviewUrl(doc.name, doc.path || '')
  previewFilename.value = doc.name
  showPreview.value = true
}

async function deleteDoc(doc) {
  if (!confirm(`确定删除文档 ${doc.name} 吗？`)) return
  
  try {
    await documentStore.deleteFile(`${doc.path || ''}/${doc.name}`)
    await loadDocuments()
  } catch (e) {
    alert('删除失败')
  }
}

function openResetModal(user) {
  resetUser.value = user
  resetPassword.value = ''
  resetError.value = ''
  showResetModal.value = true
}

function closeResetModal() {
  showResetModal.value = false
  resetUser.value = null
  resetPassword.value = ''
  resetError.value = ''
}

async function submitResetPassword() {
  resetError.value = ''
  
  if (!resetPassword.value || resetPassword.value.length < 6) {
    resetError.value = '密码长度至少6位'
    return
  }
  
  resetting.value = true
  try {
    await userApi.resetPassword(resetUser.value.id, resetPassword.value)
    closeResetModal()
    alert('密码重置成功')
  } catch (e) {
    resetError.value = e.response?.data?.message || '重置失败'
  } finally {
    resetting.value = false
  }
}

async function toggleUserStatus(user) {
  const newStatus = user.status === 'active' ? 'disabled' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'
  
  if (!confirm(`确定要${action}用户 ${user.username} 吗？`)) return
  
  try {
    await userApi.toggleStatus(user.id, newStatus)
    await loadUsers()
    alert(`${action}成功`)
  } catch (e) {
    alert(e.response?.data?.message || '操作失败')
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

async function loadRoles() {
  try {
    const response = await roleApi.getRoles()
    roles.value = response.data.roles || []
  } catch (e) {
    console.error('加载角色列表失败:', e)
  }
}

function openRoleModal() {
  editingRole.value = null
  roleForm.value = {
    name: '',
    display_name: '',
    description: '',
    permissions: {}
  }
  roleError.value = ''
  showRoleModal.value = true
}

function closeRoleModal() {
  showRoleModal.value = false
  editingRole.value = null
  roleForm.value = {
    name: '',
    display_name: '',
    description: '',
    permissions: {}
  }
  roleError.value = ''
}

function editRole(role) {
  editingRole.value = role
  roleForm.value = {
    name: role.name,
    display_name: role.display_name,
    description: role.description || '',
    permissions: { ...role.permissions }
  }
  roleError.value = ''
  showRoleModal.value = true
}

async function submitRole() {
  roleError.value = ''
  
  if (!roleForm.value.name || !roleForm.value.display_name) {
    roleError.value = '请填写角色标识和显示名称'
    return
  }
  
  roleSubmitting.value = true
  try {
    if (editingRole.value) {
      await roleApi.updateRole(editingRole.value.id, {
        display_name: roleForm.value.display_name,
        description: roleForm.value.description,
        permissions: roleForm.value.permissions
      })
    } else {
      await roleApi.createRole({
        name: roleForm.value.name,
        display_name: roleForm.value.display_name,
        description: roleForm.value.description,
        permissions: roleForm.value.permissions
      })
    }
    closeRoleModal()
    await loadRoles()
  } catch (e) {
    roleError.value = e.response?.data?.message || '操作失败'
  } finally {
    roleSubmitting.value = false
  }
}

async function deleteRole(role) {
  if (!confirm(`确定要删除角色 "${role.display_name}" 吗？`)) return
  
  try {
    await roleApi.deleteRole(role.id)
    await loadRoles()
    alert('删除成功')
  } catch (e) {
    alert(e.response?.data?.message || '删除失败')
  }
}

watch(activeTab, (newTab) => {
    if (newTab === 'users') {
      loadUsers()
    } else if (newTab === 'roles') {
      loadRoles()
    } else if (newTab === 'documents') {
      loadDocuments()
    } else if (newTab === 'stats') {
      loadStats()
    }
  })

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-header {
  margin-bottom: 2rem;
}

.admin-header h1 {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
}

.admin-header p {
  color: var(--text-secondary);
}

.admin-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--border-color);
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--primary-color);
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.admin-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: var(--shadow-md);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.25rem;
}

.loading {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.data-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.role-badge,
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.role-badge.admin {
  background: #dbeafe;
  color: #1d4ed8;
}

.role-badge.supervisor {
  background: #fef3c7;
  color: #b45309;
}

.role-badge.employee {
  background: #e0f2fe;
  color: #0369a1;
}

.status-badge.active {
  background: #d1fae5;
  color: #047857;
}

.status-badge.disabled {
  background: #fee2e2;
  color: #dc2626;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 0.75rem;
  cursor: pointer;
  margin-right: 0.5rem;
}

.btn-small:hover {
  background: var(--border-color);
}

.btn-small.danger {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}

.btn-small.warning {
  background: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}

.btn-small.success {
  background: #d1fae5;
  color: #047857;
  border-color: #a7f3d0;
}

.role-modal {
  max-width: 600px;
}

.permissions-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.permission-item:hover {
  background: var(--bg-color);
}

.permission-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
}

.permission-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.permission-label {
  font-weight: 500;
  color: var(--text-primary);
}

.permission-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.role-perms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.perm-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-size: 0.75rem;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.file-card {
  background: var(--bg-color);
  border-radius: var(--radius);
  padding: 1.5rem;
  text-align: center;
}

.file-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.file-card h4 {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.file-card span {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 1rem;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-color);
  border-radius: var(--radius);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.user-modal {
  background: white;
  border-radius: 12px;
  width: 420px;
  max-width: 90%;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.submit-btn {
  width: 100%;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
}
</style>
