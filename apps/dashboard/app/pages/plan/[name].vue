<template>
  <div>
    <a href="/" class="back-link">&larr; Back to plans</a>

    <div v-if="loading" class="state-msg">Loading...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>

    <template v-else-if="plan">
      <div class="plan-header">
        <div class="plan-title">
          <h1>{{ plan.planName }}</h1>
          <span :class="['badge', statusClass(plan.status)]">{{ plan.status }}</span>
        </div>
        <div class="plan-meta">
          <div class="meta-item">
            <span class="meta-label">Duration</span>
            <span class="meta-value">{{ fmtDuration(plan.durationMs) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Start</span>
            <span class="meta-value">{{ fmtTime(plan.startTime) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">End</span>
            <span class="meta-value">{{ fmtTime(plan.endTime) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Steps</span>
            <span class="meta-value">{{ plan.steps?.length ?? 0 }}</span>
          </div>
        </div>
      </div>

      <div v-if="!plan.steps || plan.steps.length === 0" class="state-msg">
        No step data available
      </div>

      <div v-else class="steps-section">
        <h2>Steps</h2>
        <StepTimeline
          v-for="step in plan.steps"
          :key="step.index"
          :step="step"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const name = route.params.name as string

const { data: plan, pending: loading, error } = await useFetch(`/api/plans/${name}`)

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
.back-link {
  display: inline-block;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.back-link:hover {
  color: var(--text-primary);
}

.plan-header {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.plan-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.plan-title h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-success { background: var(--green-bg); color: var(--green); }
.status-running { background: var(--blue-bg); color: var(--blue); }
.status-failed { background: var(--red-bg); color: var(--red); }
.status-pending { background: var(--gray-bg); color: var(--gray); }
.status-unknown { background: var(--gray-bg); color: var(--text-muted); }

.plan-meta {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 0.95rem;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.steps-section h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.state-msg {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.state-msg.error {
  color: var(--red);
}
</style>
