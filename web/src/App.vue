<template>
  <q-layout view="hHh Lpr fFf">
    <q-header elevated>
      <HeaderLayout />
    </q-header>

    <q-drawer show-if-above v-model="leftDrawerOpen">
      <SidebarMenu />
    </q-drawer>

    <q-page-container>
      <router-view/>
    </q-page-container>

    <q-footer class="text-center">
      2025 White Noise
    </q-footer>
  </q-layout>
</template>

