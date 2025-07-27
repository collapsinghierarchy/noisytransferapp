<template>
  <q-page class="flex items-center justify-center q-pa-md">
    <div class="column items-center q-gutter-y-xl">
    <q-card
      flat
      bordered
      class="hero-card q-pa-lg q-mb-xl"
    > 
      <div class="row items-center no-wrap">
        <!-- 1) hero icon / illustration -->
        <q-img
          src="assets/logo.png"
          alt="Secure share illustration"
          width="96px"
          height="96px"
          class="q-mr-lg"
          contain
        />

         <!-- 2) headline + subline -->
        <div class="column">
          <div class="text-h5 text-weight-bold q-mb-xs">
            Beam files privately in seconds
          </div>
          <div class="text-body1">
            Scan a QR or share a single link; end‑to‑end encrypted, quantum-safe, no passwords, no cloud.
          </div>
        </div>
      </div>
    </q-card>

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
        color="primary"
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
.explain-banner .q-banner__content {
  font-size: 1.25rem;   /* adjust as you like */
  line-height: 1.4;
}
</style>
