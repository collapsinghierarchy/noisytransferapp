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

   <div v-if="scanning" id="qr-reader"></div>

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

Notify.create('Welcome')

function goToLink() {
  if (shareLink.value) {
    router.push(shareLink.value)
  }
}

async function startScan () {
  console.log('▶ startScan pressed')

  if (window.matchMedia('(display-mode: standalone)').matches) {
    Notify.create('Open in Chrome tab to scan')
    return
  }

  html5Scanner = new Html5Qrcode('qr-reader')
  Notify.create({ message: 'Starting camera…', position: 'bottom' })
  
   let timeoutId
  try {
    // promise race: scanner start OR a 5‑second timeout
    await Promise.race([
      html5Scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        code => {
          console.log('QR decoded:', code)
          html5Scanner.stop()
          scanning.value = false
          Notify.create({ message: 'QR recognised', position: 'bottom' })
          router.push(code)
        },
        errMsg => console.debug('decode err', errMsg)
      ),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Camera timeout')), 5000)
      })
    ])

    clearTimeout(timeoutId)
    scanning.value = true
    console.log('✅ camera started')
    Notify.create({ message: 'Camera ready – point at QR', position: 'bottom' })
  }
  catch (err) {
    console.error('❌ camera failed:', err)
    Notify.create({
      type: 'negative',
      message: err?.message || 'Camera error',
      position: 'bottom'
    })
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
  height: 320px;
  max-width: 90vw;
  margin: 16px auto;
  border: 2px solid var(--q-color-primary);
  border-radius: 8px;
  overflow: hidden;
}

</style>
