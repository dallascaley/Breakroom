<template>
  <section class="profile-page">

    <nav class="profile-nav">
      <button class="tab active">Profile</button>
      <button class="tab">Billing</button>
      <button class="tab">Settings</button>
    </nav>

    <div class="tab-content">
      <h2>Profile Overview TEsting!!</h2>

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
  // In real app, reset formData to original values if needed
}

function saveProfile() {
  // Handle saving logic (e.g., API call)
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


<style>
.profile-page {
  max-width: 800px;
  margin: 50px auto;
  padding: 0 20px;
  font-family: system-ui, sans-serif;
  color: #333;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.profile-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ddd;
}

.user-details h1 {
  font-size: 1.8rem;
  margin: 0;
  color: #2e86de;
}

.user-email {
  color: #666;
  font-size: 0.95rem;
}

.profile-nav {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 2rem;
}

.tab {
  background: none;
  border: none;
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  color: #2e86de;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab:hover {
  color: #1e6bb8;
}

.tab.active {
  border-bottom: 2px solid #2e86de;
  font-weight: bold;
}

.tab-content h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.tab-content p {
  margin-bottom: 1rem;
  color: #555;
}

.profile-details p {
  margin: 0.4rem 0;
}

.edit-link {
  display: inline-block;
  margin-top: 1rem;
  color: #2e86de;
  cursor: pointer;
  text-decoration: underline;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.3rem;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-actions {
  margin-top: 1rem;
}

.form-actions button {
  padding: 0.6rem 1.2rem;
  margin-right: 10px;
  border: none;
  background-color: #2e86de;
  color: white;
  cursor: pointer;
  border-radius: 4px;
}

.form-actions button[type="button"] {
  background-color: #ccc;
  color: #333;
}

</style>
