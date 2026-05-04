<template>
  <div class="page-container">
    <header class="header">
      <div class="logo-section" @click="$router.push('/')" style="cursor: pointer;">
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
        <button 
          v-if="authStore.canUpload" 
          class="btn btn-primary btn-sm"
          @click="showUploadModal = true"
        >
          📤 上传
        </button>
        <div class="user-info" @click="$router.push('/profile')">
          <div class="user-avatar">{{ userInitials }}</div>
        </div>
      </div>
    </header>
    
    <main class="file-list-view">
      <div class="breadcrumb">
        <span @click="navigateToRoot">首页</span>
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
          <span class="separator">›</span>
          <span 
            @click="navigateToBreadcrumb(index)"
            :class="{ 'current': index === breadcrumbs.length - 1 }"
          >
            {{ crumb.name }}
          </span>
        </template>
      </div>
      
      <div class="file-list-header">
        <h2 class="section-title">{{ currentFolderName }}</h2>
        <div class="file-list-actions">
          <span class="file-count">{{ totalCount }} 个项目</span>
          <button 
            v-if="authStore.canUpload" 
            class="btn btn-outline btn-sm"
            @click="showNewFolderModal = true"
          >
            📁 新建文件夹
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      
      <div v-else-if="files.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">📂</div>
        <p>该文件夹下暂无内容</p>
        <button v-if="authStore.canUpload" class="btn btn-primary" @click="showUploadModal = true">
          上传第一个文档
        </button>
      </div>
      
      <div v-else class="file-grid">
        <div 
          v-for="folder in folders" 
          :key="folder.name"
          class="file-card folder-card"
          @click="navigateToFolder(folder)"
        >
          <div class="file-icon folder-icon">📁</div>
          <h4>{{ folder.name }}</h4>
          <span>{{ folder.itemCount || 0 }} 个项目</span>
        </div>
        
        <div 
          v-for="file in documents" 
          :key="file.name"
          class="file-card"
          @click="handleFileClick(file)"
        >
          <div class="file-icon">📄</div>
          <h4>{{ file.name }}</h4>
          <span>{{ formatSize(file.size) }}</span>
          <div v-if="file.versions && file.versions.length > 1" class="version-indicator">
            v{{ file.versions.length }}
          </div>
        </div>
      </div>
    </main>
    
    <PdfPreview 
      v-if="showPreview"
      :url="previewUrl"
      :filename="previewFilename"
      :filePath="currentPath"
      @close="showPreview = false"
    />
    
    <div v-if="showVersionModal" class="modal-overlay" @click.self="showVersionModal = false">
      <div class="version-modal">
        <div class="modal-header">
          <h3>版本历史</h3>
          <button class="close-btn" @click="showVersionModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="fileVersions.length === 0" class="empty-state">
            <p>暂无版本记录</p>
          </div>
          <div v-else class="version-list">
            <div 
              v-for="(version, index) in fileVersions" 
              :key="version.id || index"
              class="version-item"
              :class="{ 'current': index === 0 }"
            >
              <div class="version-info">
                <span class="version-number">v{{ version.version || (fileVersions.length - index) }}</span>
                <span class="version-date">{{ formatDate(version.created_at || version.uploadedAt) }}</span>
              </div>
              <div class="version-actions">
                <button class="btn btn-outline btn-sm" @click="previewVersion(version)">预览</button>
                <button v-if="authStore.canDownload" class="btn btn-outline btn-sm" @click="downloadVersion(version)">下载</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showUploadModal" class="modal-overlay" @click.self="closeUploadModal">
      <div class="upload-modal">
        <div class="modal-header">
          <h3>上传文档</h3>
          <button class="close-btn" @click="closeUploadModal">✕</button>
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
    
    <div v-if="showNewFolderModal" class="modal-overlay" @click.self="showNewFolderModal = false">
      <div class="new-folder-modal">
        <div class="modal-header">
          <h3>新建文件夹</h3>
          <button class="close-btn" @click="showNewFolderModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>文件夹名称</label>
            <input 
              v-model="newFolderName" 
              type="text" 
              placeholder="请输入文件夹名称"
              @keyup.enter="createNewFolder"
            />
          </div>
          <button 
            class="btn btn-primary submit-btn" 
            :disabled="!newFolderName.trim() || creatingFolder"
            @click="createNewFolder"
          >
            {{ creatingFolder ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDocumentStore } from '../stores/document'
import { readRecordApi, documentApi } from '../api'
import PdfPreview from '../components/PdfPreview.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const documentStore = useDocumentStore()

const files = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const isMobile = ref(false)
const showPreview = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')
const showUploadModal = ref(false)
const showNewFolderModal = ref(false)
const showVersionModal = ref(false)
const selectedFile = ref(null)
const selectedFileForVersion = ref(null)
const uploading = ref(false)
const isDragOver = ref(false)
const fileInput = ref(null)
const uploadError = ref('')
const newFolderName = ref('')
const creatingFolder = ref(false)
const fileVersions = ref([])

const currentPath = computed(() => {
  const pathParam = route.params.path
  return pathParam ? decodeURIComponent(pathParam) : ''
})

const currentFolderName = computed(() => {
  if (!currentPath.value) return '全部文件'
  const parts = currentPath.value.split('/')
  return parts[parts.length - 1]
})

const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  
  const parts = currentPath.value.split('/')
  const crumbs = []
  let path = ''
  
  for (const part of parts) {
    path += (path ? '/' : '') + part
    crumbs.push({ name: part, path })
  }
  
  return crumbs
})

