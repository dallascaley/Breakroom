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
  font-size: 15px;
  text-align: right;
  margin-top: 0rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
}

nav a.router-link-exact-active {
  color: #42b983;
  font-weight: 500;
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
  color: #42b983;
}

nav a {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-left: 1px solid var(--color-border);
  text-decoration: none;
  color: #555;
  transition: color 0.2s;
}

nav a:hover {
  color: #42b983;
}

nav a:first-of-type {
  border: 0;
}

/* User menu styles */
.user-menu {
  position: relative;
  display: inline-block;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-left: 1px solid var(--color-border);
  color: #42b983;
  font-weight: 500;
  transition: background-color 0.2s;
  border-radius: 4px;
}

.user-menu:hover {
  background-color: rgba(66, 185, 131, 0.1);
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: none;
  border-radius: 8px;
  padding: 8px 0;
  min-width: 160px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.dropdown::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 16px;
  width: 12px;
  height: 12px;
  background: white;
  transform: rotate(45deg);
  box-shadow: -2px -2px 4px rgba(0, 0, 0, 0.05);
}

.dropdown a {
  padding: 10px 16px;
  text-decoration: none;
  color: #333;
  border: none;
  transition: background-color 0.15s, color 0.15s;
  font-size: 14px;
}

.dropdown a:hover {
  background-color: #f5f5f5;
  color: #42b983;
  text-decoration: none;
}
</style>
