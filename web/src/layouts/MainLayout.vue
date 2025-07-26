<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header with Menu, Title, Home Button, and Version -->
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="cursor-pointer" @click="goHome">
          Noisytransfer
        </q-toolbar-title>
      <q-btn
        dense
        flat
        :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
        @click="toggleTheme"
      />
        <div class="q-ml-md">v0.1.0</div>
      </q-toolbar>
    </q-header>

    <!-- Drawer is now collapsed by default (no show-if-above) -->
    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      behavior="mobile"
      overlay
    >
      <q-list>
        <q-item-label header>
          Essential Links
        </q-item-label>

        <EssentialLink
          v-for="link in linksList"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
    <q-footer class="text-center">
      2025 White Noise, encproc@gmail.com
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const $q = useQuasar()

function toggleTheme() {
  // flip Quasar’s dark mode state
  $q.dark.toggle()

  // persist the user’s choice if you want:
  localStorage.setItem(
    'userDarkPreference',
    $q.dark.isActive ? 'dark' : 'light'
  )
}
const router = useRouter()
// List of links shown in the drawer
const linksList = [
  {
    title: 'Docs',
    caption: 'TBD',
    icon: 'school'
  },
  {
    title: 'Github Back-End',
    caption: 'collapsinghierarchy/noisytransfer',
    icon: 'code',
    link: 'https://github.com/collapsinghierarchy/noisytransfer'
  },
  {
    title: 'Github PWA',
    caption: 'collapsinghierarchy/noisytransferapp',
    icon: 'code',
    link: 'https://github.com/collapsinghierarchy/noisytransferapp'
  }
]

const leftDrawerOpen = ref(false)

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function goHome() {
  router.push('/')
}

</script>

<style scoped>
/* Optional: adjust drawer width when open */
</style>
