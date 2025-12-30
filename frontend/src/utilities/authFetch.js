/**
 * Wrapper around fetch that handles authentication errors
 * Redirects to home page on 401/403 responses
 */
export async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include'
  })

  if (res.status === 401 || res.status === 403) {
    // Session expired or not authorized - redirect to home
    window.location.href = '/'
    throw new Error('Session expired')
  }

  return res
}
