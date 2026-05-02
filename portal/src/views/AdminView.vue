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
import { userApi, statsApi } from '../api'
import { useDocumentStore } from '../stores/document'
import PdfPreview from '../components/PdfPreview.vue'

const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const tabs = [
  { id: 'users', name: '用户管理' },
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

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

watch(activeTab, (newTab) => {
  if (newTab === 'users') {
    loadUsers()
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
