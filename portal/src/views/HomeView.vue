<template>
  <div class="page-container">
    <header class="header">
      <div class="logo-section">
        <div class="logo-icon">📚</div>
        <span class="logo-text">企业文档系统</span>
      </div>
      
      <div class="search-box" :class="{ 'hidden-mobile': isMobile }">
        <span>🔍</span>
        <input 
          type="text"
          v-model="searchKeyword"
          placeholder="搜索文档..."
          @keyup.enter="handleSearch"
        />
      </div>
      
      <div class="header-actions">
        <div class="user-info" @click="$router.push('/profile')">
          <div class="user-avatar">{{ userInitials }}</div>
          <span v-if="!isMobile">{{ authStore.user?.username || '用户' }}</span>
        </div>
        <button class="btn btn-outline" @click="handleLogout">退出</button>
      </div>
    </header>
    
    <main class="main-content">
      <div class="welcome-banner">
        <h1>欢迎使用企业文档查阅系统</h1>
        <p>查找安全制度、作业指导书和质量规范文档</p>
      </div>
      
      <h2 class="section-title">文档分类</h2>
      <div class="category-grid">
        <div 
          v-for="category in documentStore.categories" 
          :key="category.id"
          class="category-card"
          @click="navigateToCategory(category)"
        >
          <div class="category-icon" :class="category.color">
            {{ category.icon }}
          </div>
          <h3>{{ category.name }}</h3>
          <p>{{ category.description }}</p>
          <div class="category-meta">
            <span>📄 {{ getFileCount(category.id) }} 个文档</span>
            <span>🕐 最近更新</span>
          </div>
        </div>
      </div>
      
      <h2 class="section-title">最近更新</h2>
      <div class="recent-docs">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="recentDocs.length === 0" class="empty-state">
          <div class="empty-icon">📂</div>
          <p>暂无最近更新的文档</p>
        </div>
        <div v-else class="doc-list">
          <div 
            v-for="doc in recentDocs" 
            :key="doc.name"
            class="doc-item"
            @click="openPreview(doc)"
          >
            <div class="doc-icon">📄</div>
            <div class="doc-info">
              <h4>{{ doc.name }}</h4>
              <span>{{ formatDate(doc.modified) }} · {{ formatSize(doc.size) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
    
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDocumentStore } from '../stores/document'
import { readRecordApi } from '../api'
import PdfPreview from '../components/PdfPreview.vue'

const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const searchKeyword = ref('')
const recentDocs = ref([])
const loading = ref(false)
const showPreview = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')
const previewFilePath = ref('')
const isMobile = ref(false)

const userInitials = computed(() => {
  const name = authStore.user?.username || ''
  return name.slice(0, 2).toUpperCase()
})

function getFileCount(categoryId) {
  return Math.floor(Math.random() * 20) + 5
}

function formatDate(date) {
  if (!date) return '未知'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

function formatSize(bytes) {
  if (!bytes) return '未知'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function navigateToCategory(category) {
  router.push(`/folder/${encodeURIComponent(category.id)}`)
}

function handleSearch() {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/search', query: { q: searchKeyword.value } })
  }
}

async function openPreview(doc) {
  previewFilePath.value = doc.path || ''
  previewUrl.value = documentStore.getPreviewUrl(doc.name, doc.path || '')
  previewFilename.value = doc.name
  showPreview.value = true
  
  try {
    await readRecordApi.create(doc.path || '', doc.name)
  } catch (e) {
    console.error('记录阅读失败:', e)
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function handleResize() {
  isMobile.value = window.innerWidth < 768
}

async function loadRecentDocs() {
  loading.value = true
  try {
    const response = await readRecordApi.getList(1, 5)
    recentDocs.value = response.data.records.map(r => ({
      name: r.file_name,
      path: r.file_path,
      modified: r.read_at
    }))
  } catch (e) {
    console.error('加载最近文档失败:', e)
    recentDocs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  loadRecentDocs()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .hidden-mobile {
    display: none !important;
  }
  
  .header {
    padding: 0 1rem;
  }
  
  .header-actions {
    gap: 0.5rem;
  }
  
  .category-grid {
    grid-template-columns: 1fr;
  }
  
  .welcome-banner {
    padding: 1.5rem;
  }
  
  .welcome-banner h1 {
    font-size: 1.25rem;
  }
}
</style>
