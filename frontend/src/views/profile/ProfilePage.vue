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
  workBio: '',
  photoPath: null,
  createdAt: null,
  friendCount: 0,
  skills: []
})

const editForm = ref({
  firstName: '',
  lastName: '',
  bio: '',
  workBio: ''
})

// Skills management
const skillInput = ref('')
const skillSuggestions = ref([])
const showSuggestions = ref(false)
const isAddingSkill = ref(false)
let skillSearchTimeout = null

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
    bio: profile.value.bio || '',
    workBio: profile.value.workBio || ''
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
    profile.value.workBio = editForm.value.workBio
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

// Skills functions
async function searchSkills() {
  if (skillInput.value.trim().length === 0) {
    skillSuggestions.value = []
    showSuggestions.value = false
    return
  }

  try {
    const res = await fetch(`/api/profile/skills/search?q=${encodeURIComponent(skillInput.value)}`, {
      credentials: 'include'
    })

    if (res.ok) {
      const data = await res.json()
      skillSuggestions.value = data.skills
      showSuggestions.value = true
    }
  } catch (err) {
    console.error('Error searching skills:', err)
  }
}

function onSkillInput() {
  if (skillSearchTimeout) {
    clearTimeout(skillSearchTimeout)
  }
  skillSearchTimeout = setTimeout(searchSkills, 300)
}

async function addSkill(skillName = null) {
  const name = skillName || skillInput.value.trim()
  if (!name) return

  // Check if already has this skill
  if (profile.value.skills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    error.value = 'Skill already added'
    setTimeout(() => { error.value = null }, 2000)
    return
  }

  isAddingSkill.value = true
  error.value = null

  try {
    const res = await fetch('/api/profile/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Failed to add skill')
    }

    const data = await res.json()
    profile.value.skills.push(data.skill)
    skillInput.value = ''
    skillSuggestions.value = []
    showSuggestions.value = false
  } catch (err) {
    error.value = err.message
    setTimeout(() => { error.value = null }, 3000)
  } finally {
    isAddingSkill.value = false
  }
}

function selectSuggestion(skill) {
  addSkill(skill.name)
}

async function removeSkill(skillId) {
  try {
    const res = await fetch(`/api/profile/skills/${skillId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!res.ok) {
      throw new Error('Failed to remove skill')
    }

    profile.value.skills = profile.value.skills.filter(s => s.id !== skillId)
  } catch (err) {
    error.value = err.message
    setTimeout(() => { error.value = null }, 3000)
  }
}

function hideSuggestions() {
  // Small delay to allow click on suggestion
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
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
          <p class="friend-count">{{ profile.friendCount }} {{ profile.friendCount === 1 ? 'friend' : 'friends' }}</p>
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

          <div class="work-bio-section">
            <h2>Work Biography</h2>
            <p v-if="profile.workBio" class="bio-text">{{ profile.workBio }}</p>
            <p v-else class="bio-empty">No work biography yet. Click edit to add one!</p>
          </div>

          <div class="skills-section">
            <h2>Skills</h2>
            <div class="skills-list" v-if="profile.skills && profile.skills.length > 0">
              <span
                v-for="skill in profile.skills"
                :key="skill.id"
                class="skill-tag"
              >
                {{ skill.name }}
                <button @click="removeSkill(skill.id)" class="remove-skill" title="Remove skill">&times;</button>
              </span>
            </div>
            <p v-else class="bio-empty">No skills added yet.</p>

            <div class="add-skill-form">
              <div class="skill-input-wrapper">
                <input
                  v-model="skillInput"
                  type="text"
                  placeholder="Add a skill..."
                  @input="onSkillInput"
                  @blur="hideSuggestions"
                  @keyup.enter="addSkill()"
                  maxlength="100"
                />
                <div v-if="showSuggestions && skillSuggestions.length > 0" class="suggestions-dropdown">
                  <div
                    v-for="skill in skillSuggestions"
                    :key="skill.id"
                    class="suggestion-item"
                    @mousedown="selectSuggestion(skill)"
                  >
                    {{ skill.name }}
                  </div>
                </div>
              </div>
              <button
                @click="addSkill()"
                :disabled="!skillInput.trim() || isAddingSkill"
                class="add-skill-btn"
              >
                {{ isAddingSkill ? 'Adding...' : 'Add' }}
              </button>
            </div>
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

            <div class="form-group">
              <label for="workBio">Work Biography</label>
              <textarea
                id="workBio"
                v-model="editForm.workBio"
                placeholder="Describe your professional background, experience, and career journey..."
                rows="4"
                maxlength="1000"
              ></textarea>
              <span class="char-count">{{ editForm.workBio?.length || 0 }}/1000</span>
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
  margin: 0 0 5px 0;
}

.friend-count {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
  font-weight: 500;
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
  padding-top: 10px;
}

.bio-section,
.work-bio-section,
.skills-section,
.details-section {
  margin-bottom: 20px;
}

.bio-section h2,
.work-bio-section h2,
.skills-section h2,
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

/* Skills styles */
.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.skill-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #e8f5e9;
  color: #2e7d32;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.remove-skill {
  background: none;
  border: none;
  color: #2e7d32;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}

.remove-skill:hover {
  opacity: 1;
  color: #c00;
}

.add-skill-form {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.skill-input-wrapper {
  position: relative;
  flex: 1;
}

.skill-input-wrapper input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.skill-input-wrapper input:focus {
  outline: none;
  border-color: #42b983;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 0.9rem;
}

.suggestion-item:hover {
  background: #f5f5f5;
}

.add-skill-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
}

.add-skill-btn:hover:not(:disabled) {
  background: #3aa876;
}

.add-skill-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
