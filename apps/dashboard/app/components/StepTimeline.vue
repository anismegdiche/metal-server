<template>
  <div class="step-card">
    <div class="step-header">
      <div class="step-title">
        <span class="step-index">#{{ step.index }}</span>
        <span :class="['badge', statusClass(step.step?.status)]">{{ step.step?.status ?? "?" }}</span>
      </div>
      <div class="step-meta">
        <span v-if="step.step?.durationMs != null" class="meta-chip">
          {{ fmtDuration(step.step.durationMs) }}
        </span>
        <span v-if="step.attemptCount != null && step.attemptCount > 1" class="meta-chip retry">
          retry {{ step.attemptCount }}
        </span>
      </div>
    </div>

    <div v-if="step.rows" class="rows-section">
      <div class="rows-header">Rows</div>
      <div class="rows-bar">
        <div
          v-if="step.rows.passed"
          class="bar-segment bar-passed"
          :style="{ flex: step.rows.passed }"
          :title="`Passed: ${step.rows.passed}`"
        />
        <div
          v-if="step.rows.skipped"
          class="bar-segment bar-skipped"
          :style="{ flex: step.rows.skipped }"
          :title="`Skipped: ${step.rows.skipped}`"
        />
        <div
          v-if="step.rows.failed"
          class="bar-segment bar-failed"
          :style="{ flex: step.rows.failed }"
          :title="`Failed: ${step.rows.failed}`"
        />
        <div
          v-if="step.rows.sunk"
          class="bar-segment bar-sunk"
          :style="{ flex: step.rows.sunk }"
          :title="`Sunk: ${step.rows.sunk}`"
        />
        <div
          v-if="step.rows.input && !step.rows.passed && !step.rows.skipped && !step.rows.failed && !step.rows.sunk"
          class="bar-segment bar-input"
          :style="{ flex: step.rows.input }"
          :title="`Input: ${step.rows.input}`"
        />
      </div>
      <div class="rows-stats">
        <span v-if="step.rows.input != null" class="row-stat">
          <span class="dot dot-input" />Input: {{ step.rows.input }}
        </span>
        <span v-if="step.rows.passed != null" class="row-stat">
          <span class="dot dot-passed" />Passed: {{ step.rows.passed }}
        </span>
        <span v-if="step.rows.skipped != null" class="row-stat">
          <span class="dot dot-skipped" />Skipped: {{ step.rows.skipped }}
        </span>
        <span v-if="step.rows.failed != null" class="row-stat">
          <span class="dot dot-failed" />Failed: {{ step.rows.failed }}
        </span>
        <span v-if="step.rows.sunk != null" class="row-stat">
          <span class="dot dot-sunk" />Sunk: {{ step.rows.sunk }}
        </span>
      </div>
    </div>

    <div v-if="step.step?.startTime" class="step-times">
      <span class="time-item" v-if="step.step.startTime">{{ fmtTime(step.step.startTime) }}</span>
      <span class="time-arrow" v-if="step.step.startTime && step.step.endTime">&rarr;</span>
      <span class="time-item" v-if="step.step.endTime">{{ fmtTime(step.step.endTime) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StepMetrics } from "~~/server/utils/metrics"

defineProps<{
  step: StepMetrics
}>()

function statusClass(status: string | undefined | null): string {
  const s = (status || "").toLowerCase()
  if (s === "success" || s === "completed") return "status-success"
  if (s === "running" || s === "in_progress") return "status-running"
  if (s === "failed") return "status-failed"
  if (s === "pending" || s === "queued" || s === "waiting") return "status-pending"
  return "status-unknown"
}

function fmtDuration(ms: number | undefined | null): string {
  if (ms == null) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function fmtTime(t: string | undefined | null): string {
  if (!t) return ""
  const d = new Date(t)
  return d.toLocaleTimeString()
}
</script>

<style scoped>
.step-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 8px;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-index {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-success { background: var(--green-bg); color: var(--green); }
.status-running { background: var(--blue-bg); color: var(--blue); }
.status-failed { background: var(--red-bg); color: var(--red); }
.status-pending { background: var(--gray-bg); color: var(--gray); }
.status-unknown { background: var(--gray-bg); color: var(--text-muted); }

.step-meta {
  display: flex;
  gap: 6px;
}

.meta-chip {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
}

.meta-chip.retry {
  color: var(--yellow);
  background: var(--yellow-bg);
}

.rows-section {
  margin-bottom: 8px;
}

.rows-header {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.rows-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--bg-secondary);
  margin-bottom: 6px;
}

.bar-segment {
  height: 100%;
  transition: flex 0.2s;
}

.bar-input { background: var(--text-muted); }
.bar-passed { background: var(--green); }
.bar-skipped { background: var(--yellow); }
.bar-failed { background: var(--red); }
.bar-sunk { background: var(--gray); }

.rows-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.row-stat {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.dot-input { background: var(--text-muted); }
.dot-passed { background: var(--green); }
.dot-skipped { background: var(--yellow); }
.dot-failed { background: var(--red); }
.dot-sunk { background: var(--gray); }

.step-times {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.time-arrow {
  color: var(--text-muted);
}
</style>
