<template>
  <section>
    <h1>Manage Notifications</h1>

    <!-- Create Notification Form -->
    <div class="create-form">
      <h2>Create New Notification</h2>
      <form @submit.prevent="createNotification">
        <div class="form-row">
          <label>Title</label>
          <input v-model="form.title" required placeholder="Notification title" />
        </div>

        <div class="form-row">
          <label>Content</label>
          <textarea v-model="form.content" required rows="4" placeholder="Notification content..."></textarea>
          <small v-if="form.event_id">Supports placeholders like {{data.fieldName}}</small>
        </div>

        <div class="form-row">
          <label>Type</label>
          <select v-model="form.type_id">
            <option :value="null">-- Select Type --</option>
            <option v-for="type in types" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>

        <!-- Event Trigger Section -->
        <div class="form-section">
          <h3>Event Trigger (Optional)</h3>
          <p class="hint">Link this notification to an event to trigger it automatically</p>

          <div class="form-row">
            <label>Trigger Event</label>
            <select v-model="form.event_id">
              <option :value="null">-- Manual Only (no event trigger) --</option>
              <option v-for="event in events" :key="event.id" :value="event.id">
                {{ event.name }} ({{ event.code }})
              </option>
            </select>
          </div>

          <template v-if="form.event_id">
            <div class="form-row">
              <label>Trigger Mode</label>
              <select v-model="form.trigger_mode">
                <option value="always">Every time the event fires</option>
                <option value="once">Only the first time (per user)</option>
                <option value="until_silenced">Every time until user silences</option>
              </select>
            </div>

            <div class="form-row">
              <label>Condition (Optional JSON)</label>
              <textarea v-model="form.condition_json" rows="2" placeholder='{"to": {"$lte": 2}}'></textarea>
              <small>Only trigger when condition matches. Operators: $eq, $ne, $gt, $gte, $lt, $lte, $in</small>
            </div>
          </template>
        </div>

        <div class="form-row">
          <label>Display Mode</label>
          <select v-model="form.display_mode">
            <option value="simple">Simple (Bell dropdown)</option>
            <option value="modal">Modal (Blocking popup)</option>
          </select>
        </div>

        <div class="form-row">
          <label>Priority</label>
          <input type="number" v-model.number="form.priority" min="0" max="100" />
        </div>

        <!-- Manual targeting (only when no event) -->
        <template v-if="!form.event_id">
          <div class="form-row">
            <label>
              <input type="checkbox" v-model="form.target_all_users" />
              Send to all users
            </label>
          </div>

          <div v-if="!form.target_all_users" class="targeting-section">
            <div class="form-row">
              <label>Target Groups</label>
              <div class="checkbox-list">
                <label v-for="group in groups" :key="group.id">
                  <input
                    type="checkbox"
                    :value="group.id"
                    v-model="form.target_group_ids"
                  />
                  {{ group.name }}
                </label>
              </div>
            </div>
          </div>

          <div class="form-row">
            <label>Publish At (optional, leave blank for immediate)</label>
            <input type="datetime-local" v-model="form.publish_at" />
          </div>

          <div class="form-row">
            <label>Expires At (optional)</label>
            <input type="datetime-local" v-model="form.expires_at" />
          </div>
        </template>

        <button type="submit" class="submit-btn">Create Notification</button>
        <p v-if="formError" class="error">{{ formError }}</p>
        <p v-if="formSuccess" class="success">{{ formSuccess }}</p>
      </form>
    </div>

    <!-- Existing Notifications -->
    <DataFetcher :key="fetchKey" endpoint="/api/notification/admin/all" v-slot="{ data }">
      <template v-if="data && data.notifications">
        <h2>Existing Notifications</h2>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Event</th>
              <th>Trigger</th>
              <th>Type</th>
              <th>Mode</th>
              <th>Recipients</th>
              <th>Read</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="notification in data.notifications" :key="notification.id">
              <td>{{ notification.title }}</td>
              <td>{{ notification.event_name || 'Manual' }}</td>
              <td>{{ formatTriggerMode(notification.trigger_mode) }}</td>
              <td>{{ notification.type_name || '-' }}</td>
              <td>{{ notification.display_mode }}</td>
              <td>{{ notification.recipient_count }}</td>
              <td>{{ notification.read_count }}</td>
              <td>{{ notification.is_active ? 'Active' : 'Inactive' }}</td>
              <td>
                <button @click="editNotification(notification)">Edit</button>
                <button @click="deleteNotification(notification.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </DataFetcher>

    <!-- Edit Modal -->
    <div v-if="editingNotification" class="modal-overlay">
      <div class="modal">
        <h2>Edit Notification</h2>
        <form @submit.prevent="updateNotification">
          <div class="form-row">
            <label>Title</label>
            <input v-model="editingNotification.title" required />
          </div>
          <div class="form-row">
            <label>Content</label>
            <textarea v-model="editingNotification.content" required rows="4"></textarea>
          </div>
          <div class="form-row">
            <label>Type</label>
            <select v-model="editingNotification.type_id">
              <option :value="null">-- Select Type --</option>
              <option v-for="type in types" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <label>Trigger Event</label>
            <select v-model="editingNotification.event_id">
              <option :value="null">-- Manual Only --</option>
              <option v-for="event in events" :key="event.id" :value="event.id">
                {{ event.name }}
              </option>
            </select>
          </div>
          <template v-if="editingNotification.event_id">
            <div class="form-row">
              <label>Trigger Mode</label>
              <select v-model="editingNotification.trigger_mode">
                <option value="always">Every time</option>
                <option value="once">First time only</option>
                <option value="until_silenced">Until silenced</option>
              </select>
            </div>
            <div class="form-row">
              <label>Condition (JSON)</label>
              <textarea v-model="editingNotification.condition_json" rows="2"></textarea>
            </div>
          </template>
          <div class="form-row">
            <label>Display Mode</label>
            <select v-model="editingNotification.display_mode">
              <option value="simple">Simple</option>
              <option value="modal">Modal</option>
            </select>
          </div>
          <div class="form-row">
            <label>Priority</label>
            <input type="number" v-model.number="editingNotification.priority" min="0" max="100" />
          </div>
          <div class="form-row">
            <label>
              <input type="checkbox" v-model="editingNotification.is_active" />
              Active
            </label>
          </div>
          <div class="button-row">
            <button type="submit">Save</button>
            <button type="button" @click="editingNotification = null">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataFetcher from '@/components/DataFetcher.vue'
