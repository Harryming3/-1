<template>
  <div class="page-container">
    <header class="header">
      <div class="logo-section" @click="$router.push('/')" style="cursor: pointer;">
        <div class="logo-icon">📚</div>
        <span class="logo-text">企业文档系统</span>
      </div>
      
      <div class="header-actions">
        <button class="btn btn-outline" @click="handleLogout">退出登录</button>
      </div>
    </header>
    
    <main class="main-content">
      <div class="profile-container">
        <div class="profile-header">
          <div class="profile-avatar">{{ userInitials }}</div>
          <div class="profile-info">
            <h1>{{ authStore.user?.username || '用户' }}</h1>
            <span class="role-badge" :class="authStore.user?.role">
              {{ getRoleName(authStore.user?.role) }}
            </span>
          </div>
        </div>
        
        <div class="profile-stats">
          <div class="stat-card">
            <div class="stat-icon">📖</div>
            <div class="stat-info">
              <span class="stat-value">{{ readStats.total }}</span>
              <span class="stat-label">阅读文档</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🕐</div>
            <div class="stat-info">
              <span class="stat-value">{{ readStats.today }}</span>
              <span class="stat-label">今日阅读</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <span class="stat-value">{{ readStats.thisWeek }}</span>
              <span class="stat-label">本周阅读</span>
            </div>
          </div>
        </div>
        
        <div class="profile-section">
          <h2>阅读历史</h2>
          <div v-if="loading" class="loading">
            <div class="loading-spinner"></div>
          </div>
          <div v-else-if="readingHistory.length === 0" class="empty-state">
            暂无阅读记录
          </div>
          <div v-else class="history-list">
            <div 
              v-for="record in readingHistory" 
              :key="record.id"
              class="history-item"
              @click="openDocument(record)"
            >
              <div class="history-icon">📄</div>
              <div class="history-info">
                <h4>{{ record.file_name }}</h4>
                <span>{{ formatTime(record.read_at) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="profile-section">
          <h2>权限说明</h2>
          <div class="permissions-list">
            <div class="permission-item">
              <span class="permission-icon">👤</span>
              <div class="permission-info">
                <h4>员工</h4>
                <p>浏览文档、阅读PDF</p>
              </div>
              <span v-if="authStore.user?.role === 'employee'" class="current-role">当前角色</span>
            </div>
            <div class="permission-item">
              <span class="permission-icon">👥</span>
              <div class="permission-info">
                <h4>班组长</h4>
                <p>员工权限 + 下载文档</p>
              </div>
              <span v-if="authStore.user?.role === 'supervisor'" class="current-role">当前角色</span>
            </div>
            <div class="permission-item">
              <span class="permission-icon">⚙️</span>
              <div class="permission-info">
                <h4>管理员</h4>
                <p>全部权限 + 后台管理</p>
              </div>
              <span v-if="authStore.user?.role === 'admin'" class="current-role">当前角色</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { readRecordApi } from '../api'
import { useDocumentStore } from '../stores/document'

const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const readStats = ref({
  total: 0,
  today: 0,
  thisWeek: 0
})

const readingHistory = ref([])
const loading = ref(false)
const showPreview = ref(false)

const userInitials = computed(() => {
  const name = authStore.user?.username || ''
  return name.slice(0, 2).toUpperCase()
})

function getRoleName(role) {
  const roleMap = {
    employee: '员工',
    supervisor: '班组长',
    admin: '管理员'
  }
  return roleMap[role] || role
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

function openDocument(record) {
  
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

async function loadReadStats() {
  try {
    const response = await readRecordApi.getStats()
    readStats.value = response.data
  } catch (e) {
    console.error('获取阅读统计失败:', e)
  }
}

async function loadReadingHistory() {
  loading.value = true
  try {
    const response = await readRecordApi.getList(1, 10)
    readingHistory.value = response.data.records
  } catch (e) {
    console.error('获取阅读历史失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReadStats()
  loadReadingHistory()
})
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  margin-bottom: 2rem;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  font-weight: 700;
}

.profile-info h1 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.role-badge.employee {
  background: #e0f2fe;
  color: #0369a1;
}

.role-badge.supervisor {
  background: #fef3c7;
  color: #b45309;
}

.role-badge.admin {
  background: #dbeafe;
  color: #1d4ed8;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
}

.stat-icon {
  font-size: 2rem;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.profile-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  margin-bottom: 2rem;
}

.profile-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
}

.loading-spinner {
  width: 32px;
  height: 32px;
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
  padding: 2rem;
  color: var(--text-secondary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-color);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--border-color);
}

.history-icon {
  font-size: 1.5rem;
}

.history-info {
  flex: 1;
}

.history-info h4 {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.history-info span {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-color);
  border-radius: var(--radius);
}

.permission-icon {
  font-size: 1.5rem;
}

.permission-info {
  flex: 1;
}

.permission-info h4 {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.permission-info p {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.current-role {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .profile-stats {
    grid-template-columns: 1fr;
  }
}
</style>
