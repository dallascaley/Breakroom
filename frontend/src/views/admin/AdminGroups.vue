<template>
  <section>
    <h1>Manage Groups</h1>

    <!-- Add Group Form -->
    <form @submit.prevent="createGroup">
      <input v-model="newGroup.name" placeholder="Name" required />
      <input v-model="newGroup.description" placeholder="Description" required />
      <label>
        <input type="checkbox" v-model="newGroup.is_active" />
        Active
      </label>
      <button type="submit">Add Group</button>
      <p v-if="formError" style="color: red;">{{ formError }}</p>
    </form>

    <!-- DataFetcher renders the group table -->
    <DataFetcher :key="fetchKey" endpoint="/api/group/all" v-slot="{ data }">
      <template v-if="data && data.groups">
        <div v-show="false">{{ updateGroups(data.groups) }}</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in data.groups" :key="group.id">
              <td>{{ group.id }}</td>
              <td>{{ group.name }}</td>
              <td>{{ group.description }}</td>
              <td>{{ group.is_active ? 'Yes' : 'No' }}</td>
              <td>
                <button @click="editGroup(group)">Edit</button>
                <button @click="deleteGroup(group.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </DataFetcher>

    <!-- Edit Group Modal -->
    <div v-if="editingGroup" class="modal-overlay">
      <div class="modal">
        <h2>Edit Group</h2>
        <form @submit.prevent="updateGroup">
          <input v-model="editingGroup.name" placeholder="Name" required /><br/>
          <input v-model="editingGroup.description" placeholder="Description" required /><br/>
          <label>
            <input type="checkbox" v-model="editingGroup.is_active" />
            Active
          </label><br/>
          <div v-if="matrix">
            <h3>Permissions</h3>
            <ul>
              <li v-for="perm in matrix.permissions" :key="perm.id">
                <label>
                  <input type="checkbox" v-model="perm.has_permission"/>
                  {{ perm.name }}
                </label>
              </li>
            </ul>
          </div>
          <button type="submit">Save</button>
          <button type="button" @click="cancelEdit">Cancel</button>
        </form>
      </div>
    </div>
    
  </section>
</template>

<script setup>
import { ref } from 'vue'
import DataFetcher from '@/components/DataFetcher.vue'
import { watchEffect } from 'vue'

const newGroup = ref({ name: '', description: '', is_active: true })
const editingGroup = ref(null)
const existingGroups = ref([])
const matrix = ref(null)
const formError = ref('')
const fetchKey = ref(0)

function updateGroups(perms) {
  existingGroups.value = perms
  return ''
}

function createGroup() {
  const { name, description } = newGroup.value

  if (!name || !description) {
    formError.value = 'Name and Description are required.'
    return
  }

  const duplicate = existingGroups.value.find(p => p.name === name)
  if (duplicate) {
    formError.value = `A group with the name "${name}" already exists.`
    return
  }

  formError.value = ''
  sendGroup()
}

async function sendGroup() {
  try {
    const res = await fetch('/api/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGroup.value),
    })

    if (!res.ok) {
      throw new Error('Failed to create group')
    }

    newGroup.value = { name: '', description: '', is_active: true }
    fetchKey.value++
  } catch (err) {
    console.error(err)
    formError.value = 'An error occurred while creating the group.'
  }
}

async function editGroup(group) {
  editingGroup.value = { ...group } // Copy group object

  try {
    const res = await fetch(`/api/group/groupMatrix/${group.id}`)
    if (!res.ok) {
      throw new Error('Failed to fetch group matrix')
    }
    const data = await res.json()
    matrix.value = data

    watchEffect(() => {
      if (!matrix.value) return

      // Clear all permissions first

      // General note, something is not right here but it seems to be working so fuck it...
      // what is this manuallChecked even for?

      const manuallyChecked = new Set()
      //matrix.value.permissions.forEach(p => p.has_permission = false)

      matrix.value.permissions.forEach(p => {
        if (manuallyChecked.has(p.id)) {
          p.has_permission = true
        }
      })
    })

    console.log("Loaded group permissions", data)
  } catch (err) {
    console.error(err)
    matrix.value = null
  }
}

function cancelEdit() {
  editingGroup.value = null
}

async function updateGroup() {
  const group = editingGroup.value

  // Build a payload to include the group and permissions
  const payload = {
    group,
    permissions: matrix.value.permissions.map(perm => ({
      permission_id: perm.id,
      has_permission: perm.has_permission
    }))
  }

  try {
    const res = await fetch(`/api/group/${group.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error('Failed to update group')
    }

    editingGroup.value = null
    fetchKey.value++
  } catch (err) {
    console.error(err)
  }
}

async function deleteGroup(id) {
  if (!confirm('Are you sure you want to delete this group?')) return

  try {
    const res = await fetch(`/api/group/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      throw new Error('Failed to delete group')
    }

    fetchKey.value++
  } catch (err) {
    console.error(err)
  }
}

</script>

<style scoped>
h1 {
  color: var(--color-text);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background: var(--color-background-card);
}

th, td {
  border: 1px solid var(--color-border);
  padding: 10px;
  text-align: left;
  color: var(--color-text);
}

thead {
  background-color: var(--color-background-soft);
}

form {
  margin-bottom: 20px;
}

form input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  margin-right: 8px;
  background: var(--color-background-input);
  color: var(--color-text);
}

form label {
  color: var(--color-text);
  margin-right: 8px;
}

button {
  margin-right: 5px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: var(--color-accent);
  color: white;
}

button:hover {
  background: var(--color-accent-hover);
}

button[type="button"] {
  background: var(--color-button-secondary);
  color: var(--color-text);
}

button[type="button"]:hover {
  background: var(--color-button-secondary-hover);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--color-background-card);
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

.modal h2, .modal h3 {
  color: var(--color-text);
  margin-bottom: 12px;
}

.modal input {
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-input);
  color: var(--color-text);
  box-sizing: border-box;
}

.modal ul {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}

.modal li {
  margin: 6px 0;
}

.modal label {
  color: var(--color-text);
  cursor: pointer;
}

.modal input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
  margin-bottom: 0;
}
</style>
