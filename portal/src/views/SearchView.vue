<template>
  <div class="page-container">
    <header class="header">
      <div class="logo-section" @click="$router.push('/')" style="cursor: pointer;">
        <div class="logo-icon">📚</div>
        <span class="logo-text">企业文档系统</span>
      </div>
      
      <div class="search-box">
        <span>🔍</span>
        <input 
          type="text"
          v-model="searchKeyword"
          placeholder="搜索文档..."
          @keyup.enter="performSearch"
        />
      </div>
      
      <div class="header-actions">
        <div class="user-info" @click="$router.push('/profile')">
          <div class="user-avatar">{{ userInitials }}</div>
        </div>
      </div>
    </header>
    
    <main class="main-content">
      <div class="search-header">
        <h2 class="section-title">搜索结果: "{{ keyword }}"</h2>
        <span class="result-count">{{ results.length }} 个结果</span>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>搜索中...</p>
      </div>
      <div v-else-if="results.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>未找到相关文档</p>
        <button class="btn btn-primary" @click="$router.push('/')">返回首页</button>
      </div>
      <div v-else class="search-results">
        <div 
          v-for="result in results" 
          :key="result.name"
          class="result-item"
          @click="openPreview(result)"
        >
          <div class="result-icon">📄</div>
          <div class="result-info">
            <h4>{{ result.name }}</h4>
            <p>{{ result.path }}</p>
            <span>{{ formatSize(result.size) }}</span>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDocumentStore } from '../stores/document'
import { readRecordApi } from '../api'
import PdfPreview from '../components/PdfPreview.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const searchKeyword = ref('')
const results = ref([])
const loading = ref(false)
const showPreview = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')
const previewFilePath = ref('')

const keyword = computed(() => route.query.q || '')
const userInitials = computed(() => {
  const name = authStore.user?.username || ''
  return name.slice(0, 2).toUpperCase()
})

function formatSize(bytes) {
  if (!bytes) return '未知'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function performSearch() {
  if (!searchKeyword.value.trim()) return
  router.push({ path: '/search', query: { q: searchKeyword.value } })
}

async function search() {
  if (!keyword.value) return
  
  loading.value = true
  try {
    results.value = await documentStore.searchDocs(keyword.value)
  } catch (e) {
    console.error('搜索失败:', e)
    results.value = []
  } finally {
    loading.value = false
  }
}

async function openPreview(result) {
  previewFilePath.value = result.path || ''
  previewUrl.value = documentStore.getPreviewUrl(result.name, result.path || '')
  previewFilename.value = result.name
  showPreview.value = true
  
  try {
    await readRecordApi.create(result.path || '', result.name)
  } catch (e) {
    console.error('记录阅读失败:', e)
  }
}

watch(keyword, () => {
  search()
}, { immediate: true })
</script>

<style scoped>
.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.result-count {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
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

.empty-state button {
  margin-top: 1rem;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateX(4px);
}

.result-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.result-info {
  flex: 1;
}

.result-info h4 {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.result-info p {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.result-info span {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
</style>
