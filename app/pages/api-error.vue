<script setup lang="ts">
import { ref } from 'vue'
import { useFaroLogger } from '~/composables/useFaroLogger'
import apiFetch from '~/utils/apiClient'
import { handleApiError } from '~/utils/errorHandler'

const { logs, logInfo, clearLogs, isFaroReady } = useFaroLogger()
const busy = ref(false)
const lastResponse = ref('')
const selectedLogId = ref<string | null>(null)

async function callNotFound() {
  busy.value = true
  lastResponse.value = ''
  try {
    await apiFetch('/this-route-does-not-exist')
  } catch (err) {
    handleApiError(err, { action: 'callNotFound', component: 'ApiErrorPage' })
  } finally {
    busy.value = false
  }
}

async function callNetworkFail() {
  busy.value = true
  lastResponse.value = ''
  try {
    await apiFetch('https://invalid-connection-subdomain.invalid/query')
  } catch (err) {
    handleApiError(err, { action: 'callNetworkFail', component: 'ApiErrorPage' })
  } finally {
    busy.value = false
  }
}

function simulateApiErrorObject() {
  lastResponse.value = 'Simulating an API Validation Payload Error...'
  const err: any = new Error('Unprocessable Entity: Field "email" format is invalid')
  err.status = 422
  err.statusText = 'Unprocessable Entity'
  err.body = { 
    errors: [
      { field: 'email', reason: 'must contain @', message: 'invalid' }
    ] 
  }
  err.url = '/api/users/register'
  err.method = 'POST'
  handleApiError(err, { action: 'simulateApiError', validator: 'ajv' })
}

async function callRobots() {
  busy.value = true
  lastResponse.value = ''
  try {
    const res = await apiFetch('/robots.txt')
    lastResponse.value = typeof res === 'string' ? res : JSON.stringify(res, null, 2)
    logInfo('Fetched /robots.txt context successfully', { source: 'api-error-page' })
  } catch (err) {
    handleApiError(err, { action: 'callRobots', component: 'ApiErrorPage' })
  } finally {
    busy.value = false
  }
}

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
        <NuxtLink to="/" class="nav-link">Sandbox</NuxtLink>
        <NuxtLink to="/api-error" class="nav-link active">API Sandbox</NuxtLink>
        <NuxtLink to="/docs" class="nav-link">Production Setup</NuxtLink>
      </nav>
    </header>

    <!-- Main Content Area -->
    <main class="dashboard-grid">
      <!-- Left Column: Controls -->
      <section class="controls-panel">
        <h2 class="panel-title">HTTP & API Error Sandbox</h2>
        <p class="panel-subtitle">Test how API request failures are normalized, traced, and logged with rich payload details.</p>

        <!-- Card: Explanation -->
        <div class="glass-card api-info-card">
          <h3>Distributed Tracing & Error Capture</h3>
          <p>
            When an API request fails, our custom client intercepter catches the exception.
            It wraps and maps the error status, endpoint, method, and response body before sending it to Faro.
          </p>
          <p class="subtext">
            <strong>Distributed Tracing (W3C headers):</strong> Faro automatically injects 
            <code>traceparent</code> headers in your API requests, linking client browser traces to server-side Loki logs.
          </p>
        </div>

        <!-- Card: Triggers -->
        <div class="glass-card sandbox-card">
          <div class="card-header">
            <h3>API Sandbox Actions</h3>
          </div>
          <div class="card-body btn-grid">
            <button class="btn btn-secondary" @click="callRobots" :disabled="busy">
              🔗 Fetch Success (200)
            </button>
            <button class="btn btn-danger" @click="callNotFound" :disabled="busy">
              ❌ Call 404 Endpoint
            </button>
            <button class="btn btn-danger" @click="callNetworkFail" :disabled="busy">
              🔌 Call Network Fail
            </button>
            <button class="btn btn-warning" @click="simulateApiErrorObject" :disabled="busy">
              📝 Simulate Validation Fail (422)
            </button>
          </div>
        </div>

        <!-- Card: Raw Response preview -->
        <div class="glass-card response-card">
          <div class="card-header">
            <h3>Sandbox Last API Output Preview</h3>
          </div>
          <div class="card-body">
            <pre class="raw-response-box"><code>{{ lastResponse || '// Outputs from API fetches will be displayed here...' }}</code></pre>
          </div>
        </div>
      </section>

      <!-- Right Column: Live Stream -->
      <section class="inspector-panel">
        <div class="panel-header-action">
          <h2 class="panel-title">Real-Time Telemetry Stream</h2>
          <button class="btn btn-outline btn-xs" @click="clearLogs" :disabled="logs.length === 0">
            Clear Local Stream
          </button>
        </div>
        <p class="panel-subtitle">This represents the Faro client payload (like Sentry's live breadcrumb log).</p>

        <!-- Timeline Log list -->
        <div class="timeline-container">
          <div v-if="logs.length === 0" class="empty-timeline glass-card">
            <div class="pulse-icon">🔍</div>
            <p>Waiting for API telemetry events...</p>
            <span class="subtext">Click any of the API action buttons on the left to trigger intercepted network requests and observe details.</span>
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

.api-info-card {
  margin-bottom: 1.25rem;
}

.api-info-card h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.api-info-card p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.api-info-card p:last-child {
  margin-bottom: 0;
}

.api-info-card .subtext {
  font-size: 0.8125rem;
  background: rgba(99, 102, 241, 0.08);
  border-left: 3px solid var(--secondary);
  padding: 0.5rem 0.75rem;
  border-radius: 0 6px 6px 0;
  color: #c7d2fe;
}

.sandbox-card {
  margin-bottom: 1.25rem;
}

.card-header h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1.25rem;
  border-left: 3px solid var(--primary);
  padding-left: 0.5rem;
}

.btn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.response-card {
  flex: 1;
}

.raw-response-box {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: #34d399;
  min-height: 180px;
  max-height: 280px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
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
