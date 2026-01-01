// Event Service - Tracks browser events and triggers backend notifications

let lastBreakpoint = null
let debounceTimer = null
let isInitialized = false

// Breakpoint configuration (matches BreakroomPage.vue)
const breakpoints = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0
}

function getCurrentBreakpoint() {
  const width = window.innerWidth
  if (width >= breakpoints.lg) return 'lg'
  if (width >= breakpoints.md) return 'md'
  if (width >= breakpoints.sm) return 'sm'
  if (width >= breakpoints.xs) return 'xs'
  return 'xxs'
}

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => fn(...args), delay)
  }
}

async function triggerEvent(eventCode, data = {}) {
  try {
    await fetch(`/api/notification/trigger/${eventCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
  } catch (err) {
    console.error('Failed to trigger event:', eventCode, err)
  }
}

function handleResize() {
  const newBreakpoint = getCurrentBreakpoint()

  if (lastBreakpoint && lastBreakpoint !== newBreakpoint) {
    console.log(`Breakpoint changed: ${lastBreakpoint} -> ${newBreakpoint}`)
    triggerEvent('column_width_changed', {
      from: lastBreakpoint,
      to: newBreakpoint,
      width: window.innerWidth
    })
  }

  lastBreakpoint = newBreakpoint
}

export function initEventService() {
  if (isInitialized) return

  // Set initial breakpoint
  lastBreakpoint = getCurrentBreakpoint()

  // Add debounced resize listener
  const debouncedResize = debounce(handleResize, 300)
  window.addEventListener('resize', debouncedResize)

  isInitialized = true
  console.log('Event service initialized, current breakpoint:', lastBreakpoint)
}

export function destroyEventService() {
  if (!isInitialized) return

  window.removeEventListener('resize', handleResize)
  clearTimeout(debounceTimer)
  isInitialized = false
}

// Export for manual triggering if needed
export { triggerEvent, getCurrentBreakpoint }
