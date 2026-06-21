<template>
  <div class="card">
    <div class="card-top">
      <h3 class="card-title">{{ plan.name }}</h3>
      <span :class="['badge', statusClass(plan.status)]">{{ plan.status }}</span>
    </div>
    <div class="card-body">
      <div class="card-stat">
        <span class="stat-label">Duration</span>
        <span class="stat-value">{{ fmtDuration(plan.durationMs) }}</span>
      </div>
      <div class="card-stat">
        <span class="stat-label">Steps</span>
        <span class="stat-value">{{ plan.stepCount }}</span>
      </div>
      <div class="card-stat">
        <span class="stat-label">Start</span>
        <span class="stat-value">{{ fmtTime(plan.startTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlanSummary } from "~~/server/utils/metrics"

defineProps<{
  plan: PlanSummary
}>()

function statusClass(status: string): string {
  const s = (status || "").toLowerCase()
  if (s === "success" || s === "completed") return "status-success"
  if (s === "running" || s === "in_progress") return "status-running"
  if (s === "failed") return "status-failed"
  if (s === "pending" || s === "queued") return "status-pending"
  return "status-unknown"
}

function fmtDuration(ms: number | undefined | null): string {
  if (ms == null) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function fmtTime(t: string | undefined | null): string {
  if (!t) return "-"
  const d = new Date(t)
  return d.toLocaleString()
}
</script>

<style scoped>
.card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  box-shadow: var(--vp-shadow-1);
}

.card:hover {
  border-color: var(--vp-c-red);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-2);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.status-success {
  background: var(--vp-c-green-soft);
  color: var(--vp-c-green-1);
}
.status-running {
  background: var(--vp-c-indigo-soft);
  color: var(--vp-c-indigo-1);
}
.status-failed {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
}
.status-pending {
  background: var(--vp-c-gray-soft);
  color: var(--vp-c-gray-1);
}
.status-unknown {
  background: var(--vp-c-gray-soft);
  color: var(--vp-c-text-3);
}

.card-body {
  display: flex;
  gap: 20px;
}

.card-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.stat-value {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  font-family: var(--font-mono);
}
</style>
