<template>
  <form @submit.prevent="handleSubmit">
    <span>Log In</span>
    <div>
      <label>Login/Handle: </label>
      <input type="text" required v-model="handle">
    </div>
    <div>
      <label>Password: </label>
      <input type="password" required v-model="password">
      <div v-if="passwordError" class="error">{{ passwordError }}</div>
    </div>
    <button type="submit">Login</button>
  </form>
</template>

<script>
import axios from 'axios'
import { useRouter } from 'vue-router'
import { user } from '@/stores/user.js'

export default {
  data() {
    return {
      handle: '',
      password: '',
      passwordError: ''
    }
  },
  setup() {
    const router = useRouter()
    return { router }
  },
  methods: {
    async handleSubmit() {
      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
          handle: this.handle,
          password: this.password
        })

        await user.fetchUser() // Fetch the username after login

        // If login succeeds, redirect to home
        this.router.push('/')
      } catch (err) {
        // Handle login failure
        this.passwordError = 'Invalid handle or password'
        console.error(err)
      }
    }
  }
}
</script>

<style scoped>
  form {
    max-width: 420px;
    margin: 30px auto;
    background: white;
    text-align: left;
    padding: 40px;
    border-radius: 10px;
  }
  label {
    color: #aaa;
    display: inline-block;
    margin: 25px 0 15px;
    font-size: 0.6em;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: bold;
  }
  input, button {
    display: block;
    padding: 10px 6px;
    width: 100%;
    box-sizing: border-box;
    border: none;
    border-bottom: 1px solid #ddd;
    color: #555;
  }
  .error {
    color: #ff0062;
    margin-top: 10px;
    font-size: 0.8em;
    font-weight: bold;
  }
</style>