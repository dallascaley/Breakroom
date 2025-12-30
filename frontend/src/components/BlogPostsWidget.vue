<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authFetch } from '../utilities/authFetch'

const router = useRouter()
const posts = ref([])
const loading = ref(true)
const error = ref(null)

const fetchPosts = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await authFetch('/api/blog/feed')

    if (!response.ok) {
      throw new Error('Failed to fetch posts')
    }

    const data = await response.json()
    posts.value = data.posts || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

const viewPost = (postId) => {
  router.push(`/blog/view/${postId}`)
}

const goToBlog = () => {
  router.push('/blog')
}

const stripHtml = (html) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

const getAuthorName = (post) => {
  if (post.author_first_name || post.author_last_name) {
    return `${post.author_first_name || ''} ${post.author_last_name || ''}`.trim()
  }
  return post.author_handle
}

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="blog-posts-widget">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading posts...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">!</span>
      <p>{{ error }}</p>
      <button @click="fetchPosts">Retry</button>
    </div>

    <!-- Posts list -->
    <div v-else-if="posts.length > 0" class="posts-list">
      <div
        v-for="post in posts.slice(0, 5)"
        :key="post.id"
        class="post-item"
        @click="viewPost(post.id)"
      >
        <div class="post-header">
          <span class="post-author">{{ getAuthorName(post) }}</span>
          <span class="post-date">{{ formatDate(post.updated_at) }}</span>
        </div>
        <h3 class="post-title">{{ post.title }}</h3>
        <p class="post-preview">{{ stripHtml(post.content) }}</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <p>No blog posts yet</p>
      <button @click="goToBlog" class="create-btn">Create your first post</button>
    </div>
  </div>
</template>

<style scoped>
.blog-posts-widget {
  height: 100%;
  overflow-y: auto;
  background: #f8f9fa;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
  gap: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e0e0e0;
  border-top-color: #42b983;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;
  color: #c00;
}

.error-icon {
  width: 32px;
  height: 32px;
  background: #ffe0e0;
  color: #c00;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 8px;
}

.error-state button {
  margin-top: 12px;
  padding: 6px 16px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-state button:hover {
  background: #3aa876;
}

.posts-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  box-sizing: border-box;
}

.post-item {
  background: white;
  border-radius: 6px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.1s;
  border-left: 3px solid #42b983;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.post-item:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.post-author {
  font-size: 0.7rem;
  font-weight: 600;
  color: #42b983;
}

.post-date {
  font-size: 0.7rem;
  color: #999;
}

.post-title {
  margin: 0 0 6px 0;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
  color: #222;
  flex-shrink: 0;
}

.post-preview {
  margin: 0;
  font-size: 0.75rem;
  color: #666;
  line-height: 1.4;
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 10;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
  text-align: center;
  padding: 20px;
}

.empty-state p {
  margin: 0 0 12px;
}

.create-btn {
  padding: 8px 16px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.create-btn:hover {
  background: #3aa876;
}
</style>
