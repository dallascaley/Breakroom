<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authFetch } from '../utilities/authFetch'

const route = useRoute()
const router = useRouter()

const company = ref(null)
const employees = ref([])
const userRole = ref(null)
const loading = ref(true)
const error = ref(null)

async function fetchCompany() {
  loading.value = true
  error.value = null

  try {
    const res = await authFetch(`/api/company/${route.params.id}`)

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Company not found')
      }
      throw new Error('Failed to load company')
    }

    const data = await res.json()
    company.value = data.company
    employees.value = data.employees
    userRole.value = data.userRole
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function getEmployeeName(emp) {
  if (emp.first_name || emp.last_name) {
    return `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
  }
  return emp.handle
}

function getLocationString() {
  if (!company.value) return ''
  const parts = []
  if (company.value.address) parts.push(company.value.address)
  if (company.value.city) parts.push(company.value.city)
  if (company.value.state) parts.push(company.value.state)
  if (company.value.postal_code) parts.push(company.value.postal_code)
  if (company.value.country) parts.push(company.value.country)
  return parts.join(', ')
}

function goBack() {
  router.push('/company-portal')
}

onMounted(() => {
  fetchCompany()
})
</script>

<template>
  <div class="page-container company-detail-page">
    <div v-if="loading" class="loading">Loading company...</div>

    <div v-else-if="error" class="error-box">
      <p>{{ error }}</p>
      <button @click="goBack" class="btn-secondary">Back to Portal</button>
    </div>

    <template v-else-if="company">
      <header class="company-header">
        <div>
          <h1>{{ company.name }}</h1>
          <p v-if="userRole" class="your-role">
            You are: <strong>{{ userRole.title }}</strong>
            <span v-if="userRole.is_owner" class="badge owner">Owner</span>
            <span v-else-if="userRole.is_admin" class="badge admin">Admin</span>
          </p>
        </div>
        <button @click="goBack" class="btn-secondary">Back</button>
      </header>

      <div class="content-grid">
        <!-- Company Info -->
        <section class="info-card">
          <h2>Company Information</h2>

          <div v-if="company.description" class="info-row">
            <label>Description</label>
            <p>{{ company.description }}</p>
          </div>

          <div v-if="getLocationString()" class="info-row">
            <label>Location</label>
            <p>{{ getLocationString() }}</p>
          </div>

          <div v-if="company.phone" class="info-row">
            <label>Phone</label>
            <p>{{ company.phone }}</p>
          </div>

          <div v-if="company.email" class="info-row">
            <label>Email</label>
            <p><a :href="'mailto:' + company.email">{{ company.email }}</a></p>
          </div>

          <div v-if="company.website" class="info-row">
            <label>Website</label>
            <p><a :href="company.website" target="_blank">{{ company.website }}</a></p>
          </div>
        </section>

        <!-- Employees -->
        <section class="employees-card">
          <h2>Employees ({{ employees.length }})</h2>

          <div v-if="employees.length === 0" class="empty-state">
            No employees listed
          </div>

          <div v-else class="employee-list">
            <div v-for="emp in employees" :key="emp.id" class="employee-item">
              <div class="employee-avatar">
                {{ (emp.first_name || emp.handle || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="employee-info">
                <span class="employee-name">{{ getEmployeeName(emp) }}</span>
                <span class="employee-title">{{ emp.title || 'Employee' }}</span>
              </div>
              <div class="employee-badges">
                <span v-if="emp.is_owner" class="badge owner">Owner</span>
                <span v-else-if="emp.is_admin" class="badge admin">Admin</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.company-detail-page {
  max-width: 1000px;
}

.company-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.company-header h1 {
  font-size: 2.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #42b983 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px;
}

.your-role {
  color: #666;
  margin: 0;
  font-size: 0.95rem;
}

.your-role strong {
  color: #2c3e50;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.info-card,
.employees-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.info-card h2,
.employees-card h2 {
  margin: 0 0 20px;
  color: #2c3e50;
  font-size: 1.2rem;
  padding-bottom: 12px;
  border-bottom: 2px solid #42b983;
}

.info-row {
  margin-bottom: 16px;
}

.info-row label {
  display: block;
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 4px;
}

.info-row p {
  margin: 0;
  color: #333;
}

.info-row a {
  color: #42b983;
  text-decoration: none;
}

.info-row a:hover {
  text-decoration: underline;
}

.employee-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.employee-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.employee-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #42b983);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
}

.employee-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.employee-name {
  font-weight: 500;
  color: #2c3e50;
}

.employee-title {
  font-size: 0.85rem;
  color: #666;
}

.employee-badges {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.owner {
  background: #42b983;
  color: white;
}

.badge.admin {
  background: #667eea;
  color: white;
}

.btn-secondary {
  background: #eee;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-secondary:hover {
  background: #ddd;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #666;
}

.error-box {
  background: #ffe0e0;
  color: #c00;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
}

.error-box p {
  margin: 0 0 16px;
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: #888;
}
</style>