import { authFetch } from '@/utilities/authFetch'

const types = ref([])
const groups = ref([])
const events = ref([])
const fetchKey = ref(0)
const formError = ref('')
const formSuccess = ref('')
const editingNotification = ref(null)

const form = ref({
  title: '',
  content: '',
  type_id: null,
  event_id: null,
  trigger_mode: 'always',
  condition_json: '',
  display_mode: 'simple',
  priority: 0,
  target_all_users: true,
  target_group_ids: [],
  publish_at: null,
  expires_at: null
})

async function fetchTypes() {
  try {
    const res = await authFetch('/api/notification/types')
    const data = await res.json()
    types.value = data.types
  } catch (err) {
    console.error('Error fetching types:', err)
  }
}

async function fetchGroups() {
  try {
    const res = await authFetch('/api/group/all')
    const data = await res.json()
    groups.value = data.groups
  } catch (err) {
    console.error('Error fetching groups:', err)
  }
}

async function fetchEvents() {
  try {
    const res = await authFetch('/api/event/admin/all')
    const data = await res.json()
    events.value = data.events.filter(e => e.is_active)
  } catch (err) {
    console.error('Error fetching events:', err)
  }
}

function formatTriggerMode(mode) {
  if (!mode) return '-'
  const modes = {
    always: 'Every time',
    once: 'Once',
    until_silenced: 'Until silenced'
  }
  return modes[mode] || mode
}

async function createNotification() {
  formError.value = ''
  formSuccess.value = ''

  try {
    // Parse condition JSON if provided
    let conditionJson = null
    if (form.value.event_id && form.value.condition_json) {
      try {
        conditionJson = JSON.parse(form.value.condition_json)
      } catch (e) {
        throw new Error('Invalid JSON in condition field')
      }
    }

    const payload = {
      ...form.value,
      condition_json: conditionJson
    }

    const res = await authFetch('/api/notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Failed to create notification')
    }

    formSuccess.value = 'Notification created successfully!'
    form.value = {
      title: '',
      content: '',
      type_id: null,
      event_id: null,
      trigger_mode: 'always',
      condition_json: '',
      display_mode: 'simple',
      priority: 0,
      target_all_users: true,
      target_group_ids: [],
      publish_at: null,
      expires_at: null
    }
    fetchKey.value++
  } catch (err) {
    formError.value = err.message
  }
}

function editNotification(notification) {
  editingNotification.value = {
    ...notification,
    condition_json: notification.condition_json
      ? (typeof notification.condition_json === 'object'
          ? JSON.stringify(notification.condition_json)
          : notification.condition_json)
      : ''
  }
}

async function updateNotification() {
  try {
    let conditionJson = null
    if (editingNotification.value.event_id && editingNotification.value.condition_json) {
      try {
        conditionJson = JSON.parse(editingNotification.value.condition_json)
      } catch (e) {
        alert('Invalid JSON in condition field')
        return
      }
    }

    const res = await authFetch(`/api/notification/${editingNotification.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editingNotification.value,
        condition_json: conditionJson
      })
    })

    if (!res.ok) throw new Error('Failed to update notification')

    editingNotification.value = null
    fetchKey.value++
  } catch (err) {
    console.error('Error updating notification:', err)
  }
}

async function deleteNotification(id) {
  if (!confirm('Are you sure you want to delete this notification?')) return

  try {
    const res = await authFetch(`/api/notification/${id}`, {
      method: 'DELETE'
    })

    if (!res.ok) throw new Error('Failed to delete notification')

    fetchKey.value++
  } catch (err) {
    console.error('Error deleting notification:', err)
  }
}

onMounted(() => {
  fetchTypes()
  fetchGroups()
  fetchEvents()
})
</script>

<style scoped>
.create-form {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.create-form h2 {
  margin-top: 0;
  margin-bottom: 20px;
}

.form-section {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.form-section h3 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  color: #333;
}

.form-section .hint {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #666;
}

.form-row {
  margin-bottom: 16px;
}

.form-row > label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.form-row input[type="text"],
.form-row input[type="number"],
.form-row input[type="datetime-local"],
.form-row input:not([type="checkbox"]),
.form-row textarea,
.form-row select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-row input[type="checkbox"] {
  margin-right: 8px;
}

.form-row small {
  display: block;
  color: #666;
  margin-top: 4px;
  font-size: 12px;
}

.checkbox-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.checkbox-list label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: normal;
}

.targeting-section {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.submit-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.submit-btn:hover {
  background: #369970;
}

.error {
  color: #e74c3c;
  margin-top: 8px;
}

.success {
  color: #42b983;
  margin-top: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}

thead {
  background-color: #f4f4f4;
}

button {
  margin-right: 5px;
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

.modal h2 {
  margin-top: 0;
}

.button-row {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}
</style>
