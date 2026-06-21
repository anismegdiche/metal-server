<template>
  <div>
    <div class="page-header">
      <div class="page-header-text">
        <h1>Plans</h1>
        <p class="page-desc">Monitor and manage your ETL pipelines</p>
      </div>
      <div class="page-header-side">
        <span class="count-badge">{{ plans.length }} plan{{ plans.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>

    <div v-if="loading" class="state-msg">
      <div class="spinner" />
      <span>Loading plans...</span>
    </div>

    <div v-else-if="error" class="state-msg error">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="plans.length === 0" class="state-msg empty">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
      <span>No plans found</span>
    </div>

    <div v-else class="plan-grid">
      <PlanCard
        v-for="plan in plans"
        :key="plan.name"
        :plan="plan"
        @click="navigateTo(`/plan/${plan.name}`)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: plans, pending: loading, error } = await useFetch("/api/plans")
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.page-header-text h1 {
  font-size: 1.65rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.page-desc {
  font-size: 0.875rem;
  color: var(--vp-c-text-3);
  margin-top: 4px;
}

.page-header-side {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 4px;
}

.count-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-red);
  background: var(--vp-c-red-lighter);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 35, 103, 0.15);
  white-space: nowrap;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
}

.state-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 56px 24px;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--vp-c-border);
  border-top-color: var(--vp-c-text-3);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.state-msg.error {
  color: var(--vp-c-text-1);
  border-color: rgba(255, 35, 103, 0.25);
  background: rgba(255, 35, 103, 0.06);
}

.state-msg.error svg {
  color: var(--vp-c-red);
  flex-shrink: 0;
}

.state-msg.empty svg {
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}
</style>
