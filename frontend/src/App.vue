<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { user } from './stores/user.js'
import { useRouter } from 'vue-router'

// Fetch user info when the app mounts
user.fetchUser()

// Controls visibility of dropdown
const showMenu = ref(false)

const router = useRouter()

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function logout() {
  user.logout()
  router.push('/login')
  showMenu.value = false
}
</script>

<template>
  <header>

    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>

        <template v-if="user.username">
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
