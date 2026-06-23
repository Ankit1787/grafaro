<script setup lang="ts">
import { ref } from 'vue'
import { useFaroLogger } from '~/composables/useFaroLogger'

const { isFaroReady } = useFaroLogger()

const activeTab = ref<'source-maps' | 'loki-server' | 'alerting'>('source-maps')
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
        <NuxtLink to="/api-error" class="nav-link">API Sandbox</NuxtLink>
        <NuxtLink to="/docs" class="nav-link active">Production Setup</NuxtLink>
      </nav>
    </header>

    <!-- Page Content -->
    <main class="docs-layout">
      <!-- Sidebar / Intro -->
      <section class="docs-intro glass-card">
        <h2>Production Integration Guide</h2>
        <p>A production-ready checklist to connect Grafana Faro + Loki and achieve a complete Sentry-like observability loop.</p>
        
        <div class="toc-list">
          <button 
            class="toc-item" 
            :class="{ active: activeTab === 'source-maps' }" 
            @click="activeTab = 'source-maps'"
          >
            📂 CI/CD Source Maps
          </button>
          <button 
            class="toc-item" 
            :class="{ active: activeTab === 'loki-server' }" 
            @click="activeTab = 'loki-server'"
          >
            🗄️ Server-Side Loki Logs
          </button>
          <button 
            class="toc-item" 
            :class="{ active: activeTab === 'alerting' }" 
            @click="activeTab = 'alerting'"
          >
            🔔 Dashboards & Alerting
          </button>
        </div>

        <div class="tip-box">
          <strong>Pro-Tip:</strong> The Faro Frontend Observability plugin in this repo automatically injects OpenTelemetry traces into outgoing API calls. This enables distributed tracing across both frontend (Faro) and backend (Loki/Tempo) in Grafana.
        </div>
      </section>

      <!-- Main Docs Content -->
      <section class="docs-content glass-card">
        <!-- Tab 1: Source Maps -->
        <div v-if="activeTab === 'source-maps'" class="doc-tab-content">
          <h3>1. Uploading Source Maps to Grafana Cloud</h3>
          <p>
            In production, JavaScript is minified. Stack traces sent to Grafana Faro will show line numbers of minified files (e.g. <code>entry.js:1:34852</code>) instead of your original source files.
            To map these back to readable code (matching Sentry's stack traces), you must upload your project source maps during CI/CD.
          </p>

          <div class="step-card">
            <h4>Step A: Generate Source Maps in Nuxt</h4>
            <p>Ensure Nuxt generates source maps during build in <code>nuxt.config.ts</code>:</p>
            <pre class="code-box"><code>export default defineNuxtConfig({
  sourcemap: {
    client: true,
    server: true
  }
})</code></pre>
          </div>

          <div class="step-card">
            <h4>Step B: Upload script via cURL</h4>
            <p>Add this curl upload step to your GitHub Actions or GitLab CI/CD build pipeline:</p>
            <pre class="code-box"><code># Grafana Cloud API details
API_KEY="your-grafana-cloud-api-key"
FARO_APP_ID="your-faro-app-id"
COLLECTOR_URL="https://faro-collector.grafana.net"

# Upload generated client map files
find .output/public/_nuxt/ -name "*.js.map" -type f | while read -r file; do
  # Extract filename and relative path
  rel_path=$(basename "$file")
  minified_url="http://localhost:3000/_nuxt/${rel_path%.map}"
  
  echo "Uploading source map for $minified_url..."
  
  curl -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -F "file=@$file" \
    -F "app_id=$FARO_APP_ID" \
    -F "minified_url=$minified_url" \
    "$COLLECTOR_URL/api/v1/source-maps"
done</code></pre>
          </div>
        </div>

        <!-- Tab 2: Server Logs Loki -->
        <div v-if="activeTab === 'loki-server'" class="doc-tab-content">
          <h3>2. Capturing Server-Side SSR & API Errors</h3>
          <p>
            Nuxt runs both server-side SSR and backend API routes. The <code>server/plugins/error.ts</code> plugin in this repo captures these backend errors and logs them to stderr as structured JSON.
          </p>

          <div class="step-card">
            <h4>Step A: Server Log Output Format</h4>
            <p>The server plugin formats uncaught server exceptions into structured JSON:</p>
            <pre class="code-box"><code>{
  "timestamp": "2026-06-22T11:00:00.000Z",
  "level": "error",
  "service": "grafaro-nuxt-server",
  "origin": "nitro-server-error-hook",
  "message": "database connection pool exhausted",
  "stack": "Error: pool exhausted at ...",
  "url": "/api/v1/users",
  "method": "POST"
}</code></pre>
          </div>

          <div class="step-card">
            <h4>Step B: Scraping Logs with Promtail/Loki</h4>
            <p>Configure Promtail (or Grafana Agent) to scrape these container logs and parse the JSON format automatically:</p>
            <pre class="code-box"><code>scrape_configs:
  - job_name: kubernetes-pods-app
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      # If the log is JSON, parse and extract fields
      - json:
          expressions:
            level: level
            service: service
            message: message
            origin: origin
      # Promote extracted labels to Loki indexes
      - labels:
          level:
          service:
          origin:</code></pre>
          </div>
        </div>

        <!-- Tab 3: Alerting and Dashboards -->
        <div v-if="activeTab === 'alerting'" class="doc-tab-content">
          <h3>3. Dashboards and Sentry-like Alerting</h3>
          <p>
            Once Faro (client logs) and Loki (server logs) are flowing to Grafana Cloud, you can build dashboards and set up real-time slack/email alerts when errors spike.
          </p>

          <div class="step-card">
            <h4>Step A: Pre-built Grafana Faro Application Dashboard</h4>
            <p>
              Grafana Cloud includes a pre-built **Frontend Observability App** dashboard.
              To view it:
            </p>
            <ol class="doc-list">
              <li>Log into your Grafana Cloud Instance.</li>
              <li>Go to **Applications** -> **Frontend Observability** in the left menu.</li>
              <li>Select your App (e.g. <code>grafana</code>).</li>
              <li>You will instantly see active errors grouped by stack trace, web vitals (LCP, FID, CLS), and user sessions.</li>
            </ol>
          </div>

          <div class="step-card">
            <h4>Step B: Setting up Alerting Thresholds</h4>
            <p>
              To receive alerts when client errors spike, create a Grafana alert rule querying Faro logs.
            </p>
            <p><strong>Example Alert Query (LokiQL):</strong></p>
            <pre class="code-box"><code># Trigger alert if error count exceeds 20 in 5 minutes
sum(count_over_time({app="grafana", kind="error"}[5m])) > 20</code></pre>
            <p>Configure Grafana Contact Points (Slack webhook, Discord, PagerDuty, or Email) to route the alert instantly to your developer channels.</p>
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

/* Layout */
.docs-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (min-width: 1024px) {
  .docs-layout {
    grid-template-columns: 320px 1fr;
  }
}

.docs-intro h2 {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.docs-intro p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.toc-item {
  width: 100%;
  justify-content: flex-start;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: left;
  transition: all var(--transition-fast);
}

.toc-item:hover {
  border-color: var(--border-color-hover);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.02);
}

.toc-item.active {
  background: var(--bg-surface-elevated);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 0 10px rgba(255, 107, 74, 0.05);
}

.tip-box {
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  padding: 0.875rem;
  font-size: 0.8125rem;
  color: #c7d2fe;
  line-height: 1.5;
}

.tip-box strong {
  display: block;
  margin-bottom: 0.25rem;
}

/* Docs content */
.docs-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.docs-content p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.25rem;
}

.step-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.step-card h4 {
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.step-card p {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.code-box {
  background: var(--bg-main) !important;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: #34d399;
  overflow-x: auto;
  line-height: 1.5;
  margin: 0;
}

.doc-list {
  margin-left: 1.5rem;
  margin-bottom: 1.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.doc-list li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}
</style>
