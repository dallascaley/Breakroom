/**
 * Frontend Event Service
 * Provides utilities for triggering events from the frontend
 */

import { authFetch } from './authFetch'

/**
 * Trigger an event on the backend
 * @param {string} code - Event code (e.g., 'breakpoint_changed')
 * @param {Object} data - Event-specific data
 * @returns {Promise<Object>} - Result from the backend
 */
export async function triggerEvent(code, data = {}) {
  try {
    const res = await authFetch('/api/event/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, data })
    })

    if (!res.ok) {
      const error = await res.json()
      console.error('Event trigger failed:', error.message)
      return { triggered: false, error: error.message }
    }

    return await res.json()
  } catch (err) {
    console.error('Event trigger error:', err)
    return { triggered: false, error: err.message }
  }
}

/**
 * Create a debounced event trigger
 * Useful for events that fire frequently (e.g., resize, scroll)
 * Only triggers once after the delay has passed without new calls
 *
 * @param {string} code - Event code
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} - Debounced trigger function
 */
export function createDebouncedEventTrigger(code, delay = 500) {
  let timeoutId = null

  return function(data = {}) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      triggerEvent(code, data)
      timeoutId = null
    }, delay)
  }
}

/**
 * Create a throttled event trigger
 * Ensures the event only fires at most once per interval
 *
 * @param {string} code - Event code
 * @param {number} interval - Minimum time between triggers in milliseconds
 * @returns {Function} - Throttled trigger function
 */
export function createThrottledEventTrigger(code, interval = 1000) {
  let lastTrigger = 0
  let pendingData = null
  let timeoutId = null

  return function(data = {}) {
    const now = Date.now()

    if (now - lastTrigger >= interval) {
      // Enough time has passed, trigger immediately
      triggerEvent(code, data)
      lastTrigger = now
      pendingData = null
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    } else {
      // Store the latest data and schedule a trigger
      pendingData = data
      if (!timeoutId) {
        const remaining = interval - (now - lastTrigger)
        timeoutId = setTimeout(() => {
          if (pendingData !== null) {
            triggerEvent(code, pendingData)
            lastTrigger = Date.now()
            pendingData = null
          }
          timeoutId = null
        }, remaining)
      }
    }
  }
}

/**
 * Create a rate-limited event trigger
 * Allows a maximum number of triggers per time window
 *
 * @param {string} code - Event code
 * @param {number} maxTriggers - Maximum triggers per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Rate-limited trigger function
 */
export function createRateLimitedEventTrigger(code, maxTriggers = 5, windowMs = 60000) {
  const triggers = []

  return function(data = {}) {
    const now = Date.now()

    // Remove old triggers outside the window
    while (triggers.length > 0 && triggers[0] < now - windowMs) {
      triggers.shift()
    }

    if (triggers.length < maxTriggers) {
      triggers.push(now)
      triggerEvent(code, data)
      return true
    }

    console.warn(`Event ${code} rate limited`)
    return false
  }
}
