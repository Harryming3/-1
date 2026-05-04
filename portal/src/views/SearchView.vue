<template>
  <div class="search-page">
    <div class="search-nav">
      <button class="nav-back-btn" @click="$router.push('/')">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        返回首页
      </button>
      <h2 class="nav-title">文档搜索</h2>
    </div>
    <div class="search-header">
      <div class="search-box">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索文档..."
          @keyup.enter="performSearch"
        />
        <button @click="performSearch">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>
      
      <div class="search-filters">
        <div class="filter-group">
          <label>文档分类：</label>
          <select v-model="selectedCategory" @change="performSearch">
            <option value="">全部分类</option>
            <option value="安全制度">安全制度</option>
            <option value="作业指导书">作业指导书</option>
            <option value="质量规范">质量规范</option>
            <option value="其他">其他</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>搜索模式：</label>
          <select v-model="searchMode" @change="performSearch">
            <option value="filename">按文件名</option>
            <option value="content">全文检索</option>
          </select>
        </div>
      </div>
    </div>

    <div class="search-results">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在搜索...</p>
      </div>
      
      <div v-else-if="searchResults.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        <p>未找到相关文档</p>
        <span>请尝试其他关键词或筛选条件</span>
      </div>
      
      <div v-else class="results-list">
        <div class="results-summary">
          找到 <strong>{{ searchResults.length }}</strong> 个相关文档
        </div>
        
        <div
          v-for="doc in searchResults"
          :key="doc.path"
          class="result-item"
          @click="previewDoc(doc)"
        >
          <div class="result-icon">
            <svg v-if="doc.name.endsWith('.pdf')" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div class="result-info">
            <h4>{{ doc.name }}</h4>
            <div class="result-meta">
              <span class="result-category">{{ doc.category }}</span>
              <span class="result-size">{{ formatFileSize(doc.size) }}</span>
              <span class="result-date">{{ formatDate(doc.modified) }}</span>
            </div>
          </div>
          <div class="result-action">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            预览
          </div>
        </div>
      </div>
    </div>

    <PdfPreview
      v-if="showPreview"
      :url="previewUrl"
      :filename="previewFilename"
      :file-path="previewFilePath"
      @close="showPreview = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '../stores/document'
import PdfPreview from '../components/PdfPreview.vue'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()

const searchKeyword = ref('')
const selectedCategory = ref('')
const searchMode = ref('filename')
const searchResults = ref([])
const loading = ref(false)

const showPreview = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')
const previewFilePath = ref('')

async function performSearch() {
  if (!searchKeyword.value && !selectedCategory.value) {
    searchResults.value = []
    return
  }

  loading.value = true
  try {
    searchResults.value = await documentStore.searchDocs(
      searchKeyword.value,
      selectedCategory.value,
      searchMode.value
    )
  } catch (e) {
    console.error('搜索失败:', e)
    searchResults.value = []
  } finally {
    loading.value = false
  }
}

function previewDoc(doc) {
  previewUrl.value = documentStore.getPreviewUrl(doc.name, doc.path.split('/')[0])
  previewFilename.value = doc.name
  previewFilePath.value = doc.path
  showPreview.value = true
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  const q = route.query.q
  const cat = route.query.category
  const mode = route.query.mode
  
  if (q) searchKeyword.value = q
  if (cat) selectedCategory.value = cat
  if (mode) searchMode.value = mode
  
  if (q || cat) {
    performSearch()
  }
})

watch(() => route.query, (newQuery) => {
  if (newQuery.q !== undefined) {
    searchKeyword.value = newQuery.q || ''
    selectedCategory.value = newQuery.category || ''
    searchMode.value = newQuery.mode || 'filename'
    performSearch()
  }
})
</script>

<style scoped>
.search-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.search-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.nav-back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-back-btn:hover {
  background: var(--bg-color);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.nav-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.search-header {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.search-box {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.search-box input {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.search-box button {
  padding: 0.875rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.search-box button:hover {
  background: var(--primary-dark);
}

.search-filters {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-group select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.search-results {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.loading-state p,
.empty-state p {
  margin-top: 1rem;
  font-size: 1rem;
}

.empty-state span {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.results-summary {
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.results-summary strong {
  color: var(--primary-color);
}

.result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border-color);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: var(--bg-color);
}

.result-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-info h4 {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.result-category {
  background: var(--primary-light);
  color: var(--primary-color);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.result-action {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.2s;
}

.result-item:hover .result-action {
  background: var(--primary-color);
  color: white;
}

@media (max-width: 768px) {
  .search-page {
    padding: 1rem;
  }

  .search-filters {
    flex-direction: column;
    gap: 0.75rem;
  }

  .filter-group {
    width: 100%;
  }

  .filter-group select {
    flex: 1;
  }

  .result-meta {
    flex-wrap: wrap;
  }

  .result-action {
    display: none;
  }
}
</style>
