<script setup lang="ts">
import { ref } from 'vue'
import { useFaroLogger } from '~/composables/useFaroLogger'

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

const contextInput = ref('userId:123, plan:premium')
const eventInput = ref('user_signup')
const userId = ref('u-001')
const userName = ref('Grafana Test User')

const pushDebug = () => logDebug('Debug event from UI', { component: 'home', demo: true })
const pushInfo = () => logInfo('Info event from UI', { component: 'home', section: 'buttons' })
const pushWarn = () => logWarn('Warning event from UI', { component: 'home', severity: 'low' })
const pushErrorLog = () => logError(new Error('Captured error via logger'), { component: 'home', flow: 'pushError' })
const throwUnhandled = () => {
  throw new Error('Unhandled exception from button click')
}
const pushEvent = () => trackEvent(eventInput.value, { source: 'faro-demo', type: 'custom' })
const applyUser = () => setUser({ id: userId.value, name: userName.value, email: `${userId.value}@example.com` })
const applyContext = () => {
  const pairs = contextInput.value.split(',').map((item) => item.trim())
  const context: Record<string, string> = {}
  for (const pair of pairs) {
    const [key, value] = pair.split(':').map((p) => p.trim())
    if (key && value) context[key] = value
  }
  addContext(context)
}
</script>

<template>
  <div style="padding: 2rem; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <h1>Grafana Faro Logging Demo</h1>
    <p style="max-width: 760px; line-height: 1.6;">
      This demo sends logs and errors to Grafana Faro, mimicking a Sentry-style logging workflow.
      It also keeps a local preview of the same payloads that were sent to Faro.
    </p>

    <section style="display:grid; gap:0.75rem; max-width:760px; margin-top:1.5rem;">
      <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <strong>Faro status:</strong>
        <span>{{ isFaroReady ? 'ready' : 'not ready' }}</span>
      </div>

      <div style="display:grid; gap:0.75rem;">
        <button @click="pushDebug">Send debug log</button>
        <button @click="pushInfo">Send info log</button>
        <button @click="pushWarn">Send warn log</button>
        <button @click="pushErrorLog">Send handled error</button>
        <button @click="throwUnhandled">Throw unhandled exception</button>
      </div>
    </section>

    <section style="margin-top:1.5rem; max-width:760px; display:grid; gap:0.75rem;">
      <div>
        <label style="display:block; font-weight:600; margin-bottom:0.25rem;">Custom event name</label>
        <input v-model="eventInput" placeholder="user_signup" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:0.5rem;" />
        <button style="margin-top:0.5rem;" @click="pushEvent">Send custom event</button>
      </div>

      <div>
        <label style="display:block; font-weight:600; margin-bottom:0.25rem;">User identity</label>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
          <input v-model="userId" placeholder="u-001" style="flex:1; padding:0.6rem; border:1px solid #cbd5e1; border-radius:0.5rem;" />
          <input v-model="userName" placeholder="User name" style="flex:2; padding:0.6rem; border:1px solid #cbd5e1; border-radius:0.5rem;" />
        </div>
        <button style="margin-top:0.5rem;" @click="applyUser">Set user context</button>
      </div>

      <div>
        <label style="display:block; font-weight:600; margin-bottom:0.25rem;">Additional context</label>
        <textarea v-model="contextInput" rows="2" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:0.5rem;" placeholder="userId:123, plan:premium"></textarea>
        <button style="margin-top:0.5rem;" @click="applyContext">Add context</button>
      </div>
    </section>

    <section style="margin-top:1.5rem; max-width:760px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:0.75rem;">
        <h2 style="margin:0;">Local log preview</h2>
        <button @click="clearLogs">Clear logs</button>
      </div>
      <div v-if="logs.length === 0" style="padding:1rem; background:#f3f4f6; border-radius:0.75rem;">
        No logs yet. Click one of the buttons above to generate a Faro payload.
      </div>
      <ul v-else style="list-style:none; padding:0; margin:0; display:grid; gap:1rem;">
        <li v-for="log in logs" :key="log.id" style="padding:1rem; border:1px solid #e2e8f0; border-radius:0.75rem; background:#ffffff;">
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
            <span style="font-weight:700;">{{ log.level.toUpperCase() }}</span>
            <small>{{ log.timestamp }}</small>
          </div>
          <div style="margin-top:0.5rem;">{{ log.message }}</div>
          <div v-if="log.details" style="margin-top:0.75rem; color:#475569; font-size:0.94rem; white-space:pre-wrap;">{{ JSON.stringify(log.details, null, 2) }}</div>
        </li>
      </ul>
    </section>
  </div>
</template>