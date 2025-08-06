<template>
  <section class="profile-page">
    <div class="profile-header">
      <img
        :src="profileImage"
        alt="Profile Image"
        class="profile-image"
      />
      <div class="user-details">
        <h1>{{ formData.name }}</h1>
        <p class="user-email">{{ formData.email }}</p>
      </div>
    </div>

    <nav class="profile-nav">
      <RouterLink to="/profile" class="tab" :class="{ active: $route.path === '/profile' }">Profile</RouterLink>
      <RouterLink to="/billing" class="tab" :class="{ active: $route.path === '/billing' }">Billing</RouterLink>
      <RouterLink to="/settings" class="tab" :class="{ active: $route.path === '/settings' }">Settings</RouterLink>
    </nav>

    <div class="tab-content">
      <h2>Profile Overview</h2>

      <template v-if="!isEditing">
        <p>Welcome to your profile! Here you can update your information, check your subscription, and manage settings.</p>

        <div class="profile-details">
          <p><strong>Username:</strong> {{ formData.username }}</p>
          <p><strong>Member since:</strong> {{ formData.memberSince }}</p>
          <p><strong>Plan:</strong> {{ formData.plan }}</p>
        </div>

        <a href="#" class="edit-link" @click.prevent="isEditing = true">Edit Profile</a>
      </template>

      <template v-else>
        <form @submit.prevent="saveProfile">
          <div class="form-group">
            <label>Name:</label>
            <input type="text" v-model="formData.name" />
          </div>
          <div class="form-group">
            <label>Email:</label>
            <input type="email" v-model="formData.email" />
          </div>
          <div class="form-group">
            <label>Username:</label>
            <input type="text" v-model="formData.username" />
          </div>
          <div class="form-group">
            <label>Plan:</label>
            <input type="text" v-model="formData.plan" />
          </div>

          <div class="form-group">
            <label>Upload New Profile Image:</label>
            <input type="file" @change="onImageSelected" />
          </div>

          <div class="form-actions">
            <button type="submit">Save</button>
            <button type="button" @click="cancelEdit">Cancel</button>
          </div>
        </form>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const isEditing = ref(false)

const formData = ref({
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  username: 'janedoe',
  memberSince: 'January 2024',
  plan: 'Pro Monthly',
})

const profileImage = ref('https://i.pravatar.cc/120?u=your-user-id')

function cancelEdit() {
  isEditing.value = false
}

function saveProfile() {
  isEditing.value = false
}

function onImageSelected(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      profileImage.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}
</script>

<style scoped>
/* keep your styles here or move to a shared style file */
</style>
