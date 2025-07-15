<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { user } from './stores/user.js'

// Fetch user info when the app mounts
user.fetchUser()
console.log('duh...')
console.log(user)
</script>

<template>
  <header>

    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>

        <template v-if="user.username">
          <RouterLink :to="`/profile`">{{ user.username }}</RouterLink>
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
</style>
