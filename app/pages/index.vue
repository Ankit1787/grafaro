<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFaroLogger } from '~/composables/useFaroLogger'
import apiFetch from '~/utils/apiClient'
import { handleApiError } from '~/utils/errorHandler'
import CrashReportModal from '~/components/CrashReportModal.vue'

const {
  logs,
  logDebug,
  logInfo,
  logWarn,
  logError,
  trackEvent,
  setUser,
  addContext,
  clearLogs,
  isFaroReady,
} = useFaroLogger()

// Modal state
const isModalOpen = ref(false)
const lastErrorMessage = ref('')

// Sandbox configs
const contextKey = ref('plan')
const contextVal = ref('premium')
const eventInput = ref('purchase_checkout')
const userId = ref('usr-882')
const userName = ref('Dr. Alice Grafana')
const userEmail = ref('alice@grafana.com')

// Expandable details for logs
const selectedLogId = ref<string | null>(null)

// Actions
const pushDebug = () => logDebug('UI Debug trace initialized', { component: 'SandboxControls', latency: '4.2ms' })
const pushInfo = () => logInfo('User clicked dashboard refresh widget', { viewId: 'default_grid', reloadRate: 15 })
const pushWarn = () => logWarn('API payload quota approaching threshold limit', { limit: 10000, current: 8520 })
const pushErrorLog = () => {
  try {
    throw new Error('Handled Exception: query timeout in transaction coordinator')
  } catch (err) {
    logError(err, { severity: 'critical', component: 'postgres-pool' })
  }
}

const throwUnhandled = () => {
  // Throw error to bubble up to the window handler
  setTimeout(() => {
    throw new Error('Uncaught TypeError: Cannot read property "initialize" of undefined')
  }, 10)
}

const throwAsyncUnhandled = () => {
  setTimeout(() => {
    Promise.reject(new Error('UnhandledPromiseRejection: Connection to telemetry gateway timed out'))
  }, 10)
}

// API Fetches
const runApiSuccess = async () => {
  await apiFetch('/robots.txt')
}

const runApi404 = async () => {
  try {
    await apiFetch('/this-route-does-not-exist')
  } catch (err) {
    handleApiError(err, { action: 'sandbox-runApi404' })
  }
}

// User context
const applyUser = () => {
  if (userId.value) {
    setUser({ id: userId.value, name: userName.value, email: userEmail.value })
  }
}

// Custom Context Tag
const applyContext = () => {
  if (contextKey.value && contextVal.value) {
    addContext({ [contextKey.value]: contextVal.value })
    contextKey.value = ''
    contextVal.value = ''
  }
}

// Custom Event
const sendCustomEvent = () => {
  if (eventInput.value) {
    trackEvent(eventInput.value, { source: 'dashboard-sandbox', timestamp: Date.now() })
  }
}

// Capture client errors for feedback popups
let errorListener: any = null
let rejectionListener: any = null

onMounted(() => {
  if (process.client) {
    errorListener = (event: ErrorEvent) => {
      lastErrorMessage.value = event.message || (event.error && event.error.message) || 'Script exception'
      isModalOpen.value = true
    }
    rejectionListener = (event: PromiseRejectionEvent) => {
      lastErrorMessage.value = event.reason?.message || String(event.reason) || 'Promise rejection'
      isModalOpen.value = true
    }
    window.addEventListener('error', errorListener)
    window.addEventListener('unhandledrejection', rejectionListener)
  }
})

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('error', errorListener)
    window.removeEventListener('unhandledrejection', rejectionListener)
  }
})

function toggleDetails(id: string) {
  selectedLogId.value = selectedLogId.value === id ? null : id
}
</script>

