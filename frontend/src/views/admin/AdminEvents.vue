<template>
  <section>
    <h1>Events</h1>
    <p class="description">
      Events are triggered by code when specific actions occur in the system.
      Use the <RouterLink to="/admin/notifications">Notifications</RouterLink> page to configure notifications that trigger when events fire.
    </p>

    <!-- Events List -->
    <DataFetcher :key="fetchKey" endpoint="/api/event/admin/all" v-slot="{ data }">
      <template v-if="data && data.events">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Scope</th>
              <th>Logged</th>
              <th>Log Count</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in data.events" :key="event.id">
              <td><code>{{ event.code }}</code></td>
              <td>{{ event.name }}</td>
              <td>{{ event.category || '-' }}</td>
              <td>{{ event.scope }}</td>
              <td>{{ event.is_logged ? 'Yes' : 'No' }}</td>
              <td>{{ event.log_count }}</td>
              <td>
                <span :class="event.is_active ? 'status-active' : 'status-inactive'">
                  {{ event.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <button v-if="event.is_logged && event.log_count > 0" @click="viewLogs(event)">View Logs</button>
                <span v-else class="no-logs">No logs</span>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </DataFetcher>

    <!-- Event Logs Modal -->
    <div v-if="viewingEvent" class="modal-overlay">
      <div class="modal modal-wide">
        <h2>Logs for: {{ viewingEvent.name }}</h2>

        <div v-if="logsLoading" class="loading">Loading logs...</div>

        <div v-else-if="logs.length > 0" class="logs-container">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Data</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td>{{ formatDate(log.triggered_at) }}</td>
                <td>{{ log.user_handle || 'System' }}</td>
                <td><code>{{ formatJson(log.data_json) }}</code></td>
                <td>{{ log.ip_address || '-' }}</td>
              </tr>
            </tbody>
          </table>

          <div v-if="logsTotal > logs.length" class="pagination">
            Showing {{ logs.length }} of {{ logsTotal }} logs
            <button @click="loadMoreLogs">Load More</button>
          </div>
        </div>

        <p v-else>No logs found for this event.</p>

        <div class="button-row">
          <button type="button" @click="closeLogs">Close</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import DataFetcher from '@/components/DataFetcher.vue'
import { authFetch } from '@/utilities/authFetch'

const fetchKey = ref(0)
const viewingEvent = ref(null)
const logs = ref([])
const logsTotal = ref(0)
const logsLoading = ref(false)
const logsOffset = ref(0)

async function viewLogs(event) {
  viewingEvent.value = event
  logsOffset.value = 0
  logs.value = []
  await fetchLogs()
}

async function fetchLogs() {
  logsLoading.value = true
  try {
    const res = await authFetch(`/api/event/admin/logs?event_id=${viewingEvent.value.id}&limit=50&offset=${logsOffset.value}`)
    const data = await res.json()
    logs.value = [...logs.value, ...data.logs]
    logsTotal.value = data.total
  } catch (err) {
    console.error('Error fetching logs:', err)
  } finally {
    logsLoading.value = false
  }
}

function loadMoreLogs() {
  logsOffset.value += 50
  fetchLogs()
}

function closeLogs() {
  viewingEvent.value = null
  logs.value = []
  logsTotal.value = 0
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString()
}

function formatJson(jsonStr) {
  if (!jsonStr) return '-'
  try {
    const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    return JSON.stringify(obj)
  } catch {
    return jsonStr
  }
}
</script>

<style scoped>
.description {
  color: #666;
  margin-bottom: 20px;
}

.description a {
  color: #42b983;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

th, td {
  border: 1px solid #eee;
  padding: 12px;
  text-align: left;
}

thead {
  background-color: #f8f9fa;
}

thead th {
  font-weight: 600;
  color: #333;
}

code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
}

.status-active {
  color: #42b983;
  font-weight: 500;
}

.status-inactive {
  color: #999;
}

.no-logs {
  color: #999;
  font-size: 13px;
}

button {
  background: #42b983;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

button:hover {
  background: #369970;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-wide {
  width: 900px;
}

.modal h2 {
  margin-top: 0;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.logs-container {
  margin-bottom: 20px;
}

.logs-table {
  font-size: 13px;
}

.logs-table code {
  font-size: 12px;
  max-width: 300px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  margin-top: 16px;
  text-align: center;
  color: #666;
}

.pagination button {
  margin-left: 10px;
}

.button-row {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}
</style>
