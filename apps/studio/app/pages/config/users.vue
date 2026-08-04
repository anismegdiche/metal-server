<script setup lang="ts">
const toast = useToast()

const users = ref<Record<string, { password: string | number; secret?: string; roles?: string[] }>>({})
const roles = ref<Record<string, string | null>>({})

const userModalOpen = ref(false)
const roleModalOpen = ref(false)
const editingUser = ref<string | null>(null)
const editingRole = ref<string | null>(null)
const saving = ref(false)

const userForm = reactive({
  username: '',
  password: '',
  roles: [] as string[],
})

const roleForm = reactive({
  name: '',
  permissions: '',
})

const permissionChars = ['c', 'r', 'u', 'd', 'l', 'a'] as const
const permissionLabels: Record<string, string> = {
  c: 'Create',
  r: 'Read',
  u: 'Update',
  d: 'Delete',
  l: 'List',
  a: 'Admin',
}

const roleOptions = computed(() =>
  Object.keys(roles.value).map(r => ({ label: r, value: r }))
)

const usersTableData = computed(() =>
  Object.entries(users.value).map(([username, info]) => ({
    username,
    password: info.password,
    roles: info.roles ?? [],
  }))
)

const rolesTableData = computed(() =>
  Object.entries(roles.value).map(([name, perms]) => ({
    name,
    permissions: perms ?? '',
  }))
)

const userColumns = [
  { accessorKey: 'username', header: 'User' },
  { accessorKey: 'roles', header: 'Roles' },
  { accessorKey: 'actions', header: '' },
]

const roleColumns = [
  { accessorKey: 'name', header: 'Role' },
  { accessorKey: 'permissions', header: 'Permissions' },
  { accessorKey: 'actions', header: '' },
]

async function fetchData() {
  try {
    const [u, r] = await Promise.all([
      $fetch<Record<string, { password: string | number; secret?: string; roles?: string[] }>>('/server-api/api/config/users'),
      $fetch<Record<string, string | null>>('/server-api/api/config/roles'),
    ])
    users.value = u
    roles.value = r
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? 'Failed to load config', color: 'error' })
  }
}

function openAddUser() {
  editingUser.value = null
  userForm.username = ''
  userForm.password = ''
  userForm.roles = []
  userModalOpen.value = true
}

function openEditUser(username: string) {
  editingUser.value = username
  const info = users.value[username]
  userForm.username = username
  userForm.password = String(info.password)
  userForm.roles = info.roles ? [...info.roles] : []
  userModalOpen.value = true
}

