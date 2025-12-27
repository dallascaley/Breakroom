<script setup>
import { ref, onMounted, computed } from 'vue'

const isEditing = ref(false)
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref(null)
const successMessage = ref(null)

const profile = ref({
  handle: '',
  firstName: '',
  lastName: '',
  email: '',
  bio: '',
  photoPath: null,
  createdAt: null
})

const editForm = ref({
  firstName: '',
  lastName: '',
  bio: ''
})

const photoInput = ref(null)

const photoUrl = computed(() => {
  if (profile.value.photoPath) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
    return `${baseUrl}/uploads/${profile.value.photoPath}`
  }
  return null
})

const memberSince = computed(() => {
  if (profile.value.createdAt) {
    return new Date(profile.value.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }
  return ''
})

async function fetchProfile() {
  isLoading.value = true
  error.value = null

  try {
    const res = await fetch('/api/profile', {
      credentials: 'include'
    })

    if (!res.ok) {
      throw new Error('Failed to load profile')
    }

    const data = await res.json()
    profile.value = data.user
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

function startEdit() {
  editForm.value = {
    firstName: profile.value.firstName || '',
    lastName: profile.value.lastName || '',
    bio: profile.value.bio || ''
  }
  isEditing.value = true
  error.value = null
  successMessage.value = null
}

function cancelEdit() {
  isEditing.value = false
  error.value = null
}

async function saveProfile() {
  isSaving.value = true
  error.value = null

  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(editForm.value)
    })

    if (!res.ok) {
      throw new Error('Failed to save profile')
    }

    profile.value.firstName = editForm.value.firstName
    profile.value.lastName = editForm.value.lastName
    profile.value.bio = editForm.value.bio
    isEditing.value = false
    successMessage.value = 'Profile updated successfully!'
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err) {
    error.value = err.message
  } finally {
    isSaving.value = false
  }
}

function triggerPhotoUpload() {
  photoInput.value?.click()
}

async function onPhotoSelected(event) {
  const file = event.target.files[0]
  if (!file) return

  error.value = null
  const formData = new FormData()
  formData.append('photo', file)

  try {
    const res = await fetch('/api/profile/photo', {
      method: 'POST',
      credentials: 'include',
      body: formData
    })

    if (!res.ok) {
      throw new Error('Failed to upload photo')
    }

    const data = await res.json()
    profile.value.photoPath = data.photoPath
    successMessage.value = 'Photo uploaded successfully!'
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err) {
    error.value = err.message
  }

  event.target.value = ''
}

async function deletePhoto() {
  if (!confirm('Are you sure you want to delete your profile photo?')) return

  error.value = null

  try {
    const res = await fetch('/api/profile/photo', {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!res.ok) {
      throw new Error('Failed to delete photo')
    }

    profile.value.photoPath = null
    successMessage.value = 'Photo deleted successfully!'
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err) {
    error.value = err.message
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="profile-content">
    <div v-if="isLoading" class="loading">Loading profile...</div>

    <div v-else-if="error && !profile.handle" class="error-box">
      {{ error }}
    </div>

    <template v-else>
      <div class="profile-header">
        <div class="photo-section">
          <div class="photo-container" @click="triggerPhotoUpload">
            <img
              v-if="photoUrl"
              :src="photoUrl"
              alt="Profile photo"
              class="profile-photo"
            />
            <div v-else class="photo-placeholder">
              {{ profile.firstName?.charAt(0) || profile.handle?.charAt(0) || '?' }}
            </div>
            <div class="photo-overlay">
              <span>Change</span>
            </div>
          </div>
          <input
            ref="photoInput"
            type="file"
            accept="image/*"
            @change="onPhotoSelected"
            class="hidden-input"
          />
          <button v-if="photoUrl" @click.stop="deletePhoto" class="delete-photo-btn">
            Remove Photo
          </button>
        </div>

        <div class="user-info">
          <h1>{{ profile.firstName }} {{ profile.lastName }}</h1>
          <p class="handle">@{{ profile.handle }}</p>
          <p class="member-since">Member since {{ memberSince }}</p>
        </div>
      </div>

      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
      <div v-if="error" class="error-message">{{ error }}</div>

      <div class="profile-card">
        <template v-if="!isEditing">
          <div class="bio-section">
            <h2>About</h2>
            <p v-if="profile.bio" class="bio-text">{{ profile.bio }}</p>
            <p v-else class="bio-empty">No bio yet. Click edit to add one!</p>
          </div>

          <div class="details-section">
            <h2>Details</h2>
            <div class="detail-row">
              <span class="label">Email:</span>
              <span class="value">{{ profile.email }}</span>
            </div>
            <div class="detail-row">
              <span class="label">First Name:</span>
              <span class="value">{{ profile.firstName || 'Not set' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Last Name:</span>
              <span class="value">{{ profile.lastName || 'Not set' }}</span>
            </div>
          </div>

          <button @click="startEdit" class="edit-btn">Edit Profile</button>
        </template>

        <template v-else>
          <form @submit.prevent="saveProfile" class="edit-form">
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                v-model="editForm.firstName"
                type="text"
                placeholder="Enter your first name"
              />
            </div>

            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input
                id="lastName"
                v-model="editForm.lastName"
                type="text"
                placeholder="Enter your last name"
              />
            </div>

            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea
                id="bio"
                v-model="editForm.bio"
                placeholder="Tell us about yourself..."
                rows="4"
                maxlength="500"
              ></textarea>
              <span class="char-count">{{ editForm.bio?.length || 0 }}/500</span>
            </div>

            <div class="form-actions">
              <button type="submit" :disabled="isSaving" class="save-btn">
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
              <button type="button" @click="cancelEdit" class="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-content {
  max-width: 700px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-box {
  background: #ffe0e0;
  color: #c00;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.profile-header {
  display: flex;
  gap: 25px;
  align-items: flex-start;
  margin-bottom: 25px;
}

.photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.photo-container {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid #42b983;
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  background: #42b983;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  text-transform: uppercase;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 0.9rem;
}

.photo-container:hover .photo-overlay {
  opacity: 1;
}

.hidden-input {
  display: none;
}

.delete-photo-btn {
  background: none;
  border: none;
  color: #c00;
  cursor: pointer;
  font-size: 0.8em;
  text-decoration: underline;
}

.user-info h1 {
  margin: 0 0 5px 0;
  font-size: 1.5rem;
  color: #333;
}

.handle {
  color: #42b983;
  font-size: 1rem;
  margin: 0 0 8px 0;
}

.member-since {
  color: #888;
  font-size: 0.85rem;
  margin: 0;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.error-message {
  background: #ffe0e0;
  color: #c00;
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.profile-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.bio-section,
.details-section {
  margin-bottom: 20px;
}

.bio-section h2,
.details-section h2 {
  font-size: 1.1rem;
  color: #333;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.bio-text {
  color: #555;
  line-height: 1.5;
  white-space: pre-wrap;
  margin: 0;
}

.bio-empty {
  color: #999;
  font-style: italic;
  margin: 0;
}

.detail-row {
  display: flex;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #666;
  width: 100px;
  flex-shrink: 0;
}

.value {
  color: #333;
}

.edit-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
}

.edit-btn:hover {
  background: #3aa876;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #42b983;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.char-count {
  font-size: 0.75rem;
  color: #888;
  text-align: right;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.save-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
}

.save-btn:hover:not(:disabled) {
  background: #3aa876;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  background: #eee;
  color: #666;
  border: none;
  padding: 10px 25px;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #ddd;
}
</style>
