<script setup>
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { user } from './stores/user.js'

const router = useRouter()
const route = useRoute()
const showMenu = ref(false)
const isAdmin = ref(false)

async function checkAdminPermission() {
  if (!user.username) {
    isAdmin.value = false
    return
  }
  try {
    const res = await fetch('/api/auth/can/admin_access', {
      credentials: 'include'
    })
    const data = await res.json()
    isAdmin.value = data.has_permission || false
  } catch (err) {
    isAdmin.value = false
  }
}

user.fetchUser().then(() => {
  checkAdminPermission()
})

watch(() => user.username, () => {
  checkAdminPermission()
})

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function logout() {
  user.logout()
  isAdmin.value = false
  router.push('/login')
  showMenu.value = false
}

setInterval(() => {
  user.fetchUser()
  const publicRoutes = ['/', '/login', '/signup', '/about', '/welcome', '/chat']

  // Only redirect if on a protected route and not logged in
  if (!user.username && !publicRoutes.includes(route.path)) {
    router.push('/')
  }
}, 5 * 60 * 1000) // every 5 minutes

</script>

<template>
  <header>

    <div class="wrapper page-container">
      <nav>

        <template v-if="user.username">
          <RouterLink to="/breakroom">Breakroom</RouterLink>
          <RouterLink to="/blog">Blog</RouterLink>
          <RouterLink to="/chat">Chat</RouterLink>
          <RouterLink to="/friends">Friends</RouterLink>
          <RouterLink v-if="isAdmin" to="/admin">Admin</RouterLink>
          <div class="user-menu">
            <div @click="toggleMenu">
              {{ user.username }}
            </div>
            <div
              v-if="showMenu"
              class="dropdown"
              @click.stop
            >
              <RouterLink to="/profile">Profile</RouterLink>
              <a href="#" @click.prevent="logout">Logout</a>
            </div>
          </div>
        </template>

        <template v-else>
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/about">About</RouterLink>
          <RouterLink to="/login">Login</RouterLink>
          <RouterLink to="/signup">Sign Up</RouterLink>
        </template>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style>
/* Main body styles */
body {
  margin: 0;
  background: #eee;
}

header {
  line-height: 1.5;
  max-height: 100vh;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: right;
  margin-top: 0rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

/* User menu styles */
.user-menu {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #ccc;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.dropdown a {
  padding: 0.25rem 0;
  text-decoration: none;
  color: #333;
}

.dropdown a:hover {
  text-decoration: underline;
}
</style>
