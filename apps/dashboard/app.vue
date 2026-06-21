<template>
  <div class="Layout">
    <header class="VPNav">
      <div class="VPNavBar">
        <div class="wrapper">
          <div class="container">
            <div class="title">
              <a href="/" class="title-link">
                <span class="logo">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </span>
                <span class="site-title">Metal</span>
              </a>
            </div>
            <div class="content">
              <nav class="menu">
                <a
                  href="/"
                  class="menu-link"
                  :class="{ active: $route.path === '/' }"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                  Plans
                </a>
              </nav>
              <div class="nav-aside">
                <div class="status">
                  <span class="status-dot" />
                  <span class="status-label">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="divider" />
      </div>
    </header>
    <div class="VPContent">
      <div class="content-container">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const $route = useRoute()
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --vp-c-red: #ff2367;
  --vp-c-red-light: #ff5719;
  --vp-c-red-lighter: rgba(255, 135, 23, 0.25);
  --vp-c-red-dark: #ff622d;
  --vp-c-red-darker: #e23c00;

  --vp-c-bg: #1b1b1f;
  --vp-c-bg-alt: #161618;
  --vp-c-bg-elv: #202127;
  --vp-c-bg-soft: #202127;

  --vp-c-text-1: #dfdfd6;
  --vp-c-text-2: #98989f;
  --vp-c-text-3: #6a6a71;

  --vp-c-border: #3c3f44;
  --vp-c-divider: #2e2e32;
  --vp-c-gutter: #000000;

  --vp-c-gray-1: #515c67;
  --vp-c-gray-2: #414853;
  --vp-c-gray-3: #32363f;
  --vp-c-gray-soft: rgba(101, 117, 133, 0.16);

  --vp-shadow-1: 0 1px 2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --vp-shadow-2: 0 3px 12px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.07);
  --vp-shadow-3: 0 12px 32px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.08);

  --vp-nav-height: 64px;
  --vp-layout-max-width: 1440px;

  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-mono: ui-monospace, 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
}

html {
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  line-height: 1.6;
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

.Layout {
  min-height: 100vh;
}

/* ─── Navigation ─── */

.VPNav {
  position: sticky;
  top: 0;
  z-index: 30;
}

.VPNavBar {
  background: var(--vp-c-bg-alt);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.VPNavBar .wrapper {
  padding: 0 32px;
}

.VPNavBar .container {
  max-width: var(--vp-layout-max-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  height: var(--vp-nav-height);
  gap: 24px;
}

.title {
  flex-shrink: 0;
}

.title-link {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--vp-c-red-lighter);
  color: var(--vp-c-red);
  flex-shrink: 0;
}

.site-title {
  font-size: 1rem;
  letter-spacing: -0.02em;
}

.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.menu {
  display: flex;
  align-items: center;
  gap: 4px;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.menu-link:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.menu-link.active {
  color: var(--vp-c-red);
  background: var(--vp-c-red-lighter);
  border-color: rgba(255, 35, 103, 0.15);
}

.menu-link.active svg {
  stroke: var(--vp-c-red);
}

.nav-aside {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3dd68c;
  box-shadow: 0 0 8px rgba(61, 214, 140, 0.35);
  animation: pulse-dot 2.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.status-label {
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.divider {
  height: 1px;
  background: var(--vp-c-divider);
}

/* ─── Content ─── */

.VPContent {
  flex: 1;
}

.content-container {
  max-width: var(--vp-layout-max-width);
  margin: 0 auto;
  padding: 32px 32px 64px;
}
</style>
