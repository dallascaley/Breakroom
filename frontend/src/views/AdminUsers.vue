<template>
  <section>
    <h1>Manage Users</h1>
    
    <form @submit.prevent="createUser">
      <input v-model="newUser.name" placeholder="Name" required />
      <input v-model="newUser.email" placeholder="Email" required />
      <button type="submit">Add User</button>
    </form>

    <ul>
      <li v-for="user in users" :key="user.id">
        <strong>{{ user.name }}</strong> ({{ user.email }})
        <button @click="editUser(user)">Edit</button>
        <button @click="deleteUser(user.id)">Delete</button>
      </li>
    </ul>

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

const users = ref([
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
])

const newUser = ref({ name: '', email: '' })
const editingUser = ref(null)

function createUser() {
  const id = Date.now()
  users.value.push({ id, ...newUser.value })
  newUser.value = { name: '', email: '' }
}

function deleteUser(id) {
  users.value = users.value.filter(u => u.id !== id)
}

function editUser(user) {
  editingUser.value = { ...user }
}

function updateUser() {
  const index = users.value.findIndex(u => u.id === editingUser.value.id)
  if (index !== -1) {
    users.value[index] = editingUser.value
    editingUser.value = null
  }
}

function cancelEdit() {
  editingUser.value = null
}
</script>

<style scoped>
form {
  margin-bottom: 20px;
}

input {
  margin-right: 10px;
  padding: 5px;
}
</style>
