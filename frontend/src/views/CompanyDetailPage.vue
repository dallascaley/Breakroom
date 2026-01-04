<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authFetch } from '../utilities/authFetch'

const route = useRoute()
const router = useRouter()

const company = ref(null)
const employees = ref([])
const positions = ref([])
const userRole = ref(null)
const loading = ref(true)
const error = ref(null)

// Position management
const showPositionModal = ref(false)
const editingPosition = ref(null)
const positionForm = ref({
  title: '',
  description: '',
  department: '',
  location_type: 'onsite',
  city: '',
  state: '',
  country: '',
  employment_type: 'full-time',
  pay_rate_min: '',
  pay_rate_max: '',
  pay_type: 'salary',
  requirements: '',
  benefits: ''
})
const savingPosition = ref(false)
const positionError = ref('')

const canManagePositions = computed(() => {
  return userRole.value && (userRole.value.is_owner || userRole.value.is_admin)
})

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

    // Fetch positions
    await fetchPositions()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function fetchPositions() {
  try {
    const res = await authFetch(`/api/positions/company/${route.params.id}`)
    if (res.ok) {
      const data = await res.json()
      positions.value = data.positions
    }
  } catch (err) {
    console.error('Error fetching positions:', err)
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

function openPositionModal(position = null) {
  editingPosition.value = position
  if (position) {
    positionForm.value = {
      title: position.title || '',
      description: position.description || '',
      department: position.department || '',
      location_type: position.location_type || 'onsite',
      city: position.city || '',
      state: position.state || '',
      country: position.country || '',
      employment_type: position.employment_type || 'full-time',
      pay_rate_min: position.pay_rate_min || '',
      pay_rate_max: position.pay_rate_max || '',
      pay_type: position.pay_type || 'salary',
      requirements: position.requirements || '',
      benefits: position.benefits || ''
    }
  } else {
    positionForm.value = {
      title: '',
      description: '',
      department: '',
      location_type: 'onsite',
      city: company.value?.city || '',
      state: company.value?.state || '',
      country: company.value?.country || '',
      employment_type: 'full-time',
      pay_rate_min: '',
      pay_rate_max: '',
      pay_type: 'salary',
      requirements: '',
      benefits: ''
    }
  }
  positionError.value = ''
  showPositionModal.value = true
}

function closePositionModal() {
  showPositionModal.value = false
  editingPosition.value = null
  positionError.value = ''
}

async function savePosition() {
  if (!positionForm.value.title.trim()) {
    positionError.value = 'Position title is required'
    return
  }

  savingPosition.value = true
  positionError.value = ''

  try {
    const payload = {
      ...positionForm.value,
      pay_rate_min: positionForm.value.pay_rate_min ? parseFloat(positionForm.value.pay_rate_min) : null,
      pay_rate_max: positionForm.value.pay_rate_max ? parseFloat(positionForm.value.pay_rate_max) : null
    }

    let res
    if (editingPosition.value) {
      res = await authFetch(`/api/positions/${editingPosition.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } else {
      res = await authFetch(`/api/positions/company/${route.params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Failed to save position')
    }

    await fetchPositions()
    closePositionModal()
  } catch (err) {
    positionError.value = err.message
  } finally {
    savingPosition.value = false
  }
}

async function deletePosition(position) {
  if (!confirm(`Delete the position "${position.title}"?`)) {
    return
  }

  try {
    const res = await authFetch(`/api/positions/${position.id}`, {
      method: 'DELETE'
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Failed to delete position')
    }

    await fetchPositions()
  } catch (err) {
    alert(err.message)
  }
}

async function togglePositionStatus(position) {
  const newStatus = position.status === 'open' ? 'closed' : 'open'

  try {
    const res = await authFetch(`/api/positions/${position.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Failed to update position')
    }

    await fetchPositions()
  } catch (err) {
    alert(err.message)
  }
}

function formatPay(position) {
  if (!position.pay_rate_min && !position.pay_rate_max) {
    return 'Negotiable'
  }

  const formatNum = (n) => {
    if (n >= 1000) {
      return '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k'
    }
    return '$' + n
  }

  const typeLabel = position.pay_type === 'hourly' ? '/hr' : position.pay_type === 'salary' ? '/yr' : ''

  if (position.pay_rate_min && position.pay_rate_max) {
    return `${formatNum(position.pay_rate_min)} - ${formatNum(position.pay_rate_max)}${typeLabel}`
  } else if (position.pay_rate_min) {
    return `${formatNum(position.pay_rate_min)}+${typeLabel}`
  } else {
    return `Up to ${formatNum(position.pay_rate_max)}${typeLabel}`
  }
}

function formatLocationType(type) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function formatEmploymentType(type) {
  return type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
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

      <!-- Open Positions -->
      <section class="positions-section">
        <div class="positions-header">
          <h2>Open Positions ({{ positions.filter(p => p.status === 'open').length }})</h2>
          <button v-if="canManagePositions" @click="openPositionModal()" class="btn-primary">
            + Add Position
          </button>
        </div>

        <div v-if="positions.length === 0" class="empty-state">
          No positions listed
        </div>

        <div v-else class="positions-list">
          <div v-for="pos in positions" :key="pos.id" class="position-card" :class="{ closed: pos.status !== 'open' }">
            <div class="position-main">
              <div class="position-header">
                <h3>{{ pos.title }}</h3>
                <span class="position-status" :class="pos.status">{{ pos.status }}</span>
              </div>
              <div class="position-meta">
                <span class="meta-item">{{ formatEmploymentType(pos.employment_type) }}</span>
                <span class="meta-item">{{ formatLocationType(pos.location_type) }}</span>
                <span v-if="pos.city || pos.state" class="meta-item">{{ [pos.city, pos.state].filter(Boolean).join(', ') }}</span>
                <span class="meta-item pay">{{ formatPay(pos) }}</span>
              </div>
              <p v-if="pos.description" class="position-description">{{ pos.description }}</p>
            </div>
            <div v-if="canManagePositions" class="position-actions">
              <button @click="openPositionModal(pos)" class="btn-small">Edit</button>
              <button @click="togglePositionStatus(pos)" class="btn-small">
                {{ pos.status === 'open' ? 'Close' : 'Reopen' }}
              </button>
              <button @click="deletePosition(pos)" class="btn-small danger">Delete</button>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Position Modal -->
    <div v-if="showPositionModal" class="modal-overlay" @click.self="closePositionModal">
      <div class="modal-content">
        <h2>{{ editingPosition ? 'Edit Position' : 'Add New Position' }}</h2>

        <form @submit.prevent="savePosition">
          <div class="form-group">
            <label for="pos-title">Position Title *</label>
            <input id="pos-title" v-model="positionForm.title" type="text" required placeholder="e.g., Software Engineer" />
          </div>

          <div class="form-group">
            <label for="pos-description">Description</label>
            <textarea id="pos-description" v-model="positionForm.description" rows="3" placeholder="Job description..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="pos-department">Department</label>
              <input id="pos-department" v-model="positionForm.department" type="text" placeholder="e.g., Engineering" />
            </div>
            <div class="form-group">
              <label for="pos-employment-type">Employment Type</label>
              <select id="pos-employment-type" v-model="positionForm.employment_type">
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="pos-location-type">Location Type</label>
              <select id="pos-location-type" v-model="positionForm.location_type">
                <option value="onsite">Onsite</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div class="form-group">
              <label for="pos-city">City</label>
              <input id="pos-city" v-model="positionForm.city" type="text" placeholder="City" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="pos-state">State</label>
              <input id="pos-state" v-model="positionForm.state" type="text" placeholder="State" />
            </div>
            <div class="form-group">
              <label for="pos-country">Country</label>
              <input id="pos-country" v-model="positionForm.country" type="text" placeholder="Country" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="pos-pay-type">Pay Type</label>
              <select id="pos-pay-type" v-model="positionForm.pay_type">
                <option value="salary">Salary</option>
                <option value="hourly">Hourly</option>
                <option value="commission">Commission</option>
                <option value="negotiable">Negotiable</option>
              </select>
            </div>
            <div class="form-group">
              <label for="pos-pay-min">Pay Min</label>
              <input id="pos-pay-min" v-model="positionForm.pay_rate_min" type="number" step="0.01" placeholder="Minimum" />
            </div>
            <div class="form-group">
              <label for="pos-pay-max">Pay Max</label>
              <input id="pos-pay-max" v-model="positionForm.pay_rate_max" type="number" step="0.01" placeholder="Maximum" />
            </div>
          </div>

          <div class="form-group">
            <label for="pos-requirements">Requirements</label>
            <textarea id="pos-requirements" v-model="positionForm.requirements" rows="3" placeholder="Required skills, experience, etc."></textarea>
          </div>

          <div class="form-group">
            <label for="pos-benefits">Benefits</label>
            <textarea id="pos-benefits" v-model="positionForm.benefits" rows="2" placeholder="Health insurance, PTO, etc."></textarea>
          </div>

          <div v-if="positionError" class="error-message">{{ positionError }}</div>

          <div class="modal-actions">
            <button type="button" @click="closePositionModal" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="savingPosition">
              {{ savingPosition ? 'Saving...' : (editingPosition ? 'Update Position' : 'Create Position') }}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  color: var(--color-text-muted);
  margin: 0;
  font-size: 0.95rem;
}

.your-role strong {
  color: var(--color-text);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.info-card,
.employees-card {
  background: var(--color-background-card);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.info-card h2,
.employees-card h2 {
  margin: 0 0 20px;
  color: var(--color-text);
  font-size: 1.2rem;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-accent);
}

.info-row {
  margin-bottom: 16px;
}

.info-row label {
  display: block;
  font-size: 0.85rem;
  color: var(--color-text-light);
  margin-bottom: 4px;
}

.info-row p {
  margin: 0;
  color: var(--color-text);
}

.info-row a {
  color: var(--color-accent);
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
  background: var(--color-background-soft);
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
  color: var(--color-text);
}

.employee-title {
  font-size: 0.85rem;
  color: var(--color-text-muted);
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
  background: var(--color-accent);
  color: white;
}

.badge.admin {
  background: #667eea;
  color: white;
}

/* Positions Section */
.positions-section {
  background: var(--color-background-card);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.positions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--color-accent);
}

.positions-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.positions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.position-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-background-soft);
}

.position-card.closed {
  opacity: 0.6;
}

.position-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.position-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

.position-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.position-status.open {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.position-status.closed {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.position-status.filled {
  background: #e0e0ff;
  color: #008;
}

.position-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.meta-item {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.meta-item.pay {
  color: var(--color-accent);
  font-weight: 600;
}

.position-description {
  margin: 8px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.position-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  background: var(--color-background-card);
  color: var(--color-text);
  border-radius: 4px;
  cursor: pointer;
}

.btn-small:hover {
  background: var(--color-background-soft);
}

.btn-small.danger {
  color: var(--color-error);
  border-color: var(--color-error-bg);
}

.btn-small.danger:hover {
  background: var(--color-error-bg);
}

/* Buttons */
.btn-primary {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  background: var(--color-button-secondary);
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-button-secondary);
  color: var(--color-text);
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-secondary:hover {
  background: var(--color-button-secondary-hover);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--color-background-card);
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin: 0 0 20px;
  color: var(--color-text);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
  background: var(--color-background-input);
  color: var(--color-text);
}

.form-group textarea {
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.error-message {
  background: var(--color-error-bg);
  color: var(--color-error);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--color-text-muted);
}

.error-box {
  background: var(--color-error-bg);
  color: var(--color-error);
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
  color: var(--color-text-light);
}
</style>
