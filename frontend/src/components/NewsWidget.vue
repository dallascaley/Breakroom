<script setup>
import { ref, onMounted } from 'vue'

const news = ref([])
const loading = ref(true)
const error = ref(null)
const feedTitle = ref('News')

const fetchNews = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/breakroom/news', {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch news')
    }

    const data = await response.json()
    feedTitle.value = data.title || 'News'
    news.value = data.items || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

const openLink = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  fetchNews()
})
</script>

<template>
  <div class="news-widget">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading news...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">!</span>
      <p>{{ error }}</p>
      <button @click="fetchNews">Retry</button>
    </div>

    <!-- News list -->
    <div v-else-if="news.length > 0" class="news-list">
      <div
        v-for="(item, index) in news"
        :key="index"
        class="news-item"
        @click="openLink(item.link)"
      >
        <div class="news-header">
          <span class="news-source">{{ item.source }}</span>
          <span class="news-time">{{ formatTime(item.pubDate) }}</span>
        </div>
        <h3 class="news-title">{{ item.title }}</h3>
        <p v-if="item.description" class="news-desc">{{ item.description }}</p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <p>No news available</p>
    </div>
  </div>
</template>

<style scoped>
.news-widget {
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
  border-top-color: #d32f2f;
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
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-state button:hover {
  background: #b71c1c;
}

.news-list {
  padding: 8px;
}

.news-item {
  background: white;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.1s;
  border-left: 3px solid #d32f2f;
}

.news-item:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.news-item:last-child {
  margin-bottom: 0;
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.news-source {
  font-size: 0.7rem;
  font-weight: 600;
  color: #d32f2f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.news-time {
  font-size: 0.7rem;
  color: #999;
}

.news-title {
  margin: 0 0 4px;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
  color: #222;
}

.news-desc {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
}

.empty-state p {
  margin: 0;
}
</style>
