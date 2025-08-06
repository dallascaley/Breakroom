<template>
  <section class="settings-page">
    <h2>Settings</h2>
    <p>This is the settings page. You can adjust your preferences and configurations here.</p>

    <nav class="profile-nav">
      <RouterLink to="/profile" class="tab" :class="{ active: $route.path === '/profile' }">Profile</RouterLink>
      <RouterLink to="/billing" class="tab" :class="{ active: $route.path === '/billing' }">Billing</RouterLink>
      <RouterLink to="/settings" class="tab" :class="{ active: $route.path === '/settings' }">Settings</RouterLink>
    </nav>
  </section>
</template>
