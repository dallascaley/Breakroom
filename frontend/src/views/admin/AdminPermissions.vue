<template>
  <section>
    <h1>Manage Permissions</h1>

    <!-- Add Permission Form -->
    <form @submit.prevent="createPermission">
      <input v-model="newPermission.name" placeholder="Name" required />
      <input v-model="newPermission.description" placeholder="Description" required />
      <label>
        <input type="checkbox" v-model="newPermission.is_active" />
        Active
      </label>
      <button type="submit">Add Permission</button>
      <p v-if="formError" style="color: red;">{{ formError }}</p>
    </form>

    <!-- DataFetcher renders the permission table -->
    <DataFetcher :key="fetchKey" endpoint="/api/permission/all" v-slot="{ data }">
      <template v-if="data && data.permissions">
        <div v-show="false">{{ updatePermissions(data.permissions) }}</div>
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
            <tr v-for="perm in data.permissions" :key="perm.id">
              <td>{{ perm.id }}</td>
              <td>{{ perm.name }}</td>
              <td>{{ perm.description }}</td>
              <td>{{ perm.is_active ? 'Yes' : 'No' }}</td>
              <td>
                <button @click="editPermission(perm)">Edit</button>
                <button @click="deletePermission(perm.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </DataFetcher>

    <!-- Edit Permission Modal -->
    <div v-if="editingPermission" class="modal-overlay">
      <div class="modal">
        <h2>Edit Permission</h2>
        <form @submit.prevent="updatePermission">
          <input v-model="editingPermission.name" placeholder="Name" required /><br/>
          <input v-model="editingPermission.description" placeholder="Description" required /><br/>
          <label>
            <input type="checkbox" v-model="editingPermission.is_active" />
            Active
          </label><br/>
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

const newPermission = ref({ name: '', description: '', is_active: true })
const editingPermission = ref(null)
const existingPermissions = ref([])
const formError = ref('')
const fetchKey = ref(0)

function updatePermissions(perms) {
  existingPermissions.value = perms
  return ''
}

function createPermission() {
  const { name, description } = newPermission.value

  if (!name || !description) {
    formError.value = 'Name and Description are required.'
    return
  }

  const duplicate = existingPermissions.value.find(p => p.name === name)
  if (duplicate) {
    formError.value = `A permission with the name "${name}" already exists.`
    return
  }

  formError.value = ''
  sendPermission()
}

async function sendPermission() {
  try {
    const res = await fetch('/api/permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPermission.value),
    })

    if (!res.ok) {
      throw new Error('Failed to create permission')
    }

    newPermission.value = { name: '', description: '', is_active: true }
    fetchKey.value++
  } catch (err) {
    console.error(err)
    formError.value = 'An error occurred while creating the permission.'
  }
}

function editPermission(perm) {
  editingPermission.value = { ...perm }
}

async function updatePermission() {
  const perm = editingPermission.value

  try {
    const res = await fetch(`/api/permission/${perm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perm),
    })

    if (!res.ok) {
      throw new Error('Failed to update permission')
    }

    editingPermission.value = null
    fetchKey.value++
  } catch (err) {
    console.error(err)
  }
}

async function deletePermission(id) {
  if (!confirm('Are you sure you want to delete this permission?')) return

  try {
    const res = await fetch(`/api/permission/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      throw new Error('Failed to delete permission')
    }

    fetchKey.value++
  } catch (err) {
    console.error(err)
  }
}

function cancelEdit() {
  editingPermission.value = null
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
