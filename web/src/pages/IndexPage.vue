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
            <div class="text-body1">
            Just drop a file below and scan with your smartphone or share the link. Secure against Shoulder-Surfing and any Man-in-the-Middle.
          </div>
        </div>
      </div>
    </q-card>
<div class="full-width q-mb-xl">
      <q-file
        v-model="localFile"
        accept="*/*"
        label="Choose from device"
        class="big-btn full-width"
        filled
        outlined
        bottom-slots
        @update:model-value="pickDirect"
      />
    </div>

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
import { ref, inject } from 'vue'
import { useRouter }   from 'vue-router'
import { Notify }      from 'quasar'

// inject the provided pendingFile ref
const pendingFile = inject('pendingFile')

// local v‑model for q‑file
const localFile = ref(null)
const router    = useRouter()

function pickDirect (files) {
  // Quasar sends either a File or an Array of Files
  if (!files) return

  // normalize to a single File
  const f = Array.isArray(files) ? files[0] : files
  if (!f) return

  pendingFile.value = f
  Notify.create(`Loaded “${ f.name }”`)
  router.push('/send')
}
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
