<template>
  <div class="profile-layout">
    <aside class="sidebar">
      <h2>Profile</h2>

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
      
      <nav>
        <ul>
          <li><RouterLink to="/profile">Profile</RouterLink></li>
          <li><RouterLink to="/profile/billing">Billing</RouterLink></li>
          <li><RouterLink to="/profile/settings">Settings</RouterLink></li>
        </ul>
      </nav>
    </aside>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

//const isEditing = ref(false)

const formData = ref({
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  username: 'janedoe',
  memberSince: 'January 2024',
  plan: 'Pro Monthly',
})

const profileImage = ref('https://i.pravatar.cc/120?u=your-user-id')

/*
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
*/
</script>

<style>
.profile-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background-color: #2e86de;
  color: white;
  padding: 20px;
}

.sidebar h2 {
  color: #fff;
  font-size: 1.4rem;
  margin-bottom: 1rem;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  margin: 10px 0;
}

.sidebar a {
  color: white;
  text-decoration: none;
}

.main-content {
  flex-grow: 1;
  padding: 30px;
  background-color: #f9f9f9;
}
</style>
