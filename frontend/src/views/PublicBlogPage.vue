<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const blog = ref(null)
const posts = ref([])
const currentPost = ref(null)
const loading = ref(true)
const error = ref('')

const blogUrl = computed(() => route.params.blogUrl)
const postId = computed(() => route.params.postId)

const authorName = computed(() => {
  if (!blog.value?.author) return ''
  const { first_name, last_name, handle } = blog.value.author
  if (first_name || last_name) {
    return `${first_name || ''} ${last_name || ''}`.trim()
  }
  return handle
})

const authorPhotoUrl = computed(() => {
  if (!blog.value?.author?.photo_path) return null
  return `/api/uploads/${blog.value.author.photo_path}`
})

onMounted(() => {
  fetchBlog()
})

watch([blogUrl, postId], () => {
  if (postId.value && posts.value.length > 0) {
    selectPostById(postId.value)
  } else if (!postId.value && posts.value.length > 0) {
    currentPost.value = posts.value[0]
  } else {
    fetchBlog()
  }
})

async function fetchBlog() {
  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`/api/blog/public/${blogUrl.value}`)
    if (!res.ok) {
      if (res.status === 404) {
        error.value = 'Blog not found'
      } else {
        error.value = 'Failed to load blog'
      }
      return
    }

    const data = await res.json()
    blog.value = data.blog
    posts.value = data.posts

    // Select post based on URL or default to most recent
    if (postId.value) {
      selectPostById(postId.value)
    } else if (posts.value.length > 0) {
      currentPost.value = posts.value[0]
    }
  } catch (err) {
    console.error('Error fetching blog:', err)
    error.value = 'Failed to load blog'
  } finally {
    loading.value = false
  }
}

function selectPostById(id) {
  const post = posts.value.find(p => p.id === parseInt(id))
  if (post) {
    currentPost.value = post
  } else {
    error.value = 'Post not found'
  }
}

function selectPost(post) {
  currentPost.value = post
  router.push({ name: 'publicBlogPost', params: { blogUrl: blogUrl.value, postId: post.id } })
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function goToAuthorProfile() {
  if (blog.value?.author?.handle) {
    router.push({ name: 'publicProfile', params: { handle: blog.value.author.handle } })
  }
}
</script>

<template>
  <main class="public-blog-page">
    <div v-if="loading" class="loading">
      Loading blog...
    </div>

    <div v-else-if="error" class="error-container">
      <p class="error">{{ error }}</p>
      <router-link to="/" class="back-link">Go to homepage</router-link>
    </div>

    <div v-else-if="blog" class="blog-container">
      <!-- Author Header -->
      <header class="blog-header" @click="goToAuthorProfile">
        <div class="author-photo">
          <img v-if="authorPhotoUrl" :src="authorPhotoUrl" :alt="authorName" />
          <div v-else class="photo-placeholder">{{ blog.author?.handle?.charAt(0)?.toUpperCase() || '?' }}</div>
        </div>
        <div class="author-info">
          <h1 class="blog-title">{{ blog.blog_name }}</h1>
          <p class="author-name">by {{ authorName }}</p>
          <p v-if="blog.author?.bio" class="author-bio">{{ blog.author.bio }}</p>
        </div>
      </header>

      <div class="blog-content">
        <!-- Sidebar with post list -->
        <aside class="posts-sidebar">
          <h3>Posts</h3>
          <div v-if="posts.length === 0" class="no-posts">
            No published posts yet.
          </div>
          <ul v-else class="posts-list">
            <li
              v-for="post in posts"
              :key="post.id"
              :class="{ active: currentPost?.id === post.id }"
              @click="selectPost(post)"
            >
              <span class="post-title">{{ post.title }}</span>
              <span class="post-date">{{ formatDate(post.updated_at) }}</span>
            </li>
          </ul>
        </aside>

        <!-- Main post content -->
        <article v-if="currentPost" class="post-content">
          <h2 class="post-title">{{ currentPost.title }}</h2>
          <p class="post-meta">
            {{ formatDate(currentPost.updated_at) }}
          </p>
          <div class="post-body" v-html="currentPost.content"></div>
        </article>

        <div v-else class="no-post-selected">
          <p>Select a post from the sidebar to read.</p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.public-blog-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.loading,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: #666;
}

.error {
  color: #c00;
  margin-bottom: 20px;
}

.back-link {
  color: #42b983;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.blog-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 30px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.blog-header:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.author-photo {
  flex-shrink: 0;
}

.author-photo img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.photo-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #42b983;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.author-info {
  flex: 1;
}

.blog-title {
  margin: 0 0 5px;
  font-size: 1.8rem;
  color: #333;
}

.author-name {
  margin: 0 0 8px;
  color: #666;
  font-size: 1rem;
}

.author-bio {
  margin: 0;
  color: #888;
  font-size: 0.9rem;
  line-height: 1.5;
}

.blog-content {
  display: flex;
  gap: 20px;
}

.posts-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 20px;
}

.posts-sidebar h3 {
  margin: 0 0 15px;
  color: #333;
  font-size: 1.1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.no-posts {
  color: #888;
  font-size: 0.9rem;
}

.posts-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.posts-list li {
  padding: 12px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 5px;
}

.posts-list li:hover {
  background: #f0f0f0;
}

.posts-list li.active {
  background: #e8f5e9;
}

.posts-list .post-title {
  display: block;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.posts-list .post-date {
  display: block;
  font-size: 0.8rem;
  color: #888;
}

.post-content {
  flex: 1;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 30px;
  min-width: 0;
}

.post-content .post-title {
  margin: 0 0 10px;
  font-size: 2rem;
  color: #333;
}

.post-meta {
  color: #888;
  font-size: 0.9rem;
  margin: 0 0 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.post-body {
  line-height: 1.8;
  color: #444;
  font-size: 1.05rem;
}

.post-body :deep(h1),
.post-body :deep(h2),
.post-body :deep(h3) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: #333;
}

.post-body :deep(p) {
  margin: 1em 0;
}

.post-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1em 0;
}

.post-body :deep(a) {
  color: #42b983;
}

.post-body :deep(blockquote) {
  border-left: 4px solid #42b983;
  margin: 1em 0;
  padding: 0.5em 1em;
  background: #f9f9f9;
  color: #666;
}

.post-body :deep(code) {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.post-body :deep(pre) {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
}

.post-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.no-post-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 60px;
  color: #888;
}

/* Responsive */
@media (max-width: 768px) {
  .blog-content {
    flex-direction: column;
  }

  .posts-sidebar {
    width: 100%;
    position: static;
  }

  .blog-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>