<template>
  <div class="dashboard-container">
    <!-- Header -->
    <header class="dashboard-header glass-card">
      <div class="logo-group">
        <span class="logo-icon">⚡</span>
        <span class="logo-text">Grafaro</span>
        <span class="logo-sub">Observability Sandbox</span>
      </div>
      <div class="status-indicator">
        <span class="status-dot" :class="{ active: isFaroReady, inactive: !isFaroReady }"></span>
        <span class="status-text">{{ isFaroReady ? 'Faro & Loki Collector Active' : 'Faro Idle (Simulated)' }}</span>
      </div>
      <nav class="nav-links">
        <NuxtLink to="/" class="nav-link active">Sandbox</NuxtLink>
        <NuxtLink to="/api-error" class="nav-link">API Sandbox</NuxtLink>
        <NuxtLink to="/docs" class="nav-link">Production Setup</NuxtLink>
      </nav>
    </header>

    <!-- Main Content Area -->
    <main class="dashboard-grid">
      <!-- Left Column: Controls -->
      <section class="controls-panel">
        <h2 class="panel-title">Sentry-style Sandbox Controls</h2>
        <p class="panel-subtitle">Trigger telemetry events and trace how they flow to Grafana Cloud.</p>

        <!-- Card: Logs & Exceptions -->
        <div class="glass-card sandbox-card">
          <div class="card-header">
            <h3>Error & Logging Triggers</h3>
          </div>
          <div class="card-body btn-grid">
            <button class="btn btn-secondary" @click="pushDebug">
              <span>⚪</span> Debug Log
            </button>
            <button class="btn btn-secondary" @click="pushInfo">
              <span>🔵</span> Info Log
            </button>
            <button class="btn btn-warning" @click="pushWarn">
              <span>🟡</span> Warning Log
            </button>
            <button class="btn btn-danger" @click="pushErrorLog">
              <span>🔴</span> Handled Exception
            </button>
            <button class="btn btn-danger btn-primary-style" @click="throwUnhandled">
              💥 Uncaught Exception
            </button>
            <button class="btn btn-danger btn-primary-style" @click="throwAsyncUnhandled">
              ⏳ Async Promise Reject
            </button>
          </div>
        </div>

        <!-- Card: Network / API requests -->
        <div class="glass-card sandbox-card">
          <div class="card-header">
            <h3>HTTP Request Interceptor</h3>
          </div>
          <div class="card-body btn-grid">
            <button class="btn btn-success" @click="runApiSuccess">
              🔗 Fetch Success (200)
            </button>
            <button class="btn btn-danger" @click="runApi404">
              ❌ Fetch API Error (404)
            </button>
          </div>
        </div>

        <!-- Card: User Context & Tags -->
        <div class="glass-card sandbox-card">
          <div class="card-header">
            <h3>User & Meta Context</h3>
          </div>
          <div class="card-body form-grid">
            <!-- User input -->
            <div class="form-section">
              <h4>Identify User Context</h4>
              <div class="input-row">
                <input v-model="userId" placeholder="ID (usr-882)" />
                <input v-model="userName" placeholder="Alice Grafana" />
              </div>
              <input v-model="userEmail" placeholder="alice@grafana.com" class="input-full" />
              <button class="btn btn-outline btn-sm" @click="applyUser">Update User context</button>
            </div>

            <!-- Custom Tags -->
            <div class="form-section">
              <h4>Add Context Tags</h4>
              <div class="input-row">
                <input v-model="contextKey" placeholder="key (e.g. plan)" />
                <input v-model="contextVal" placeholder="value (e.g. enterprise)" />
              </div>
              <button class="btn btn-outline btn-sm" @click="applyContext">Append Global Tag</button>
            </div>

            <!-- Custom Event -->
            <div class="form-section">
              <h4>Track Custom Event</h4>
              <div class="input-row-btn">
                <input v-model="eventInput" placeholder="checkout_completed" />
                <button class="btn btn-primary" @click="sendCustomEvent">Track</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Observability Inspector -->
      <section class="inspector-panel">
        <div class="panel-header-action">
          <h2 class="panel-title">Real-Time Telemetry Stream</h2>
          <button class="btn btn-outline btn-xs" @click="clearLogs" :disabled="logs.length === 0">
            Clear Local Stream
          </button>
        </div>
        <p class="panel-subtitle">This represents the Faro client payload (like Sentry's live breadcrumb log).</p>

        <!-- Session Metadata Card -->
        <div class="glass-card metadata-card">
          <div class="meta-item">
            <span class="meta-label">Environment</span>
            <span class="meta-value badge badge-info">production</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">App Release</span>
            <span class="meta-value font-mono">grafaro@1.0.0</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Active Session</span>
            <span class="meta-value font-mono truncate-text">faro-sess-32c0ae981</span>
          </div>
        </div>

        <!-- Timeline Log list -->
        <div class="timeline-container">
          <div v-if="logs.length === 0" class="empty-timeline glass-card">
            <div class="pulse-icon">🔍</div>
            <p>Waiting for observability payloads...</p>
            <span class="subtext">Click any of the sandbox trigger buttons to capture actions, console warnings, network requests, or errors.</span>
          </div>

          <div v-else class="timeline-logs">
            <div 
              v-for="log in logs" 
              :key="log.id" 
              class="timeline-item glass-card interactive"
              :class="`level-${log.level}`"
              @click="toggleDetails(log.id)"
            >
              <div class="timeline-log-meta">
                <div class="log-indicator-group">
                  <span class="level-indicator" :class="log.level"></span>
                  <span class="log-category badge" :class="`badge-${log.level}`">{{ log.category }}</span>
                </div>
                <span class="log-timestamp">{{ log.timestamp }}</span>
              </div>
              <div class="log-message-row">
                <p class="log-message">{{ log.message }}</p>
                <span class="expand-arrow">{{ selectedLogId === log.id ? '▼' : '▶' }}</span>
              </div>

              <!-- Expanded JSON Metadata Details -->
              <div v-if="selectedLogId === log.id" class="log-details-block" @click.stop>
                <div class="details-header">
                  <span>Structured Context Data (Loki JSON Labels)</span>
                </div>
                <pre class="details-code"><code>{{ JSON.stringify(log.metadata || log.details || {}, null, 2) }}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Sentry-style feedback modal -->
    <CrashReportModal 
      :is-open="isModalOpen" 
      :error-text="lastErrorMessage" 
      @close="isModalOpen = false" 
    />
  </div>
</template>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 3rem;
  display: grid;
  gap: 1.5rem;
}

