<template>
  <section class="profile-page">
    <div class="profile-header">
      <img
        src="https://i.pravatar.cc/120?u=your-user-id"
        alt="Profile Image"
        class="profile-image"
      />
      <div class="user-details">
        <h1>Jane Doe</h1>
        <p class="user-email">jane.doe@example.com</p>
      </div>
    </div>

    <nav class="profile-nav">
      <button class="tab active">Profile</button>
      <button class="tab">Billing</button>
      <button class="tab">Settings</button>
    </nav>

    <div class="tab-content">
      <h2>Profile Overview</h2>
      <p>Welcome to your profile! Here you can update your information, check your subscription, and manage settings.</p>

      <div class="profile-details">
        <p><strong>Username:</strong> janedoe</p>
        <p><strong>Member since:</strong> January 2024</p>
        <p><strong>Plan:</strong> Pro Monthly</p>
      </div>
    </div>
  </section>
</template>

<script setup>
// Add reactive tab switching logic here if needed
</script>

<style>
.profile-page {
  max-width: 800px;
  margin: 50px auto;
  padding: 0 20px;
  font-family: system-ui, sans-serif;
  color: #333;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.profile-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ddd;
}

.user-details h1 {
  font-size: 1.8rem;
  margin: 0;
  color: #2e86de;
}

.user-email {
  color: #666;
  font-size: 0.95rem;
}

.profile-nav {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 2rem;
}

.tab {
  background: none;
  border: none;
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  color: #2e86de;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab:hover {
  color: #1e6bb8;
}

.tab.active {
  border-bottom: 2px solid #2e86de;
  font-weight: bold;
}

.tab-content h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.tab-content p {
  margin-bottom: 1rem;
  color: #555;
}

.profile-details p {
  margin: 0.4rem 0;
}
</style>
