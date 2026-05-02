<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ filename }}</h3>
        <div class="header-actions">
          <button v-if="loading" class="loading-btn">加载中...</button>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>正在加载文档...</p>
        </div>
        <iframe 
          v-show="!loading"
          :src="url" 
          frameborder="0"
          allowfullscreen
          @load="onIframeLoad"
          @error="onIframeError"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    default: '文档预览'
  },
  filePath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'load', 'error'])

const loading = ref(true)

function onIframeLoad() {
  loading.value = false
  emit('load')
}

function onIframeError() {
  loading.value = false
  emit('error')
}

watch(() => props.url, () => {
  loading.value = true
}, { immediate: true })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--card-bg);
  border-radius: 12px;
  width: 95vw;
  height: 95vh;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: white;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-all;
  flex: 1;
  margin-right: 1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--text-primary);
}

.loading-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding: 0.5rem;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  background: #f0f0f0;
  position: relative;
}

.modal-body iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  z-index: 10;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .modal-content {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
  
  .modal-header {
    padding: 0.75rem 1rem;
  }
  
  .modal-header h3 {
    font-size: 0.875rem;
  }
}
</style>
