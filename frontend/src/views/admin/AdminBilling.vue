<template>
  <section>
    <h1>Manage Billing</h1>

    
  </section>
</template>

<script setup>

</script>

<style scoped>
h1 {
  color: var(--color-text);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background: var(--color-background-card);
}

th, td {
  border: 1px solid var(--color-border);
  padding: 10px;
  text-align: left;
  color: var(--color-text);
}

thead {
  background-color: var(--color-background-soft);
}

button {
  margin-right: 5px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: var(--color-accent);
  color: white;
}

button:hover {
  background: var(--color-accent-hover);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--color-background-card);
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

.modal h2 {
  color: var(--color-text);
  margin-bottom: 12px;
}
</style>
