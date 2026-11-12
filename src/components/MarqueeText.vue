<template>
  <div
    ref="containerRef"
    class="marquee-container"
    :class="{ 'is-overflowing': isOverflowing }"
    :title="text"
    @mouseenter="onHover(true)"
    @mouseleave="onHover(false)"
  >
    <div
      v-if="isOverflowing"
      class="marquee-track"
      :style="trackStyle"
    >
      <span ref="textRef" class="marquee-text-content">{{ text }}</span>
      <span class="marquee-spacer"></span>
      <span class="marquee-text-content" aria-hidden="true">{{ text }}</span>
    </div>
    <span
      v-else
      ref="textRef"
      class="marquee-text-static"
    >{{ text }}</span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  speed: {
    type: Number,
    default: 28 // pixels per second
  }
})

const containerRef = ref(null)
const textRef = ref(null)
const isOverflowing = ref(false)
const textWidth = ref(0)
const isHovered = ref(false)

function checkOverflow() {
  nextTick(() => {
    if (!containerRef.value || !textRef.value) return
    const containerW = containerRef.value.clientWidth
    const contentW = textRef.value.scrollWidth || textRef.value.offsetWidth
    textWidth.value = contentW
    // Se considera desborde si el contenido supera el contenedor o si tiene más de 24 caracteres en espacios pequeños
    isOverflowing.value = contentW > containerW + 4 || (props.text && props.text.length > 25 && containerW < 220)
  })
}

const trackStyle = computed(() => {
  if (!isOverflowing.value) return {}
  const duration = Math.max(8, Math.min(22, (textWidth.value || 200) / props.speed))
  return {
    animationDuration: `${duration}s`,
    animationPlayState: isHovered.value ? 'paused' : 'running'
  }
})

function onHover(hovering) {
  isHovered.value = hovering
}

watch(
  () => props.text,
  () => {
    checkOverflow()
  }
)

let resizeObserver = null

onMounted(() => {
  checkOverflow()
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      checkOverflow()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style scoped>
.marquee-container {
  display: block;
  max-width: 100%;
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  position: relative;
}

.marquee-container.is-overflowing {
  mask-image: linear-gradient(to right, black 82%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 82%, transparent 100%);
}

.marquee-container.is-overflowing:hover {
  mask-image: none;
  -webkit-mask-image: none;
}

.marquee-text-static {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.marquee-track {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  animation: marquee-scroll linear infinite;
  will-change: transform;
}

.marquee-spacer {
  display: inline-block;
  width: 42px;
  flex-shrink: 0;
}

.marquee-text-content {
  display: inline-block;
  white-space: nowrap;
  flex-shrink: 0;
}

@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-50% - 21px));
  }
}
</style>

