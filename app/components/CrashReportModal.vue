<script setup lang="ts">
import { ref, watch } from 'vue'
import { logger } from '~/utils/logger'

const props = defineProps<{
  isOpen: boolean
  errorText?: string
}>()

const emit = defineEmits(['close'])

const name = ref('')
const email = ref('')
const comment = ref('')
const isSubmitting = ref(false)
const isSubmitted = ref(false)

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    isSubmitted.value = false
  }
})

async function submitFeedback() {
  if (!comment.value.trim()) return
  isSubmitting.value = true

  // Send the feedback as a custom event to Grafana Faro
  logger.pushEvent('user_feedback', {
    user_name: name.value || 'Anonymous',
    user_email: email.value || 'no-email@example.com',
    comment: comment.value,
    associated_error: props.errorText || 'Manually reported',
  })

  // Log a structured warning with the feedback to Loki
  logger.warn(`User feedback submitted: "${comment.value.slice(0, 60)}..."`, {
    origin: 'user-feedback-modal',
    user_email: email.value || 'anonymous',
    user_name: name.value || 'anonymous',
  })

  // Simulate network response
  await new Promise((resolve) => setTimeout(resolve, 1000))
  isSubmitting.value = false
  isSubmitted.value = true

  setTimeout(() => {
    close()
  }, 1200)
}

function close() {
  name.value = ''
  email.value = ''
  comment.value = ''
  isSubmitted.value = false
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content glass-card animate-fade-in">
      <div class="modal-header">
        <div class="modal-title-area">
          <span class="sentry-logo">⚠️</span>
          <h2>It looks like something went wrong!</h2>
        </div>
        <button class="close-btn" @click="close">&times;</button>
      </div>

      <div v-if="!isSubmitted" class="modal-body">
        <p class="modal-desc">
          Our team has been notified. You can help us resolve the issue by providing additional context below.
        </p>

        <div v-if="errorText" class="error-preview">
          <strong>Error Details:</strong>
          <code>{{ errorText }}</code>
        </div>

        <form @submit.prevent="submitFeedback" class="feedback-form">
          <div class="form-group">
            <label for="feedback-name">Your Name</label>
            <input 
              id="feedback-name"
              v-model="name"
              type="text" 
              placeholder="John Doe" 
            />
          </div>

          <div class="form-group">
            <label for="feedback-email">Email Address</label>
            <input 
              id="feedback-email"
              v-model="email"
              type="email" 
              placeholder="john@example.com" 
            />
          </div>

          <div class="form-group">
            <label for="feedback-comment">What happened? *</label>
            <textarea 
              id="feedback-comment"
              v-model="comment"
              rows="3" 
              placeholder="I clicked on 'Submit' after filling out the form and it crashed..."
              required
            ></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="close" :disabled="isSubmitting">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting || !comment.trim()">
              <span v-if="isSubmitting" class="spinner"></span>
              {{ isSubmitting ? 'Sending...' : 'Send Feedback' }}
            </button>
          </div>
        </form>
      </div>

      <div v-else class="modal-success animate-fade-in">
        <div class="success-icon">✓</div>
        <h3>Thank you!</h3>
        <p>Your crash report has been linked to session logs and sent to Grafana Faro.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(3, 7, 18, 0.75);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
  padding: 2rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.modal-title-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sentry-logo {
  font-size: 1.5rem;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.75rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  transition: color var(--transition-fast);
  margin-top: -0.25rem;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.error-preview {
  background-color: rgba(239, 68, 68, 0.08);
  border: 1px dashed rgba(239, 68, 68, 0.3);
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1.25rem;
  font-size: 0.8125rem;
  color: #fca5a5;
  overflow-x: auto;
}

.error-preview strong {
  display: block;
  margin-bottom: 0.25rem;
}

.error-preview code {
  font-family: var(--font-mono);
  word-break: break-all;
}

.feedback-form {
  display: grid;
  gap: 1rem;
}

.form-group {
  display: grid;
  gap: 0.375rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.modal-success {
  text-align: center;
  padding: 2.5rem 1rem;
}

.success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(16, 185, 129, 0.15);
  color: var(--success);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0 auto 1.25rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.modal-success h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.modal-success p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Spinner animation for button */
.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
