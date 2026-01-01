<script setup>
import { ref, onMounted } from 'vue'
import { blog } from '@/stores/blog.js'
import BlogEditor from '@/components/BlogEditor.vue'
import BlogSettings from '@/components/BlogSettings.vue'

const showEditor = ref(false)
const showSettings = ref(false)
const editingPost = ref(null)
const blogSettings = ref(null)

onMounted(async () => {
  blog.fetchPosts()
  await fetchBlogSettings()
})

async function fetchBlogSettings() {
  try {
    const res = await fetch('/api/blog/settings', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      blogSettings.value = data.settings
    }
  } catch (err) {
    console.error('Failed to fetch blog settings:', err)
  }
}

function openSettings() {
  showSettings.value = true
}

function closeSettings() {
  showSettings.value = false
}

function onSettingsSaved(settings) {
  blogSettings.value = settings
  showSettings.value = false
}

const createNewPost = () => {
  editingPost.value = null
  blog.clearCurrentPost()
  showEditor.value = true
}

const editPost = async (post) => {
  await blog.fetchPost(post.id)
  editingPost.value = blog.currentPost
  showEditor.value = true
}

const deletePost = async (post) => {
  if (confirm(`Are you sure you want to delete "${post.title}"?`)) {
    await blog.deletePost(post.id)
  }
}

const closeEditor = () => {
  showEditor.value = false
  editingPost.value = null
  blog.clearCurrentPost()
}

const onPostSaved = () => {
  closeEditor()
  blog.fetchPosts()
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <main class="blog-page page-container">
    <!-- Editor Modal -->
    <BlogEditor
      v-if="showEditor"
      :post="editingPost"
      @close="closeEditor"
      @saved="onPostSaved"
    />

    <!-- Settings Modal -->
    <BlogSettings
      v-if="showSettings"
      @close="closeSettings"
      @saved="onSettingsSaved"
    />

    <!-- Blog Posts List -->
    <div v-else class="blog-container">
      <div class="blog-header">
        <div class="blog-header-left">
          <h1>My Blog</h1>
          <a
            v-if="blogSettings"
            :href="`/b/${blogSettings.blog_url}`"
            target="_blank"
            class="public-blog-link"
          >
            View Public Blog
          </a>
        </div>
        <div class="blog-header-actions">
          <button class="btn-secondary" @click="openSettings">
            Settings
          </button>
          <button class="btn-primary" @click="createNewPost">
            + New Post
          </button>
        </div>
      </div>

      <div v-if="blog.loading" class="loading">
        Loading posts...
      </div>

      <div v-else-if="blog.error" class="error">
        {{ blog.error }}
        <button @click="blog.clearError">Dismiss</button>
      </div>

      <div v-else-if="blog.posts.length === 0" class="empty-state">
        <p>You haven't written any blog posts yet.</p>
        <p>Click "New Post" to get started!</p>
      </div>

      <div v-else class="posts-list">
        <div
          v-for="post in blog.posts"
          :key="post.id"
          class="post-card"
          @click="editPost(post)"
        >
          <div class="post-info">
            <h3 class="post-title">{{ post.title }}</h3>
            <div class="post-meta">
              <span class="post-status" :class="{ published: post.is_published }">
                {{ post.is_published ? 'Published' : 'Draft' }}
              </span>
              <span class="post-date">Updated {{ formatDate(post.updated_at) }}</span>
            </div>
          </div>
          <div class="post-actions" @click.stop>
            <button class="btn-icon" @click="editPost(post)" title="Edit">
              Edit
            </button>
            <button class="btn-icon btn-danger" @click="deletePost(post)" title="Delete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.blog-page {
  max-width: 900px;
  margin: 20px auto;
  padding: 0 20px;
}

.blog-container {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-height: calc(100vh - 140px);
}

.blog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #eee;
}

.blog-header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.blog-header h1 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.public-blog-link {
  color: #42b983;
  text-decoration: none;
  font-size: 0.9rem;
}

.public-blog-link:hover {
  text-decoration: underline;
}

.blog-header-actions {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

.btn-primary {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}

.btn-primary:hover {
  background: #3aa876;
}

.loading,
.error,
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #888;
}

.error {
  color: #c00;
}

.error button {
  margin-top: 10px;
  background: none;
  border: 1px solid #c00;
  color: #c00;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state p {
  margin: 8px 0;
}

.posts-list {
  padding: 15px;
}

.post-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  margin-bottom: 10px;
  background: #f9f9f9;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}

.post-card:hover {
  background: #f0f0f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.post-card:last-child {
  margin-bottom: 0;
}

.post-info {
  flex: 1;
  min-width: 0;
}

.post-title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
}

.post-status {
  padding: 2px 8px;
  border-radius: 4px;
  background: #ffeb99;
  color: #996600;
  font-weight: 500;
}

.post-status.published {
  background: #c8f7c5;
  color: #2e7d32;
}

.post-date {
  color: #888;
}

.post-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 15px;
}

.btn-icon {
  padding: 6px 12px;
  background: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #555;
}

.btn-icon:hover {
  background: #d0d0d0;
}

.btn-danger {
  color: #c00;
}

.btn-danger:hover {
  background: #ffdddd;
}
</style>
