<template>
  <section>
    <h1>Manage Users</h1>

    <!-- Add User Form -->
    <form @submit.prevent="createUser">
      <input v-model="newUser.name" placeholder="Name" required />
      <input v-model="newUser.email" placeholder="Email" required />
      <button type="submit">Add User</button>
    </form>

    <!-- DataFetcher renders the user list -->
    <DataFetcher endpoint="/api/user/all" v-slot="{ data: data }">
      <ul>
        <li v-for="user in data.users.rows" :key="user.id">
          <strong>{{ user.handle }}</strong> ({{ user.email }})
          <button @click="editUser(user)">Edit</button>
          <button @click="deleteUser(user.id)">Delete</button>
        </li>
      </ul>
    </DataFetcher>

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

const newUser = ref({ name: '', email: '' })
const editingUser = ref(null)

/*
function createUser() {
  // Add API call here if you want to persist it
  // For now just clear the form
  newUser.value = { name: '', email: '' }
}

function deleteUser(id) {
  // API call to delete user could go here
}

function editUser(user) {
  editingUser.value = { ...user }
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