async function saveUser() {
  saving.value = true
  try {
    await $fetch(`/server-api/api/config/users/${encodeURIComponent(userForm.username)}`, {
      method: 'PUT',
      body: {
        password: userForm.password,
        roles: userForm.roles,
      },
    })
    toast.add({ title: 'Saved', color: 'success' })
    userModalOpen.value = false
    await fetchData()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? 'Failed to save user', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function deleteUser(username: string) {
  try {
    await $fetch(`/server-api/api/config/users/${encodeURIComponent(username)}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', color: 'success' })
    await fetchData()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? 'Failed to delete user', color: 'error' })
  }
}

function openAddRole() {
  editingRole.value = null
  roleForm.name = ''
  roleForm.permissions = ''
  roleModalOpen.value = true
}

function openEditRole(name: string) {
  editingRole.value = name
  roleForm.name = name
  roleForm.permissions = roles.value[name] ?? ''
  roleModalOpen.value = true
}

async function saveRole() {
  saving.value = true
  try {
    await $fetch(`/server-api/api/config/roles/${encodeURIComponent(roleForm.name)}`, {
      method: 'PUT',
      body: roleForm.permissions || null,
    })
    toast.add({ title: 'Saved', color: 'success' })
    roleModalOpen.value = false
    await fetchData()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? 'Failed to save role', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function deleteRole(name: string) {
  try {
    await $fetch(`/server-api/api/config/roles/${encodeURIComponent(name)}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', color: 'success' })
    await fetchData()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message ?? 'Failed to delete role', color: 'error' })
  }
}

function togglePermission(char: string) {
  if (roleForm.permissions.includes(char)) {
    roleForm.permissions = roleForm.permissions.replace(char, '')
  } else {
    roleForm.permissions += char
  }
}

await fetchData()
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <PageHeader icon="i-lucide-users" title="Users & Roles" description="Manage users and role permissions" />
      <UButton icon="i-lucide-refresh-cw" label="Refresh" size="sm" variant="outline" @click="fetchData" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Users -->
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="size-5 text-primary" />
              <h2 class="font-semibold text-sm">Users</h2>
            </div>
            <UButton icon="i-lucide-plus" label="Add User" size="xs" variant="outline" @click="openAddUser" />
          </div>
        </template>
        <UTable :columns="userColumns" :data="usersTableData" :ui="{ th: 'px-2', td: 'px-2 py-2' }">
          <template #roles-cell="{ row }">
            <div class="flex flex-wrap gap-1">
              <UBadge v-for="r in row.original.roles" :key="r" variant="subtle" size="sm" color="neutral">
                {{ r }}
              </UBadge>
              <span v-if="!row.original.roles.length" class="text-xs text-muted">none</span>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEditUser(row.original.username)" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="deleteUser(row.original.username)" />
            </div>
          </template>
        </UTable>
      </UCard>

      <!-- Roles -->
      <UCard class="bg-metal-gradient">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield" class="size-5 text-warning" />
              <h2 class="font-semibold text-sm">Roles</h2>
            </div>
            <UButton icon="i-lucide-plus" label="Add Role" size="xs" variant="outline" @click="openAddRole" />
          </div>
        </template>
        <UTable :columns="roleColumns" :data="rolesTableData" :ui="{ th: 'px-2', td: 'px-2 py-2' }">
          <template #permissions-cell="{ row }">
            <div class="flex flex-wrap gap-1">
              <UBadge v-for="p in row.original.permissions" :key="p" variant="subtle" size="sm" color="neutral">
                {{ permissionLabels[p] ?? p }}
              </UBadge>
              <span v-if="!row.original.permissions" class="text-xs text-muted">none</span>
            </div>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-1">
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEditRole(row.original.name)" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="deleteRole(row.original.name)" />
            </div>
          </template>
        </UTable>
      </UCard>
    </div>

    <!-- User Modal -->
    <UModal v-model:open="userModalOpen" :title="editingUser ? 'Edit User' : 'Add User'">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Username">
            <UInput v-model="userForm.username" placeholder="username" :disabled="!!editingUser" />
          </UFormField>
          <UFormField label="Password">
            <UInput v-model="userForm.password" type="password" placeholder="password" />
          </UFormField>
          <UFormField label="Roles">
            <USelect v-model="userForm.roles" :items="roleOptions" multiple placeholder="Select roles" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="outline" size="sm" @click="userModalOpen = false" />
          <UButton label="Save" size="sm" :loading="saving" @click="saveUser" />
        </div>
      </template>
    </UModal>

    <!-- Role Modal -->
    <UModal v-model:open="roleModalOpen" :title="editingRole ? 'Edit Role' : 'Add Role'">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Role Name">
            <UInput v-model="roleForm.name" placeholder="role name" :disabled="!!editingRole" />
          </UFormField>
          <UFormField label="Permissions">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="p in permissionChars"
                :key="p"
                :label="`${p} - ${permissionLabels[p]}`"
                size="xs"
                :variant="roleForm.permissions.includes(p) ? 'solid' : 'outline'"
                @click="togglePermission(p)"
              />
            </div>
          </UFormField>
          <UFormField label="Permission String">
            <UInput v-model="roleForm.permissions" placeholder="e.g. crudla" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="outline" size="sm" @click="roleModalOpen = false" />
          <UButton label="Save" size="sm" :loading="saving" @click="saveRole" />
        </div>
      </template>
    </UModal>
  </div>
</template>
