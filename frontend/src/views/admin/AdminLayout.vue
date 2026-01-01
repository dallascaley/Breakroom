<template>
  <div class="admin-layout page-container">
    <aside class="sidebar">
      <h2>Admin</h2>
      <nav>
        <ul>
          <li><RouterLink to="/admin/users">Users</RouterLink></li>
          <li><RouterLink to="/admin/groups">Groups</RouterLink></li>
          <li><RouterLink to="/admin/permissions">Permissions</RouterLink></li>
          <li><RouterLink to="/admin/billing">Billing</RouterLink></li>
        </ul>
      </nav>
    </aside>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background-color: #2e86de;
  color: white;
  padding: 20px;
}

.sidebar h2 {
  color: #fff;
  font-size: 1.4rem;
  margin-bottom: 1rem;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  margin: 10px 0;
}

.sidebar a {
  color: white;
  text-decoration: none;
}

.main-content {
  flex-grow: 1;
  padding: 30px;
  background-color: #f9f9f9;
}
</style>
