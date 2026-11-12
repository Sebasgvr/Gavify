<template>
  <div ref="rootRef" class="custom-select-wrap" :class="{ open: isOpen }">
    <button
      type="button"
      class="custom-select-trigger"
      @click="toggleDropdown"
    >
      <span class="custom-select-label">{{ selectedLabel }}</span>
      <span class="custom-select-arrow" :class="{ rotated: isOpen }">
        <AppIcon name="chevron-down" :size="14" />
      </span>
    </button>

    <transition name="dropdown-pop">
      <div v-if="isOpen" class="custom-select-menu">
        <button
          v-for="opt in normalizedOptions"
          :key="String(opt.value)"
          type="button"
          class="custom-select-option"
          :class="{ selected: String(opt.value) === String(modelValue) }"
          @click="selectOption(opt.value)"
        >
          <span>{{ opt.label }}</span>
          <AppIcon
            v-if="String(opt.value) === String(modelValue)"
            name="check"
            :size="14"
          />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  options: {
    type: Array,
    required: true
  },
  placeholder: {
    type: String,
    default: 'Seleccionar...'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const rootRef = ref(null)

const normalizedOptions = computed(() => {
  return (props.options || []).map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label ?? String(opt.value)
      }
    }
    return {
      value: opt,
      label: String(opt)
    }
  })
})

const selectedLabel = computed(() => {
  const found = normalizedOptions.value.find(
    o => String(o.value) === String(props.modelValue)
  )
  return found ? found.label : props.placeholder
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectOption(val) {
  emit('update:modelValue', val)
  emit('change', val)
  isOpen.value = false
}

function handleClickOutside(event) {
  if (rootRef.value && !rootRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped>
.custom-select-wrap {
  position: relative;
  display: inline-block;
  min-width: 175px;
  user-select: none;
}

.custom-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #141814;
  border: 1px solid #2b332a;
  color: #e6ebe5;
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.custom-select-trigger:hover,
.custom-select-wrap.open .custom-select-trigger {
  border-color: #6d8f66;
  background: #181d18;
}

.custom-select-wrap.open .custom-select-trigger {
  box-shadow: 0 0 0 3px rgba(184, 223, 109, 0.12);
}

.custom-select-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-select-arrow {
  display: inline-grid;
  place-items: center;
  color: #8f988d;
  transition: transform 0.2s ease;
}

.custom-select-arrow.rotated {
  transform: rotate(180deg);
  color: var(--lime);
}

.custom-select-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 100%;
  width: max-content;
  max-width: 300px;
  max-height: 260px;
  overflow-y: auto;
  background: #151915;
  border: 1px solid #2f382e;
  border-radius: 16px;
  padding: 6px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.75);
  z-index: 600;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.custom-select-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #cfd6ce;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}

.custom-select-option:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
}

.custom-select-option.selected {
  background: rgba(184, 223, 109, 0.16);
  color: var(--lime);
  font-weight: 700;
}

.dropdown-pop-enter-active,
.dropdown-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-pop-enter-from,
.dropdown-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>