const folders = computed(() => {
  return files.value.filter(f => f.type === 'directory' || f.isDir)
})

const documents = computed(() => {
  return files.value.filter(f => f.type !== 'directory' && !f.isDir)
})

const totalCount = computed(() => files.value.length)

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

function formatDate(date) {
  if (!date) return '未知'
  return new Date(date).toLocaleString('zh-CN')
}

async function loadFiles() {
  loading.value = true
  try {
    await documentStore.fetchFiles(currentPath.value)
    files.value = documentStore.currentFiles
  } catch (e) {
    console.error('加载文件失败:', e)
    files.value = []
  } finally {
    loading.value = false
  }
}

function navigateToRoot() {
  router.push('/')
}

function navigateToBreadcrumb(index) {
  const crumb = breadcrumbs.value[index]
  if (index < breadcrumbs.value.length - 1) {
    router.push(`/folder/${encodeURIComponent(crumb.path)}`)
  }
}

function navigateToFolder(folder) {
  const folderPath = currentPath.value 
    ? `${currentPath.value}/${folder.name}`
    : folder.name
  router.push(`/folder/${encodeURIComponent(folderPath)}`)
}

async function handleFileClick(file) {
  if (file.type === 'directory' || file.isDir) {
    navigateToFolder(file)
    return
  }
  
  if (file.versions && file.versions.length > 1) {
    await loadVersions(file)
    return
  }
  
  previewUrl.value = documentStore.getPreviewUrl(file.name, currentPath.value)
  previewFilename.value = file.name
  showPreview.value = true
  
  try {
    await readRecordApi.create(currentPath.value, file.name)
  } catch (e) {
    console.error('记录阅读失败:', e)
  }
}

async function loadVersions(file) {
  selectedFileForVersion.value = file
  try {
    const response = await documentApi.getVersions(`${currentPath.value}/${file.name}`)
    fileVersions.value = response.data.versions || []
    showVersionModal.value = true
  } catch (e) {
    console.error('加载版本失败:', e)
    fileVersions.value = []
  }
}

function previewVersion(version) {
  previewUrl.value = documentStore.getPreviewUrl(selectedFileForVersion.value.name, currentPath.value) + `&v=${version.version || 1}`
  previewFilename.value = selectedFileForVersion.value.name
  showVersionModal.value = false
  showPreview.value = true
}

function downloadVersion(version) {
  const url = documentStore.getFileUrl(selectedFileForVersion.value.name, currentPath.value) + `?v=${version.version || 1}`
  window.open(url, '_blank')
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

function closeUploadModal() {
  showUploadModal.value = false
  selectedFile.value = null
  uploadError.value = ''
}

async function handleUpload() {
  if (!selectedFile.value) return
  
  uploading.value = true
  uploadError.value = ''
  try {
    const result = await documentStore.uploadFile(selectedFile.value, currentPath.value)
    if (result.success) {
      closeUploadModal()
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

async function createNewFolder() {
  if (!newFolderName.value.trim()) return
  
  creatingFolder.value = true
  try {
    await documentApi.createFolder(currentPath.value, newFolderName.value.trim())
    showNewFolderModal.value = false
    newFolderName.value = ''
    await loadFiles()
  } catch (e) {
    alert('创建文件夹失败')
  } finally {
    creatingFolder.value = false
  }
}

function handleResize() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  loadFiles()
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.hidden-mobile {
  display: none;
}

.file-list-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.file-count {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.separator {
  color: var(--text-secondary);
  margin: 0 0.25rem;
}

.current {
  font-weight: 500;
  color: var(--text-primary);
}

.folder-icon {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
}

.version-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--primary-color);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
}

.file-card {
  position: relative;
}

.version-modal,
.upload-modal,
.new-folder-modal {
  background: white;
  border-radius: 12px;
  width: 480px;
  max-width: 90%;
}

.modal-body {
  padding: 1.5rem;
}

.version-list {
  max-height: 400px;
  overflow-y: auto;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.version-item:last-child {
  border-bottom: none;
}

.version-item.current {
  background: #f0f9ff;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.version-number {
  font-weight: 600;
  color: var(--primary-color);
}

.version-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.version-actions {
  display: flex;
  gap: 0.5rem;
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

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 0.875rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.submit-btn,
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
  
  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }
  
  .file-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
  
  .file-list-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .version-modal,
  .upload-modal,
  .new-folder-modal {
    width: 95%;
  }
}
</style>
