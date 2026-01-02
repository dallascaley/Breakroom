<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { GridLayout, GridItem } from 'grid-layout-plus'
import { breakroom } from '@/stores/breakroom.js'
import { user } from '@/stores/user.js'
import BreakroomBlock from '@/components/BreakroomBlock.vue'
import AddBlockModal from '@/components/AddBlockModal.vue'

const showAddModal = ref(false)
const layoutKey = ref(0)

// Mobile detection
const isMobile = ref(false)
const MOBILE_BREAKPOINT = 480

const checkMobile = () => {
  isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT &&
    (window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= MOBILE_BREAKPOINT)
}

// Track which block is expanded (for mobile accordion - only one at a time)
const expandedBlockId = ref(null)

// Responsive breakpoints and column counts
const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const cols = { lg: 5, md: 4, sm: 3, xs: 2, xxs: 1 }
const rowHeight = ref(150)

// Debounce timer for saving layout
let saveTimeout = null

// Layout items for grid (mutable ref for two-way binding)
const layoutItems = ref([])

// Initialize layout from store (only once after fetch)
const initializeLayout = () => {
  layoutItems.value = breakroom.blocks.map(block => ({
    i: block.i,
    x: block.x,
    y: block.y,
    w: block.w,
    h: block.h,
    block: block
  }))
  // Set first block as expanded by default on mobile
  if (layoutItems.value.length > 0 && expandedBlockId.value === null) {
    expandedBlockId.value = layoutItems.value[0].block.id
  }
}

// Toggle block expansion (only one at a time)
const toggleBlock = (blockId) => {
  if (expandedBlockId.value === blockId) {
    expandedBlockId.value = null
  } else {
    expandedBlockId.value = blockId
  }
}

// Handle user-initiated move/resize (not triggered by responsive changes)
const onItemMoved = () => {
  saveLayoutDebounced()
}

const onItemResized = () => {
  saveLayoutDebounced()
}

// Debounced save - only saves after user drags/resizes
const saveLayoutDebounced = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    breakroom.saveLayout(layoutItems.value)
  }, 500)
}

// Handle block removal
const onRemoveBlock = async (blockId) => {
  if (confirm('Remove this block from your layout?')) {
    await breakroom.removeBlock(blockId)
    // Immediately remove from layoutItems for instant UI update
    layoutItems.value = layoutItems.value.filter(item => item.block.id !== blockId)
  }
}

// Handle new block added
const onBlockAdded = () => {
  showAddModal.value = false
  // Reinitialize layout with new block
  initializeLayout()
  // Force re-render of grid
  layoutKey.value++
}

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  await breakroom.fetchLayout()
  initializeLayout()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <section class="breakroom-page">
    <header class="breakroom-header page-container">
      <h1>Breakroom</h1>
      <button class="add-block-btn" @click="showAddModal = true">
        + Add Block
      </button>
    </header>

    <div v-if="breakroom.loading" class="loading">
      Loading your layout...
    </div>

    <div v-else-if="breakroom.blocks.length === 0" class="empty-state">
      <p>Your breakroom is empty!</p>
      <p class="hint">Click "Add Block" to add chat rooms and other content.</p>
    </div>

    <!-- Mobile: Simple accordion list -->
    <div v-else-if="isMobile" class="mobile-blocks">
      <div
        v-for="item in layoutItems"
        :key="item.i"
        class="mobile-block-wrapper"
        :class="{ expanded: expandedBlockId === item.block.id }"
      >
        <BreakroomBlock
          :block="item.block"
          :expanded="expandedBlockId === item.block.id"
          @remove="onRemoveBlock(item.block.id)"
          @toggle="toggleBlock(item.block.id)"
        />
      </div>
    </div>

    <!-- Desktop: Grid layout -->
    <div v-else class="grid-container">
      <GridLayout
        :key="layoutKey"
        v-model:layout="layoutItems"
        :col-num="5"
        :row-height="rowHeight"
        :is-draggable="true"
        :is-resizable="true"
        :responsive="true"
        :breakpoints="breakpoints"
        :cols="cols"
        :vertical-compact="true"
        :use-css-transforms="true"
        :margin="[10, 10]"
      >
        <GridItem
          v-for="item in layoutItems"
          :key="item.i"
          :i="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :min-w="1"
          :min-h="1"
          :max-w="5"
          :max-h="4"
          drag-allow-from=".block-header"
          drag-ignore-from=".block-content"
          @moved="onItemMoved"
          @resized="onItemResized"
        >
          <BreakroomBlock
            :block="item.block"
            :expanded="expandedBlockId === item.block.id"
            @remove="onRemoveBlock(item.block.id)"
            @toggle="toggleBlock(item.block.id)"
          />
        </GridItem>
      </GridLayout>
    </div>

    <div v-if="breakroom.error" class="error-message">
      {{ breakroom.error }}
      <button @click="breakroom.clearError" class="dismiss-btn">Dismiss</button>
    </div>

    <AddBlockModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @added="onBlockAdded"
    />

    <!-- Bottom Menu -->
    <nav class="bottom-menu">
      <RouterLink to="/about-company">About</RouterLink>
      <RouterLink to="/employment">Employment</RouterLink>
      <RouterLink to="/help-desk">Help Desk</RouterLink>
      <RouterLink to="/company-portal">Company Portal</RouterLink>
    </nav>
  </section>
</template>

<style scoped>
.breakroom-page {
  padding: 0;
  font-family: system-ui, sans-serif;
}

.breakroom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0 !important;
  margin-bottom: 0.5rem;
}

.breakroom-header h1 {
  margin: 0;
  font-size: 2.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #42b983 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.add-block-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}

.add-block-btn:hover {
  background: #3aa876;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-size: 1.1rem;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: #f9f9f9;
  border-radius: 10px;
  color: #666;
}

.empty-state p {
  margin: 0 0 10px;
  font-size: 1.2rem;
}

.empty-state .hint {
  font-size: 1rem;
  color: #888;
}

.grid-container {
  min-height: 300px;
}

.error-message {
  margin-top: 20px;
  padding: 10px 20px;
  background: #ffe0e0;
  color: #c00;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dismiss-btn {
  background: none;
  border: none;
  color: #c00;
  cursor: pointer;
  text-decoration: underline;
}

/* Vue Grid Layout overrides */
:deep(.vue-grid-item) {
  transition: all 200ms ease;
  touch-action: none;
}

:deep(.vue-grid-item.vue-grid-placeholder) {
  background: #42b983;
  opacity: 0.2;
  border-radius: 8px;
}

/* Bottom Menu */
.bottom-menu {
  display: flex;
  justify-content: center;
  gap: 2rem;
  padding: 1rem 2rem;
  margin-top: 1.5rem;
  background: #2c3e50;
  border-radius: 8px;
}

.bottom-menu a {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
}

.bottom-menu a:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.bottom-menu a.router-link-exact-active {
  background: rgba(66, 185, 131, 0.3);
  color: #42b983;
}

/* Mobile accordion layout */
.mobile-blocks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
}

.mobile-block-wrapper {
  border-radius: 8px;
  overflow: hidden;
}

.mobile-block-wrapper :deep(.breakroom-block) {
  height: auto;
}

.mobile-block-wrapper :deep(.block-content) {
  display: none;
}

.mobile-block-wrapper.expanded {
  height: calc(100vh - 180px);
}

.mobile-block-wrapper.expanded :deep(.breakroom-block) {
  height: 100%;
}

.mobile-block-wrapper.expanded :deep(.block-content) {
  display: flex !important;
  flex: 1 !important;
  overflow-y: auto !important;
}
</style>
