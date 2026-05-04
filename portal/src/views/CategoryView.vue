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
          @keyup.enter="handleSearch"
        />
      </div>
      
      <div class="header-actions">
        <button 
          v-if="authStore.canUpload" 
          class="btn btn-primary"
          @click="showUploadModal = true"
        >
          📤 上传文档
        </button>
        <div class="user-info" @click="$router.push('/profile')">
          <div class="user-avatar">{{ userInitials }}</div>
        </div>
      </div>
    </header>
    
    <main class="file-list-view">
      <div class="breadcrumb">
        <span @click="$router.push('/')">首页</span>
        <span>›</span>
        <span>{{ categoryName }}</span>
      </div>
      
      <div class="file-list-header">
        <h2 class="section-title">{{ categoryName }}</h2>
        <span class="file-count">{{ files.length }} 个文件</span>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      <div v-else-if="files.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <p>该分类下暂无文档</p>
        <button v-if="authStore.canUpload" class="btn btn-primary" @click="showUploadModal = true">
          上传第一个文档
        </button>
      </div>
      <div v-else class="file-grid">
        <div 
          v-for="file in files" 
          :key="file.name"
          class="file-card"
          @click="handleFileClick(file)"
        >
          <div class="file-icon">📄</div>
          <h4>{{ file.name }}</h4>
          <span>{{ formatSize(file.size) }}</span>
        </div>
      </div>
    </main>
    
    <PdfPreview 
      v-if="showPreview"
      :url="previewUrl"
      :filename="previewFilename"
      :filePath="currentCategory"
      @close="showPreview = false"
    />
    
    <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
      <div class="upload-modal">
        <div class="modal-header">
          <h3>上传文档</h3>
          <button class="close-btn" @click="showUploadModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div 
            class="upload-area"
            :class="{ 'drag-over': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <input 
              type="file" 
              ref="fileInput" 
              @change="handleFileSelect" 
              accept=".pdf,.doc,.docx"
              style="display: none;"
            />
            <div class="upload-icon">📤</div>
            <p>点击或拖拽文件到此处上传</p>
            <span>支持 PDF、Word 文档</span>
          </div>
          
          <div v-if="selectedFile" class="selected-file">
            <span>📄 {{ selectedFile.name }}</span>
            <button @click="selectedFile = null">✕</button>
          </div>
          
          <div v-if="uploadError" class="error-message">{{ uploadError }}</div>
          
          <button 
            class="btn btn-primary upload-btn" 
            :disabled="!selectedFile || uploading"
            @click="handleUpload"
          >
            {{ uploading ? '上传中...' : '开始上传' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDocumentStore } from '../stores/document'
import { readRecordApi } from '../api'
import PdfPreview from '../components/PdfPreview.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const files = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const showPreview = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')
const showUploadModal = ref(false)
const selectedFile = ref(null)
const uploading = ref(false)
const isDragOver = ref(false)
const fileInput = ref(null)
const uploadError = ref('')

const categoryId = computed(() => route.params.category)
const currentCategory = computed(() => categoryId.value)
const categoryName = computed(() => {
  const category = documentStore.categories.find(c => c.id === categoryId.value)
  return category ? category.name : categoryId.value
})

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

async function loadFiles() {
  loading.value = true
  try {
    await documentStore.fetchFiles(categoryId.value)
    files.value = documentStore.currentFiles
  } catch (e) {
    console.error('加载文件失败:', e)
  } finally {
    loading.value = false
  }
}

async function handleFileClick(file) {
  if (file.type === 'directory') {
    return
  }
  previewUrl.value = documentStore.getPreviewUrl(file.name, categoryId.value)
  previewFilename.value = file.name
  showPreview.value = true
  
  try {
    await readRecordApi.create(categoryId.value, file.name)
  } catch (e) {
    console.error('记录阅读失败:', e)
  }
}

function handleSearch() {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/search', query: { q: searchKeyword.value } })
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    uploadError.value = ''
  }
}

function handleDrop(event) {
  isDragOver.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    selectedFile.value = file
    uploadError.value = ''
  }
}

async function handleUpload() {
  if (!selectedFile.value) return
  
  uploading.value = true
  uploadError.value = ''
  try {
    const result = await documentStore.uploadFile(selectedFile.value, categoryId.value)
    if (result.success) {
      showUploadModal.value = false
      selectedFile.value = null
      await loadFiles()
    } else {
      uploadError.value = result.message || '上传失败'
    }
  } catch (e) {
    uploadError.value = '上传失败，请重试'
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  loadFiles()
})
</script>

<style scoped>
.file-count {
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

.upload-modal {
  background: white;
  border-radius: 12px;
  width: 480px;
  max-width: 90%;
}

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius);
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: var(--primary-color);
  background: #f0f9ff;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-area p {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.upload-area span {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.selected-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-color);
  border-radius: var(--radius);
  margin-bottom: 1rem;
}

.selected-file button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.25rem;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.upload-btn {
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
