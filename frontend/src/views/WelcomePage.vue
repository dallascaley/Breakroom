<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToChat = () => {
  router.push('/chat')
}
</script>

<template>
  <main class="welcome page-container">
    <h1>Welcome to Breakroom</h1>
    <p>
      There's going to be a lot of stuff here someday, but for now let's just
      get you going to the chat section because that's the main part of Breakroom.
    </p>
    <button @click="goToChat">Go to Chat</button>
  </main>
</template>

<style scoped>
.welcome {
  max-width: 600px;
  margin: 60px auto;
  background: white;
  text-align: center;
  padding: 40px;
  border-radius: 10px;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 30px;
}

button {
  background: #42b983;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 5px;
  font-size: 1em;
  cursor: pointer;
}

button:hover {
  background: #3aa876;
}
</style>
