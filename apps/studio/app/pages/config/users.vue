<script setup lang="ts">
const users = ref([
  { id: '1', user: 'admin', role: 'admin' },
  { id: '2', user: 'user1', role: 'user' },
  { id: '3', user: 'viewer', role: 'viewer' },
])

const roles = ref([
  { id: '1', role: 'admin', permissions: ['create', 'read', 'update', 'delete', 'admin'] },
  { id: '2', role: 'user', permissions: ['create', 'read', 'update'] },
  { id: '3', role: 'viewer', permissions: ['read'] },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold">
        <UIcon name="i-lucide-users" class="ml-0 mr-2" />Users &amp; Roles
      </h1>
      <p class="text-sm text-muted">Manage users and role permissions</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Users</h2>
            <UButton icon="i-lucide-plus" label="Add" size="xs" variant="outline" />
          </div>
        </template>
        <UTable :columns="[
          { accessorKey: 'user', header: 'User' },
          { accessorKey: 'role', header: 'Role' },
        ]" :data="users" :ui="{
          th: 'px-2',
          td: 'px-2 py-2'
        }">
          <template #role-cell="{ row }">
            <UBadge variant="subtle" size="md" color="neutral">
              {{ row.original.role }}
            </UBadge>
          </template>
        </UTable>
      </UCard>

      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold">Roles</h2>
            <UButton icon="i-lucide-plus" label="Add" size="xs" variant="outline" />
          </div>
        </template>
        <div class="flex flex-col gap-3">
          <div v-for="role in roles" :key="role.id"
            class="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <div>
              <p class="text-sm font-medium">{{ role.role }}</p>
              <div class="flex gap-1 mt-1">
                <UBadge v-for="perm in role.permissions" :key="perm" variant="subtle" size="xs" color="neutral">
                  {{ perm }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
