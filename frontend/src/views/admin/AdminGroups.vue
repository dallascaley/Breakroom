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
import { ref, reactive } from 'vue'
import DataFetcher from '@/components/DataFetcher.vue'
//import { watchEffect } from 'vue'

const newGroup = ref({ name: '', description: '', is_active: true })
const editingGroup = ref(null)
const existingGroups = ref([])
const matrix = reactive({
  permissions: [],
  groups: []
})
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
  try {
    const res = await fetch(`/api/group/groupMatrix/${group.id}`)
    if (!res.ok) {
      throw new Error('Failed to fetch group matrix')
    }

    const data = await res.json()

    const groupPermissionIds = new Set(group.group_permissions || [])

    matrix.permissions = data.permissions.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      is_active: p.is_active,
      has_permission: groupPermissionIds.has(p.id)
    }))

    matrix.groups = data.groups

    editingGroup.value = { ...group }

    console.log("Matrix ready", matrix.value)
  } catch (err) {
    console.error(err)
    matrix.value = null
  }
}

function cancelEdit() {
  editingGroup.value = null
  matrix.permissions = []
  matrix.groups = []
}

async function updateGroup() {
  const perm = editingGroup.value

  try {
    const res = await fetch(`/api/group/${perm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perm),
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
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}
</style>
