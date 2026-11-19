<template>
  <div
    class="vinyl-thumb"
    :class="{ 'is-spinning': spinning }"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="vinyl-thumb-img"
    />
    <div v-else class="vinyl-thumb-fallback">
      <AppIcon name="music" :size="Math.round(size * 0.4)" />
    </div>
    <span class="vinyl-grooves-overlay"></span>
    <span class="vinyl-spindle"></span>
  </div>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  src: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: 'Portada'
  },
  size: {
    type: Number,
    default: 44
  },
  spinning: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.vinyl-thumb {
  border-radius: 50%;
  overflow: hidden;
  background: #232823;
  box-shadow: 0 0 0 1px #596156, 0 4px 10px rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  position: relative;
}

.vinyl-thumb.is-spinning {
  animation: vinyl-thumb-spin 7s linear infinite;
}

@keyframes vinyl-thumb-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.vinyl-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.vinyl-thumb-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #252c25;
  color: var(--lime);
}

.vinyl-grooves-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, transparent 42%, transparent 62%, rgba(255, 255, 255, 0.08) 100%),
    repeating-radial-gradient(
      circle,
      rgba(10, 12, 10, 0.42) 0 1.4px,
      rgba(255, 255, 255, 0.08) 1.4px 2px,
      transparent 2px 4.5px
    );
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.vinyl-spindle {
  position: absolute;
  width: 18%;
  height: 18%;
  min-width: 7px;
  min-height: 7px;
  border-radius: 50%;
  background: #141714;
  border: 1.5px solid rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45);
  pointer-events: none;
  z-index: 2;
}
</style>
