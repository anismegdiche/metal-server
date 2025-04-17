<script setup>
defineProps({
    image: String,
    reverse: Boolean
})
</script>

<template>
    <div class="fancy-section" :class="{ reverse }">
        <div class="text">
            <slot />
        </div>
        <div class="fancy-image">
            <img :src="image" loading="lazy" />
        </div>
    </div>
</template>

<style scoped>
.fancy-section {
    display: flex;
    align-items: center;
    gap: 20px;
    margin: 40px 0;
    border: 1px solid var(--vp-c-bg-soft);
    border-radius: 12px;
    height: 100%;
    background-color: var(--vp-c-bg-soft);
    transition: border-color 0.25s, background-color 0.25s;
}

.text {
    flex: 1;
    padding: 20px;
    width: 70%;
}

.reverse {
    flex-direction: row-reverse;
}
</style>
