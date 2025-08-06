<template>
  <section class="billing-page">
    <h2>Billing</h2>
    <p>This is the billing page. You can view or update your subscription and payment methods.</p>

    <nav class="profile-nav">
      <RouterLink to="/profile" class="tab" :class="{ active: $route.path === '/profile' }">Profile</RouterLink>
      <RouterLink to="/billing" class="tab" :class="{ active: $route.path === '/billing' }">Billing</RouterLink>
      <RouterLink to="/settings" class="tab" :class="{ active: $route.path === '/settings' }">Settings</RouterLink>
    </nav>
  </section>
</template>
