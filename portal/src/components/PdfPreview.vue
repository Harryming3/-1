<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ filename }}</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <iframe 
          :src="previewUrl" 
          frameborder="0"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    default: '文档预览'
  }
})

const emit = defineEmits(['close'])

const previewUrl = computed(() => {
  return props.url
})
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

.modal-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-all;
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

.modal-body {
  flex: 1;
  overflow: hidden;
  background: #f0f0f0;
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}
</style>
