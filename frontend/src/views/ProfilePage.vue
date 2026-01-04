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
    return `/api/uploads/${profile.value.photoPath}`
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

  // Reset file input
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
  <section class="profile-page">
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
          <button v-if="photoUrl" @click="deletePhoto" class="delete-photo-btn">
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

      <div class="profile-content">
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
  </section>
</template>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 30px auto;
  padding: 0 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}

.error-box {
  background: var(--color-error-bg);
  color: var(--color-error);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.profile-header {
  display: flex;
  gap: 30px;
  align-items: flex-start;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 30px;
}

.photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.photo-container {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid var(--color-accent);
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  text-transform: uppercase;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-overlay);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
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
  color: var(--color-error);
  cursor: pointer;
  font-size: 0.85em;
  text-decoration: underline;
}

.user-info h1 {
  margin: 0 0 5px 0;
  font-size: 1.8rem;
  color: var(--color-text);
}

.handle {
  color: var(--color-accent);
  font-size: 1.1rem;
  margin: 0 0 10px 0;
}

.member-since {
  color: var(--color-text-light);
  font-size: 0.9rem;
  margin: 0;
}

.success-message {
  background: var(--color-success-bg);
  color: var(--color-success);
  padding: 12px 20px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.error-message {
  background: var(--color-error-bg);
  color: var(--color-error);
  padding: 12px 20px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.profile-content {
  background: var(--color-background-card);
  border-radius: 10px;
  padding: 25px;
  box-shadow: var(--shadow-md);
}

.bio-section,
.details-section {
  margin-bottom: 25px;
}

.bio-section h2,
.details-section h2 {
  font-size: 1.2rem;
  color: var(--color-text);
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
}

.bio-text {
  color: var(--color-text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.bio-empty {
  color: var(--color-text-light);
  font-style: italic;
}

.detail-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-background-soft);
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: var(--color-text-muted);
  width: 120px;
  flex-shrink: 0;
}

.value {
  color: var(--color-text);
}

.edit-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.edit-btn:hover {
  background: var(--color-accent-hover);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group textarea {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--color-background-input);
  color: var(--color-text);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.char-count {
  font-size: 0.8rem;
  color: var(--color-text-light);
  text-align: right;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.save-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

.save-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.save-btn:disabled {
  background: var(--color-button-secondary);
  cursor: not-allowed;
}

.cancel-btn {
  background: var(--color-button-secondary);
  color: var(--color-text);
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

.cancel-btn:hover {
  background: var(--color-button-secondary-hover);
}

@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .detail-row {
    flex-direction: column;
    gap: 4px;
  }

  .label {
    width: auto;
  }
}
</style>
