<template>
  <section class="profile-page">
    <h1>Your Profile</h1>
    <p class="intro">
      Here is all your garbage...
    </p>

    <div class="content">
      <h2>Stuff!!</h2>
      <p>
        whee!!!
      </p>
    </div>

  </section>
</template>

<script setup>
// no extra logic needed yet
</script>

<style scoped>
.profile-page {
  max-width: 700px;
  margin: 50px auto;
  padding: 0 20px;
  font-family: system-ui, sans-serif;
  color: #333;
  line-height: 1.6;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.3em;
  text-align: center;
  color: #2e86de;
}

.intro {
  font-size: 1.2rem;
  text-align: center;
  margin-bottom: 2rem;
  color: #555;
}

.content h2 {
  margin-top: 1.8rem;
  font-size: 1.5rem;
  color: #444;
}

.content p {
  margin-top: 0.8rem;
  color: #555;
}

</style>

