<template>
  <q-page class="flex items-center justify-center q-pa-md">
    <q-banner dense class="bg-primary text-white q-mb-lg">
      NoisyTransfer lets you share (end-to-end encrypted) files using a single link or QR-Code. Just scan or share with anyone or any of your devices and confirm the code. No Cloud, no Passwords, no same Network requirement.
    </q-banner>
    <div class="column items-center q-gutter-y-xl">
      <q-btn
        to="/send"
        unelevated
        size="xl"
        icon="send"
        label="Send a File"
        class="big-btn"
        color="primary"
      />

      <q-btn
        to="/request"
        unelevated
        size="xl"
        icon="download"
        label="Receive a File"
        class="big-btn"
        color="secondary"
      />
    </div>
  </q-page>
</template>

<script setup>
// nothing to do
</script>

<style scoped lang="scss">
.big-btn {
  min-width: 80vw;
  min-height: 130px;
  font-size: 1.5rem;
  border-radius: 20px;
  transition: transform .2s, box-shadow .2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  }
}
</style>