/* Header style override */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-radius: 14px;
  flex-wrap: wrap;
  gap: 1rem;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.logo-icon {
  font-size: 1.6rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  border-left: 1px solid var(--border-color);
  padding-left: 0.6rem;
  margin-left: 0.2rem;
  font-weight: 500;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.15);
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #a7f3d0;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.04);
}

.nav-link.active {
  color: #fff;
  background-color: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
}

/* Grid Layout */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1.1fr 1fr;
  }
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.panel-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.controls-panel, .inspector-panel {
  display: flex;
  flex-direction: column;
}

.panel-header-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.btn-xs {
  font-size: 0.75rem;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
}

.sandbox-card {
  margin-bottom: 1.25rem;
}

.card-header h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1rem;
  border-left: 3px solid var(--primary);
  padding-left: 0.5rem;
}

.btn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.btn-primary-style {
  background-color: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.05);
}

.btn-primary-style:hover {
  background-color: var(--error);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.25);
}

/* Forms Grid */
.form-grid {
  display: grid;
  gap: 1.25rem;
}

.form-section {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1.25rem;
}

.form-section:last-child {
  border: none;
  padding-bottom: 0;
}

.form-section h4 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.input-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.input-row input {
  flex: 1;
}

.input-full {
  margin-bottom: 0.5rem;
}

.btn-sm {
  font-size: 0.8rem;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
}

.input-row-btn {
  display: flex;
  gap: 0.5rem;
}

.input-row-btn input {
  flex: 1;
}

/* Metadata Card */
.metadata-card {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.truncate-text {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Timeline */
.timeline-container {
  flex: 1;
  min-height: 400px;
}

.empty-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  min-height: 450px;
}

.pulse-icon {
  font-size: 2.5rem;
  margin-bottom: 1.25rem;
  animation: radar 2s infinite ease-in-out;
}

@keyframes radar {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0.6; }
}

.empty-timeline p {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-timeline .subtext {
  font-size: 0.8125rem;
  color: var(--text-muted);
  max-width: 320px;
  line-height: 1.4;
}

.timeline-logs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.timeline-item {
  border-left: 3px solid var(--border-color);
  padding: 0.875rem 1.25rem;
  cursor: pointer;
}

.timeline-item.level-debug { border-left-color: var(--text-muted); }
.timeline-item.level-info { border-left-color: var(--info); }
.timeline-item.level-warn { border-left-color: var(--warning); }
.timeline-item.level-error { border-left-color: var(--error); }

.timeline-log-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.log-indicator-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.level-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
}

.level-indicator.info { background: var(--info); }
.level-indicator.warn { background: var(--warning); }
.level-indicator.error { background: var(--error); }

.log-timestamp {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.log-message-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.log-message {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.expand-arrow {
  color: var(--text-muted);
  font-size: 0.75rem;
  margin-top: 0.2rem;
  user-select: none;
}

.log-details-block {
  margin-top: 0.75rem;
  background-color: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  overflow: hidden;
}

.details-header {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.35rem;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.details-code {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: #a7f3d0;
  overflow-x: auto;
  white-space: pre;
  max-height: 250px;
  line-height: 1.4;
}
</style>