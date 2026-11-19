<template>
  <div class="fav-artwork-box" :class="[`size-${size}`]">
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      class="fav-fire-icon"
      aria-hidden="true"
    >
      <path
        d="M12.2 2.2c.8 3.1-.9 5-2.5 6.7C8.2 10.5 7 12 7 14.3A5 5 0 0 0 12 19.3a5 5 0 0 0 5-5c0-2.9-1.6-5.1-3.1-6.9-.4 1.6-1.3 2.5-2.1 3.1.2-2.7.7-5.5.4-8.3z"
        fill="#ffffff"
      />
    </svg>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: 'card' // 'thumb' | 'card' | 'hero'
  }
})
</script>

<style scoped>
.fav-artwork-box {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e03a1e 0%, #ff8c00 100%);
  border-radius: inherit;
  overflow: hidden;
}

.fav-fire-icon {
  width: 48%;
  height: 48%;
  display: block;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
}

.size-thumb .fav-fire-icon {
  width: 58%;
  height: 58%;
}
</style>
