<template>
  <q-page padding class="column items-center justify-center">

    <!-- Hero card -->
    <q-card flat bordered class="hero-card q-pa-lg q-mb-xl">
      <div class="row items-center no-wrap">
        <q-img
          src="src/assets/logo.png"
          alt="Secure share illustration"
          width="96px"
          height="96px"
          class="q-mr-lg"
          contain
        />
        <div class="column">
          <div class="text-h5 text-weight-bold q-mb-xs">
            Beam files privately in seconds
          </div>
          <div class="text-body1">
            Scan a QR or share a single link; end‑to‑end encrypted, quantum‑safe, no passwords, no cloud.
          </div>
        </div>
      </div>
    </q-card>

    <!-- When not scanning yet: show both picker & scan buttons -->
    <div v-if="!scanning" class="column items-center full-width q-gutter-lg">

      <!-- File picker CTA -->
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

      <!-- Scan‑QR CTA -->
      <q-btn
        v-if="isMobile && !scanning"
        label="Scan QR Code"
        icon="qr_code_scanner"
        class="big-btn full-width"
        unelevated
        color="primary"
        @click="startScan"
      />

    </div>

    <!-- QR‑reader container when scanning -->
    <div v-else id="qr-reader"></div>

  </q-page>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { Platform, Notify } from 'quasar'
import { useRouter, onBeforeRouteLeave  } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import { pendingFile } from 'src/stores/pendingFile'

const router      = useRouter()

function goSend () {
  // stop the camera before navigating
  if (html5Scanner) {
    html5Scanner
      .stop()
      .catch(() => {})
      .finally(() => { router.push('/send') })
  }
  else {
    router.push('/send')
  }
}

function pickDirect (files) {
  if (!files) return
  const f = Array.isArray(files) ? files[0] : files
  if (!f) return

  pendingFile.value = f
  Notify.create(`Loaded “${ f.name }”`)
  // navigate to send flow
  goSend()
}

const isMobile  = Platform.is.mobile
const scanning  = ref(false)
let   html5Scanner = null

Notify.create('Welcome')

async function startScan () {
  console.log('▶ startScan pressed')

  if (window.matchMedia('(display-mode: standalone)').matches) {
    Notify.create('Open in Chrome tab to scan')
    return
  }
  try {
  scanning.value = true
  await nextTick()
  html5Scanner = new Html5Qrcode('qr-reader')
  
  let timeoutId

    // promise race: scanner start OR a 5‑second timeout
  await Promise.race([
      html5Scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        code => {
          console.log('QR decoded:', code)
          html5Scanner.stop()
          scanning.value = false

          let target = code
          try {
            const u = new URL(code)
            // If the QR belongs to the same origin, push only the path
            if (u.origin === window.location.origin) {
              target = u.pathname + u.hash   // hash is usually empty
            }
          } catch {
            Notify.create({ message: `InvalidURL: ${target}`, position: 'bottom' })
          }
          Notify.create({ message: `Going to ${target}`, position: 'bottom' })
          if (target.startsWith('/#/')) {
            target = target.slice(2)   // "/#/submit/XYZ" -> "/submit/XYZ"
          }
          router.push(target)         // now resolves correctly
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
  // always stop the camera if it’s running
  if (html5Scanner) {
    html5Scanner.stop().catch(() => {})
  }
})

// also catch any in‑page navigation (e.g. browser back/forward)
onBeforeRouteLeave((to, from, next) => {
  if (html5Scanner) {
    html5Scanner
      .stop()
      .catch(() => {})
      .finally(() => { next() })
  }
  else {
    next()
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
