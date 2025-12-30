import { reactive } from 'vue'
import { authFetch } from '../utilities/authFetch'

const state = reactive({
  posts: [],
  currentPost: null,
  loading: false,
  saving: false,
  error: null
})

export const blog = reactive({
  get posts() {
    return state.posts
  },
  get currentPost() {
    return state.currentPost
  },
  get loading() {
    return state.loading
  },
  get saving() {
    return state.saving
  },
  get error() {
    return state.error
  },

  // Fetch all posts for current user
  async fetchPosts() {
    state.loading = true
    state.error = null

    try {
      const res = await authFetch('/api/blog/posts')

      if (!res.ok) {
        throw new Error('Failed to fetch posts')
      }

      const data = await res.json()
      state.posts = data.posts
    } catch (err) {
      console.error('Error fetching posts:', err)
      state.error = err.message
    } finally {
      state.loading = false
    }
  },

  // Fetch a single post
  async fetchPost(id) {
    state.loading = true
    state.error = null

    try {
      const res = await authFetch(`/api/blog/posts/${id}`)

      if (!res.ok) {
        throw new Error('Failed to fetch post')
      }

      const data = await res.json()
      state.currentPost = data.post
      return data.post
    } catch (err) {
      console.error('Error fetching post:', err)
      state.error = err.message
      return null
    } finally {
      state.loading = false
    }
  },

  // Create a new post
  async createPost(title, content = '', isPublished = false) {
    state.saving = true
    state.error = null

    try {
      const res = await authFetch('/api/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, isPublished })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create post')
      }

      const data = await res.json()
      state.posts.unshift(data.post)
      state.currentPost = data.post
      return data.post
    } catch (err) {
      console.error('Error creating post:', err)
      state.error = err.message
      throw err
    } finally {
      state.saving = false
    }
  },

  // Update a post
  async updatePost(id, title, content, isPublished) {
    state.saving = true
    state.error = null

    try {
      const res = await authFetch(`/api/blog/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, isPublished })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to update post')
      }

      const data = await res.json()

      // Update in posts list
      const index = state.posts.findIndex(p => p.id === id)
      if (index !== -1) {
        state.posts[index] = data.post
      }

      // Update current post
      if (state.currentPost && state.currentPost.id === id) {
        state.currentPost = data.post
      }

      return data.post
    } catch (err) {
      console.error('Error updating post:', err)
      state.error = err.message
      throw err
    } finally {
      state.saving = false
    }
  },

  // Delete a post
  async deletePost(id) {
    state.error = null

    try {
      const res = await authFetch(`/api/blog/posts/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to delete post')
      }

      state.posts = state.posts.filter(p => p.id !== id)

      if (state.currentPost && state.currentPost.id === id) {
        state.currentPost = null
      }
    } catch (err) {
      console.error('Error deleting post:', err)
      state.error = err.message
      throw err
    }
  },

  // Upload image for blog content
  async uploadImage(file) {
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await authFetch('/api/blog/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to upload image')
      }

      const data = await res.json()
      return data.url
    } catch (err) {
      console.error('Error uploading image:', err)
      throw err
    }
  },

  // Set current post (for editing)
  setCurrentPost(post) {
    state.currentPost = post
  },

  // Clear current post
  clearCurrentPost() {
    state.currentPost = null
  },

  // Clear error
  clearError() {
    state.error = null
  }
})
