import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  getPermissions: () => api.get('/permissions')
}

export const userApi = {
  getUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`)
}

export const readRecordApi = {
  create: (filePath, fileName) => api.post('/read-records', { filePath, fileName }),
  getList: (page, limit) => api.get('/read-records', { params: { page, limit } }),
  getStats: () => api.get('/read-records/stats')
}

export const statsApi = {
  get: () => api.get('/stats')
}

export const documentApi = {
  getVersions: (filePath) => api.get(`/documents/versions`, { params: { path: filePath } }),
  createFolder: (parentPath, folderName) => api.post('/folders', { parentPath, folderName }),
  deleteFolder: (folderPath) => api.delete('/folders', { params: { path: folderPath } })
}

export const fileBrowserApi = axios.create({
  baseURL: '/filebrowser/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

fileBrowserApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }
)

export default api
