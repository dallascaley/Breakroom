<template>
  <section class="about-page">
    <h1>About Breakroom</h1>
    <p class="intro">
      At Breakroom, we believe social media should be simple, honest, and respectful of your time and mind.
    </p>

    <div class="content">
      <h2>Why We Charge a Small Fee</h2>
      <p>
        Unlike other social media platforms, we don't rely on advertising or data mining to make money.
        Instead, we charge a small subscription fee. This lets us focus on building a healthy, enjoyable space
        without manipulating you into spending more time than you want.
      </p>

      <h2>What’s Wrong with Traditional Social Media?</h2>
      <p>
        Many popular social networks use algorithms designed to keep you scrolling endlessly, using psychological tricks
        to capture your attention and sell it to advertisers. This leads to burnout, misinformation, and lost time.
      </p>

      <h2>Our Promise to You</h2>
      <p>
        By charging a small fee, we’re free from those pressures. You’ll see only real posts from friends,
        no ads, no AI-generated content, and no tricks. Just a simple place to connect, share, and be yourself.
      </p>
    </div>

    <RouterLink to="/signup" class="cta-button">Get Started with Breakroom</RouterLink>
  </section>
</template>

<script setup>
// no extra logic needed yet
</script>

<style>
.about-page {
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

.cta-button {
  display: block;
  width: max-content;
  margin: 3rem auto 0;
  background-color: #2e86de;
  color: white;
  padding: 14px 28px;
  font-weight: 600;
  border-radius: 7px;
  text-decoration: none;
  text-align: center;
  transition: background-color 0.2s ease-in-out;
}

.cta-button:hover {
  background-color: #1e5fa3;
}
</style>

