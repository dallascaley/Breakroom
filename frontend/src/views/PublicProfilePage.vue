<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isLoading = ref(true)
const error = ref(null)

const profile = ref({
  handle: '',
  firstName: '',
  lastName: '',
  bio: '',
  photoPath: null,
  createdAt: null,
  friendCount: 0
})

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

const displayName = computed(() => {
  if (profile.value.firstName || profile.value.lastName) {
    return `${profile.value.firstName || ''} ${profile.value.lastName || ''}`.trim()
  }
  return profile.value.handle
})

async function fetchProfile() {
  isLoading.value = true
  error.value = null

  try {
    const handle = route.params.handle
    const res = await fetch(`/api/profile/user/${handle}`, {
      credentials: 'include'
    })

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('User not found')
      }
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

watch(() => route.params.handle, () => {
  fetchProfile()
})

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="page-container public-profile-page">
    <div v-if="isLoading" class="loading">Loading profile...</div>

    <div v-else-if="error" class="error-box">
      {{ error }}
    </div>

    <template v-else>
      <div class="profile-header">
        <div class="photo-section">
          <div class="photo-container">
            <img
              v-if="photoUrl"
              :src="photoUrl"
              alt="Profile photo"
              class="profile-photo"
            />
            <div v-else class="photo-placeholder">
              {{ profile.firstName?.charAt(0) || profile.handle?.charAt(0) || '?' }}
            </div>
          </div>
        </div>

        <div class="user-info">
          <h1>{{ displayName }}</h1>
          <p class="handle">@{{ profile.handle }}</p>
          <p class="member-since">Member since {{ memberSince }}</p>
          <p class="friend-count">{{ profile.friendCount }} {{ profile.friendCount === 1 ? 'friend' : 'friends' }}</p>
        </div>
      </div>

      <div class="profile-card">
        <div class="bio-section">
          <h2>About</h2>
          <p v-if="profile.bio" class="bio-text">{{ profile.bio }}</p>
          <p v-else class="bio-empty">This user hasn't added a bio yet.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.public-profile-page {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
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

.profile-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
}

.bio-section h2 {
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
</style>
