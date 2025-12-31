import { reactive } from 'vue'
import { authFetch } from '../utilities/authFetch'

const state = reactive({
  events: [],
  currentEvent: null,
  currentEventRules: [],
  logs: [],
  logsTotal: 0,
  loading: false,
  error: null
})

export const events = reactive({
  get list() {
    return state.events
  },
  get currentEvent() {
    return state.currentEvent
  },
  get currentEventRules() {
    return state.currentEventRules
  },
  get logs() {
    return state.logs
  },
  get logsTotal() {
    return state.logsTotal
  },
  get loading() {
    return state.loading
  },
  get error() {
    return state.error
  },

  // Fetch all events
  async fetchEvents() {
    state.loading = true
    try {
      const res = await authFetch('/api/event/admin/all')
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      state.events = data.events
    } catch (err) {
      console.error('Error fetching events:', err)
      state.error = err.message
    } finally {
      state.loading = false
    }
  },

  // Fetch single event with rules
  async fetchEvent(id) {
    state.loading = true
    try {
      const res = await authFetch(`/api/event/admin/${id}`)
      if (!res.ok) throw new Error('Failed to fetch event')
      const data = await res.json()
      state.currentEvent = data.event
      state.currentEventRules = data.rules
    } catch (err) {
      console.error('Error fetching event:', err)
      state.error = err.message
    } finally {
      state.loading = false
    }
  },

  // Create event
  async createEvent(eventData) {
    try {
      const res = await authFetch('/api/event/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create event')
      }
      const data = await res.json()
      state.events.push(data.event)
      return data.event
    } catch (err) {
      console.error('Error creating event:', err)
      throw err
    }
  },

  // Update event
  async updateEvent(id, eventData) {
    try {
      const res = await authFetch(`/api/event/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      if (!res.ok) throw new Error('Failed to update event')
      const data = await res.json()
      const index = state.events.findIndex(e => e.id === id)
      if (index !== -1) {
        state.events[index] = data.event
      }
      if (state.currentEvent?.id === id) {
        state.currentEvent = data.event
      }
      return data.event
    } catch (err) {
      console.error('Error updating event:', err)
      throw err
    }
  },

  // Delete event
  async deleteEvent(id) {
    try {
      const res = await authFetch(`/api/event/admin/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete event')
      state.events = state.events.filter(e => e.id !== id)
      if (state.currentEvent?.id === id) {
        state.currentEvent = null
        state.currentEventRules = []
      }
    } catch (err) {
      console.error('Error deleting event:', err)
      throw err
    }
  },

  // Create rule
  async createRule(eventId, ruleData) {
    try {
      const res = await authFetch(`/api/event/admin/${eventId}/rule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to create rule')
      }
      const data = await res.json()
      state.currentEventRules.push(data.rule)
      return data.rule
    } catch (err) {
      console.error('Error creating rule:', err)
      throw err
    }
  },

  // Update rule
  async updateRule(ruleId, ruleData) {
    try {
      const res = await authFetch(`/api/event/admin/rule/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      })
      if (!res.ok) throw new Error('Failed to update rule')
      const data = await res.json()
      const index = state.currentEventRules.findIndex(r => r.id === ruleId)
      if (index !== -1) {
        state.currentEventRules[index] = data.rule
      }
      return data.rule
    } catch (err) {
      console.error('Error updating rule:', err)
      throw err
    }
  },

  // Delete rule
  async deleteRule(ruleId) {
    try {
      const res = await authFetch(`/api/event/admin/rule/${ruleId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete rule')
      state.currentEventRules = state.currentEventRules.filter(r => r.id !== ruleId)
    } catch (err) {
      console.error('Error deleting rule:', err)
      throw err
    }
  },

  // Fetch event logs
  async fetchLogs(options = {}) {
    state.loading = true
    try {
      const params = new URLSearchParams()
      if (options.event_id) params.append('event_id', options.event_id)
      if (options.user_id) params.append('user_id', options.user_id)
      if (options.limit) params.append('limit', options.limit)
      if (options.offset) params.append('offset', options.offset)

      const res = await authFetch(`/api/event/admin/logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      state.logs = data.logs
      state.logsTotal = data.total
    } catch (err) {
      console.error('Error fetching logs:', err)
      state.error = err.message
    } finally {
      state.loading = false
    }
  },

  // Clear current event
  clearCurrentEvent() {
    state.currentEvent = null
    state.currentEventRules = []
  },

  // Clear error
  clearError() {
    state.error = null
  }
})
