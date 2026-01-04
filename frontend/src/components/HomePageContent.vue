<template>
  <section class="home-page">
    <div class="hero">
      <h1>Welcome to Breakroom</h1>
      <p class="tagline">A simpler social space — no ads, no noise, just your friends.</p>
      <RouterLink to="/signup" class="cta-button">Join Breakroom</RouterLink>
    </div>

    <div class="features">
      <div class="feature">
        <h2>🧑‍🤝‍🧑 Real Connections</h2>
        <p>Everything you see is from people you know — no influencers, no algorithms.</p>
      </div>
      <div class="feature">
        <h2>🚫 No Ads</h2>
        <p>We’ll never sell your attention. No promoted posts, ever.</p>
      </div>
      <div class="feature">
        <h2>🤖 No AI-Generated Junk</h2>
        <p>Only human-made posts. No synthetic content. Just real thoughts, photos, and updates.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
// No logic needed yet
</script>

<style>
.home-page {
  padding: 60px 20px;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.hero {
  margin-bottom: 40px;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: var(--color-text);
}

.tagline {
  font-size: 1.2rem;
  color: var(--color-text-muted);
  margin-bottom: 20px;
}

.cta-button {
  background-color: var(--color-link);
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
  transition: opacity 0.2s;
}

.cta-button:hover {
  opacity: 0.9;
}

.features {
  display: grid;
  gap: 30px;
  grid-template-columns: 1fr;
}

.feature h2 {
  font-size: 1.4rem;
  color: var(--color-text);
  margin-bottom: 10px;
}

.feature p {
  color: var(--color-text-muted);
}

@media (min-width: 768px) {
  .features {
    grid-template-columns: repeat(3, 1fr);
    text-align: left;
  }

  .feature {
    padding: 0 20px;
  }
}
</style>
