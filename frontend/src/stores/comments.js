import { reactive } from 'vue'
import { authFetch } from '../utilities/authFetch'

const state = reactive({
  // Map of postId -> comments array
  commentsByPost: {},
  loading: false,
  submitting: false,
  error: null
})

export const comments = reactive({
  get loading() {
    return state.loading
  },
  get submitting() {
    return state.submitting
  },
  get error() {
    return state.error
  },

  // Get comments for a specific post
  getComments(postId) {
    return state.commentsByPost[postId] || []
  },

  // Fetch all comments for a post
  async fetchComments(postId) {
    state.loading = true
    state.error = null

    try {
      const res = await fetch(`/api/comments/${postId}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error('Failed to fetch comments')
      }

      const data = await res.json()
      state.commentsByPost[postId] = data.comments
      return data.comments
    } catch (err) {
      console.error('Error fetching comments:', err)
      state.error = err.message
      return []
    } finally {
      state.loading = false
    }
  },

  // Add a new comment
  async addComment(postId, content, parentId = null) {
    state.submitting = true
    state.error = null

    try {
      const res = await authFetch(`/api/comments/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to add comment')
      }

      const data = await res.json()
      // Don't add locally - let socket handle it for real-time sync
      return data.comment
    } catch (err) {
      console.error('Error adding comment:', err)
      state.error = err.message
      throw err
    } finally {
      state.submitting = false
    }
  },

  // Update a comment
  async updateComment(commentId, content) {
    state.submitting = true
    state.error = null

    try {
      const res = await authFetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to update comment')
      }

      const data = await res.json()
      return data.comment
    } catch (err) {
      console.error('Error updating comment:', err)
      state.error = err.message
      throw err
    } finally {
      state.submitting = false
    }
  },

  // Delete a comment
  async deleteComment(commentId) {
    state.error = null

    try {
      const res = await authFetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to delete comment')
      }

      return true
    } catch (err) {
      console.error('Error deleting comment:', err)
      state.error = err.message
      throw err
    }
  },

  // Handle new comment from socket
  handleNewComment(postId, comment) {
    if (!state.commentsByPost[postId]) {
      state.commentsByPost[postId] = []
    }

    // Check for duplicate
    const exists = this._findComment(state.commentsByPost[postId], comment.id)
    if (exists) return

    if (comment.parentId) {
      // Add as reply to parent
      const parent = this._findComment(state.commentsByPost[postId], comment.parentId)
      if (parent) {
        if (!parent.replies) parent.replies = []
        parent.replies.push(comment)
      } else {
        // Parent not found, add as top-level
        state.commentsByPost[postId].push(comment)
      }
    } else {
      // Add as top-level comment
      state.commentsByPost[postId].push(comment)
    }
  },

  // Handle comment update from socket
  handleCommentUpdated(postId, updatedComment) {
    if (!state.commentsByPost[postId]) return

    const existing = this._findComment(state.commentsByPost[postId], updatedComment.id)
    if (existing) {
      Object.assign(existing, updatedComment)
    }
  },

  // Handle comment deletion from socket
  handleCommentDeleted(postId, commentId) {
    if (!state.commentsByPost[postId]) return

    this._removeComment(state.commentsByPost[postId], commentId)
  },

  // Helper: Find a comment by ID (recursively searches replies)
  _findComment(comments, id) {
    for (const comment of comments) {
      if (comment.id === id) return comment
      if (comment.replies) {
        const found = this._findComment(comment.replies, id)
        if (found) return found
      }
    }
    return null
  },

  // Helper: Remove a comment by ID (recursively searches replies)
  _removeComment(comments, id) {
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].id === id) {
        comments.splice(i, 1)
        return true
      }
      if (comments[i].replies) {
        if (this._removeComment(comments[i].replies, id)) return true
      }
    }
    return false
  },

  // Clear comments for a post
  clearComments(postId) {
    delete state.commentsByPost[postId]
  },

  // Clear error
  clearError() {
    state.error = null
  }
})
