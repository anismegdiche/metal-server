<script setup>
defineProps({
  title: String,
  description: String,
  icon: String,
  image: String,
  badge_text: String,
  badge_style: String
})
</script>

<template>
  <div class="feature-card">
    <div v-if="icon" class="feature-icon">{{ icon }}</div>
    <div v-if="image" class="feature-image">
      <img class="technology-logo" :src="image" :alt="title" />
    </div>
    <h3>{{ title }}</h3>
    <Badge v-if="badge_text" :type="badge_style" :text="badge_text" />
    <p v-if="description">{{ description }}</p>
  </div>
</template>

<style scoped>
.feature-card {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  justify-content: top;
  text-align: center;
}

.feature-icon {
  font-size: 1.5rem;
}

.feature-image img {
  height: 60px;
  width: auto;
}
</style>
