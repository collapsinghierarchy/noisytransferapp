<template>
  <q-page padding class="column items-center justify-center">

    <!-- Mobile only: scan via camera -->
    <q-btn
      v-if="isMobile && !scanning"
      label="Scan QR Code"
      icon="qr_code_scanner"
      color="primary"
      @click="startScan"
    />

    <div
       v-if="scanning"
        id="qr-reader"></div>

    <!-- Desktop / fallback input -->
    <div v-else-if="!isMobile" class="full-width column items-center">
      <q-input
        v-model="shareLink"
        label="Enter share link"
        class="full-width app-input"
        @keyup.enter="goToLink"
      />
      <q-btn
        label="Go"
        color="primary"
        class="q-mt-sm"
        @click="goToLink"
        :disable="!shareLink"
      />
    </div>

  </q-page>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { Platform, Notify } from 'quasar'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'

const router    = useRouter()
const isMobile  = Platform.is.mobile
const scanning  = ref(false)
let   html5Scanner = null

// Fallback link input
const shareLink = ref('')

function goToLink() {
  if (shareLink.value) {
    router.push(shareLink.value)
  }
}

async function startScan() {
  scanning.value = true
  html5Scanner = new Html5Qrcode("qr-reader")

  try {
    await html5Scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      qrCodeMessage => {
        html5Scanner.stop()
        scanning.value = false
        router.push(qrCodeMessage)
      },
      /* ignore decode errors */
      () => {}
    )
    scanning.value = true
    Notify.create('Camera ready – point it at a QR code')
  }
  catch (err) {
    Notify.create({ type: 'negative', message: err.toString() })
    scanning.value = false
  }
}

onBeforeUnmount(() => {
  if (html5Scanner && scanning.value) {
    html5Scanner.stop().catch(() => {})
  }
})
</script>

<style scoped>
.full-width { width: 100%; }
.app-input { margin-top: 16px; }
#qr-reader {
  width: 320px;
  height: 320px;      /* ensure a real box */
  max-width: 90vw;    /* shrink on narrow screens */
  margin: 0 auto;
  border: 2px solid var(--q-color-primary);
  border-radius: 8px;
  overflow: hidden;
}

</style>
