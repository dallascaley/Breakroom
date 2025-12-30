<script setup>
import { ref, onMounted, watch } from 'vue'
import { GridLayout, GridItem } from 'grid-layout-plus'
import { breakroom } from '@/stores/breakroom.js'
import { user } from '@/stores/user.js'
import BreakroomBlock from '@/components/BreakroomBlock.vue'
import AddBlockModal from '@/components/AddBlockModal.vue'

const showAddModal = ref(false)
const layoutKey = ref(0)

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
}

// Handle layout change (drag/resize)
const onLayoutUpdated = (newLayout) => {
  // Debounce saving to avoid too many API calls
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    breakroom.saveLayout(newLayout)
  }, 500)
}

// Handle block removal
const onRemoveBlock = async (blockId) => {
  if (confirm('Remove this block from your layout?')) {
    await breakroom.removeBlock(blockId)
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
  await breakroom.fetchLayout()
  initializeLayout()
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
        @layout-updated="onLayoutUpdated"
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
        >
          <BreakroomBlock
            :block="item.block"
            @remove="onRemoveBlock(item.block.id)"
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
  padding: 0.75rem 2rem !important;
}

.breakroom-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #2e86de;
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
  min-height: 400px;
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

</style>
