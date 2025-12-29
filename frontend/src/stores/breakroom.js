import { reactive } from 'vue'

const state = reactive({
  blocks: [],
  loading: false,
  error: null
})

export const breakroom = reactive({
  get blocks() {
    return state.blocks
  },
  get loading() {
    return state.loading
  },
  get error() {
    return state.error
  },

  // Fetch user's layout
  async fetchLayout() {
    state.loading = true
    state.error = null

    try {
      const res = await fetch('/api/breakroom/layout', {
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error('Failed to fetch layout')
      }

      const data = await res.json()
      state.blocks = data.blocks.map(block => ({
        ...block,
        // vue-grid-layout uses 'i' as the unique identifier
        i: String(block.id)
      }))
    } catch (err) {
      console.error('Error fetching layout:', err)
      state.error = err.message
    } finally {
      state.loading = false
    }
  },

  // Add a new block
  async addBlock(blockType, contentId = null, options = {}) {
    try {
      const res = await fetch('/api/breakroom/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          block_type: blockType,
          content_id: contentId,
          x: options.x || 0,
          y: options.y || 0,
          w: options.w || 2,
          h: options.h || 2,
          title: options.title || null,
          settings: options.settings || null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create block')
      }

      const data = await res.json()
      const newBlock = {
        ...data.block,
        i: String(data.block.id)
      }
      state.blocks.push(newBlock)
      return newBlock
    } catch (err) {
      console.error('Error creating block:', err)
      state.error = err.message
      throw err
    }
  },

  // Update a single block
  async updateBlock(id, updates) {
    try {
      const res = await fetch(`/api/breakroom/blocks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to update block')
      }

      const data = await res.json()
      const index = state.blocks.findIndex(b => b.id === id)
      if (index !== -1) {
        state.blocks[index] = {
          ...data.block,
          i: String(data.block.id)
        }
      }
      return data.block
    } catch (err) {
      console.error('Error updating block:', err)
      state.error = err.message
      throw err
    }
  },

  // Batch save layout positions (for drag-drop)
  async saveLayout(blocks) {
    try {
      const layoutData = blocks.map(b => ({
        id: parseInt(b.i),
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h
      }))

      const res = await fetch('/api/breakroom/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ blocks: layoutData })
      })

      if (!res.ok) {
        throw new Error('Failed to save layout')
      }

      // Update local state
      blocks.forEach(b => {
        const index = state.blocks.findIndex(sb => sb.i === b.i)
        if (index !== -1) {
          state.blocks[index].x = b.x
          state.blocks[index].y = b.y
          state.blocks[index].w = b.w
          state.blocks[index].h = b.h
        }
      })
    } catch (err) {
      console.error('Error saving layout:', err)
      state.error = err.message
      throw err
    }
  },

  // Remove a block
  async removeBlock(id) {
    try {
      const res = await fetch(`/api/breakroom/blocks/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to delete block')
      }

      state.blocks = state.blocks.filter(b => b.id !== id)
    } catch (err) {
      console.error('Error deleting block:', err)
      state.error = err.message
      throw err
    }
  },

  // Clear error
  clearError() {
    state.error = null
  }
})
