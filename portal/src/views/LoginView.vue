<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="logo-icon">📚</div>
        <h1>企业文档查阅系统</h1>
        <p>安全、快速、便捷的制度文件浏览平台</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input 
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
            autocomplete="username"
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
            autocomplete="current-password"
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="login-footer">
        <p>默认账号: admin / admin123</p>
      </div>
    </div>
    
    <div class="login-decoration">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true
  
  try {
    const result = await authStore.login(username.value, password.value)
    
    if (result.success) {
      router.push('/')
    } else {
      error.value = result.message
    }
  } catch (e) {
    error.value = '登录失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.login-container {
  background: white;
  border-radius: 16px;
  padding: 3rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 10;
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-icon {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  margin: 0 auto 1.5rem;
}

.login-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.login-header p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.btn-login {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.login-footer p {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.login-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.shape-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
}

.shape-2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: -50px;
}

.shape-3 {
  width: 200px;
  height: 200px;
  bottom: 20%;
  right: 10%;
}

@media (max-width: 480px) {
  .login-container {
    padding: 2rem;
  }
}
</style>
