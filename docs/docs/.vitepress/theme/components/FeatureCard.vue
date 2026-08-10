```vue
<script setup>
defineProps({
  title: String,
  description: String,
  icon: String,
  image: String,
  badge_text: String,
  badge_style: String,
  link: String
})
</script>

<template>
  <div class="feature-card">
    <a v-if="link" :href="link" class="feature-link">
      <div v-if="icon" class="feature-icon">{{ icon }}</div>

      <div v-if="image" class="feature-image">
        <img class="technology-logo" :src="image" :alt="title" />
      </div>

      <h4>{{ title }}</h4>

      <Badge
        v-if="badge_text"
        :type="badge_style"
        :text="badge_text"
      />

      <p v-if="description">{{ description }}</p>
    </a>
  </div>
</template>

<style scoped>
.feature-card {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 8px;
}

.feature-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.feature-icon {
  font-size: 1.5rem;
}

.feature-image {
  display: flex;
  justify-content: center;
  width: 100%;
}

.feature-image img {
  display: block;
  height: 60px;
  width: auto;
}

.feature-link h4,
.feature-link p {
  margin: 0;
  font-size: 1rem;
}
</style>
```

This makes the **link itself the flex container**, so the image, title, badge, and description are all centered consistently.
