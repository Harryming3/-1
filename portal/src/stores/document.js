import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fileBrowserApi, readRecordApi, documentApi } from '../api'

export const useDocumentStore = defineStore('document', () => {
  const categories = ref([
    { id: '安全制度', name: '安全制度', icon: '🛡️', color: 'safety', description: '安全生产规章制度和操作规程' },
    { id: '作业指导书', name: '作业指导书', icon: '📋', color: 'instruction', description: '标准作业流程和操作指南' },
    { id: '质量规范', name: '质量规范', icon: '✅', color: 'quality', description: '质量管理体系文件' },
    { id: '其他', name: '其他', icon: '📁', color: 'other', description: '其他文档资料' }
  ])

  const currentFiles = ref([])
  const recentDocs = ref([])
  const loading = ref(false)

  async function fetchFiles(path = '') {
    loading.value = true
    try {
      const cleanPath = path.replace(/^\//, '')
      const response = await fileBrowserApi.get('/resources', {
        params: { path: cleanPath, list: true }
      })
      currentFiles.value = response.data.data || []
    } catch (error) {
      console.error('获取文件列表失败:', error)
      currentFiles.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchRecentDocs() {
    try {
      const response = await fileBrowserApi.get('/recent')
      recentDocs.value = response.data.data || []
    } catch (error) {
      console.error('获取最近文档失败:', error)
      recentDocs.value = []
    }
  }

  async function searchDocs(keyword) {
    try {
      const response = await fileBrowserApi.get('/search', {
        params: { keyword }
      })
      return response.data.data || []
    } catch (error) {
      console.error('搜索失败:', error)
      return []
    }
  }

  async function uploadFile(file, path) {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fileBrowserApi.post('/upload', formData, {
        params: { path },
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '上传失败' }
    }
  }

  async function deleteFile(path) {
    try {
      await fileBrowserApi.delete('/resources', {
        params: { path }
      })
      return { success: true }
    } catch (error) {
      return { success: false, message: '删除失败' }
    }
  }

  async function recordRead(filePath, fileName) {
    try {
      await readRecordApi.create(filePath, fileName)
    } catch (e) {
      console.error('记录阅读失败:', e)
    }
  }

  function getFileUrl(filename, path = '') {
    const cleanPath = path ? `/${path}` : ''
    const encodedFilename = encodeURIComponent(filename)
    return `/filebrowser${cleanPath}/${encodedFilename}`
  }

  function getPreviewUrl(filename, path = '') {
    const fileUrl = getFileUrl(filename, path)
    const baseUrl = window.location.origin
    const fullUrl = baseUrl + fileUrl
    const encodedUrl = encodeURIComponent(fullUrl)
    return `/kkfileview/onlinePreview?url=${encodedUrl}`
  }

  async function createFolder(parentPath, folderName) {
    try {
      const response = await documentApi.createFolder(parentPath, folderName)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '创建失败' }
    }
  }

  async function getVersions(filePath) {
    try {
      const response = await documentApi.getVersions(filePath)
      return { success: true, data: response.data.versions || [] }
    } catch (error) {
      return { success: false, data: [] }
    }
  }

  return {
    categories,
    currentFiles,
    recentDocs,
    loading,
    fetchFiles,
    fetchRecentDocs,
    searchDocs,
    uploadFile,
    deleteFile,
    recordRead,
    getFileUrl,
    getPreviewUrl,
    createFolder,
    getVersions
  }
})
