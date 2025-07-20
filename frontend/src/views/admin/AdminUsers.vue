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
    <DataFetcher endpoint="/api/user/all" v-slot="{ data: data }">
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
          <tr v-for="user in data.users.rows" :key="user.id">
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


    <!-- Edit User Form -->
    <div v-if="editingUser">
      <h2>Edit User</h2>
      <form @submit.prevent="updateUser">
        <input v-model="editingUser.name" />
        <input v-model="editingUser.email" />
        <button type="submit">Save</button>
        <button @click="cancelEdit">Cancel</button>
      </form>
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



const editingUser = ref(null)

function createUser() {
  const { handle, email } = newUser.value

  if (!handle || !email) {
    formError.value = 'Handle and Email are required.'
    return
  }

  // Clear error and open modal
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

  // You'd eventually send this to your backend:
  await fetch('/api/user/invite', { method: 'POST', body: JSON.stringify(payload) })

  console.log('Sending invite with payload:', payload)

  // Reset forms and close modal
  newUser.value = { handle: '', email: '' }
  inviteUserForm.value = { handle: '', email: '', first_name: '', last_name: '' }
  showInviteModal.value = false
}


/*

function deleteUser(id) {
  // API call to delete user could go here
}

function updateUser() {
  // API call to update user could go here
  editingUser.value = null
}
*/

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

