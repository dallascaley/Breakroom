<template>
  <section>
    <h1>Manage Users</h1>

    <!-- Add User Form -->
    <form @submit.prevent="createUser">
      <input v-model="newUser.handle" placeholder="Handle" required />
      <input v-model="newUser.email" placeholder="Email" required />
      <button type="submit">Add User</button>
      <p v-if="formError" style="color: red;">{{ formError }}</p>
    </form>


    <!-- DataFetcher renders the user table -->
    <DataFetcher :key="fetchKey" endpoint="/api/user/all" v-slot="{ data: data }">
      <template v-if="data && data.users">
        <div v-show="false">{{ updateUsers(data.users) }}</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Handle</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in data.users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.handle }}</td>
              <td>{{ user.first_name }}</td>
              <td>{{ user.last_name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <button @click="editUser(user)">Edit</button>
                <button @click="deleteUser(user.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </DataFetcher>

    <!-- Invite Modal -->
    <div v-if="showInviteModal" class="modal-overlay">
      <div class="modal">
        <h2>Invite New User</h2>
        <form @submit.prevent="sendInvite">
          <input v-model="inviteUserForm.handle" placeholder="Handle" disabled />
          <input v-model="inviteUserForm.email" placeholder="Email" disabled />
          <input v-model="inviteUserForm.first_name" placeholder="First Name" required />
          <input v-model="inviteUserForm.last_name" placeholder="Last Name" required />
          <button type="submit">Send Invite</button>
          <button @click="showInviteModal = false" type="button">Cancel</button>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="editingUser" class="modal-overlay">
      <div class="modal">
        <h2>Edit User</h2>
        <form @submit.prevent="updateUser">
          <input v-model="editingUser.handle" placeholder="Handle" required />
          <input v-model="editingUser.first_name" placeholder="First Name" required />
          <input v-model="editingUser.last_name" placeholder="Last Name" required />
          <input v-model="editingUser.email" placeholder="Email" required />
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

const newUser = ref({ handle: '', email: '' })
const inviteUserForm = ref({ handle: '', email: '', first_name: '', last_name: '' })
const showInviteModal = ref(false)
const formError = ref('')

const existingUsers = ref([])
const userPermissions = ref(null)


const fetchKey = ref(0)


function updateUsers(users) {
  existingUsers.value = users
  return '' // Just returns something harmless for the DOM
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const editingUser = ref(null)

function createUser() {
  const { handle, email } = newUser.value

  if (!handle || !email) {
    formError.value = 'Handle and Email are required.'
    return
  }

  const duplicate = existingUsers.value.find(
    user => user.handle === handle || user.email === email
  )

  if (duplicate) {
    formError.value = `Login handle "${duplicate.handle}" or email address "${duplicate.email}" already exist.  Please use unique values`
    return
  }

  if (!isValidEmail(email)) {
    formError.value = 'Please enter a valid email address.'
    return
  }

  formError.value = ''
  inviteUserForm.value = {
    handle,
    email,
    first_name: '',
    last_name: ''
  }
  showInviteModal.value = true
}

async function sendInvite() {
  const payload = inviteUserForm.value

  await fetch('/api/user/invite', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload) }
  )

  console.log('Sending invite with payload:', payload)

  // Reset forms and close modal
  newUser.value = { handle: '', email: '' }
  inviteUserForm.value = { handle: '', email: '', first_name: '', last_name: '' }
  showInviteModal.value = false
  fetchKey.value++  // trigger user list refresh
}

async function editUser(user) {
  editingUser.value = { ...user }  // Copy user object

  try {
    const res = await fetch(`/api/user/permissionMatrix/${user.id}`)
    if (!res.ok) {
      throw new Error('Failed to fetch permission matrix')
    }
    const data = await res.json()
    userPermissions.value = data
    console.log('Loaded permissions:', data)
  } catch (err) {
    console.error(err)
    userPermissions.value = null
  }
}

async function updateUser() {
  const user = editingUser.value
  const response = await fetch(`/api/user/${user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  })

  if (!response.ok) {
    console.error('Failed to update user')
    return
  }

  // Refresh users list
  const updated = await response.json()
  const index = existingUsers.value.findIndex(u => u.id === updated.id)
  if (index !== -1) {
    existingUsers.value[index] = updated
  }

  editingUser.value = null
}

async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) {
    return;
  }

  try {
    const res = await fetch(`/api/user/${userId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      console.error('Failed to delete user');
      return;
    }

    fetchKey.value++  // trigger user list refresh
  } catch (err) {
    console.error('Error deleting user:', err);
  }
}


function cancelEdit() {
  editingUser.value = null
}
</script>

<style>
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

