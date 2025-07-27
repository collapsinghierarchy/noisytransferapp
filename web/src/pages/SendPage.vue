<template>
  <q-page padding class="column items-center">
    <h5 class="q-mb-md">Send a File</h5>

    <div class="full-width">
    <!-- ───────── File‑picker area ───────── -->
    <template v-if="!file">
      <!-- Modern browsers with showOpenFilePicker -->
      <q-btn
        v-if="canUseFS"
        flat
        icon="attach_file"
        label="Choose File"
        @click="chooseFile"
      />

      <!-- Fallback <input type=file> for older browsers -->
      <q-file
        v-else
        v-model="file"
        outlined
        use-chips
        accept="*/*"
        label="Choose File"
        class="full-width app-input"
      />
    </template>

    <!-- Once a file is chosen (picker or share), show its name -->
    <div v-else class="q-pa-md">
      <q-icon name="insert_drive_file" class="q-mr-sm" />
      <span>{{ file.name }}</span>
    </div>
</div>
  <q-btn
    label="Start Pairing"
    icon="link"
    class="app-btn app-btn-primary app-action"
    :disable="!file"
    @click="startSend"
  />

    <q-input
      v-if="shareLink"
      v-model="shareLink"
      readonly
      label="Share Link"
      class="full-width app-input"
    >
      <template #append>
        <q-btn flat dense icon="content_copy" @click="copyLink" />
      </template>
    </q-input>

      <q-btn
      v-if="isMobile && shareLink"
      class="q-mt-md"
      color="primary"
      icon="share"
      label="Share…"
      @click="nativeShare"
    />

   <div
        v-if="shareLink"
        class="q-mt-lg text-center"
        style="display: inline-block; background: #fff; padding: 16px; border-radius: 8px;"
      >
        <qrcode-vue
          tag="img"
          :value="shareLink"
          :size="300"
          level="H"
          :margin="4"
        />
    </div>

    <!-- SAS dialog -->
    <q-dialog :model-value="showSasDialog" persistent>
      <q-card class="sas-card q-pa-lg">
        <q-card-section>
          <div class="text-h6 text-center">Verify 6‑digit code</div>
          <div class="text-h4 text-primary text-center q-mt-md">{{ sas }}</div>
        </q-card-section>
        <q-card-actions class="justify-around">
          <q-btn flat color="negative" label="Reject" @click="rejectTransfer" />
          <q-btn flat color="positive" label="Confirm" @click="confirmTransfer" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-linear-progress
      v-if="progress >= 0"
      :value="progress"
      color="primary"
      class="full-width app-progress"
    />
  </q-page>
</template>

<script setup>
import { ref, watch, computed, onMounted }   from 'vue'
import { Notify, copyToClipboard, Platform } from 'quasar'
import { senderFlow, makeUUID } from 'src/lib/noise.js'
import { useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

const router = useRouter()
const isMobile = Platform.is.mobile

async function nativeShare () {
  try {
    await navigator.share?.({
      title: 'Noisytransfer',
      text : 'Receive my file securely',
      url  : shareLink.value
    })
  } catch (err) {
    if (err?.name !== 'AbortError') {
      Notify.create({ type: 'negative', message: err.message })
    }
  }
}

/* ----------feature‑detect File System Access ---------- */
const canUseFS = 'showOpenFilePicker' in window
const file = ref(null)

/* ----------modern file picker ---------- */
async function chooseFile () {
  try {
     const [handle] = await window.showOpenFilePicker({
        id: 'noisytransfer'   // (optional) keeps a sticky picker directory
      })
    file.value = await handle.getFile()
  } catch (err) {
    if (err?.name !== 'AbortError') {
      Notify.create({ type: 'negative', message: err.message })
    }
  }
}

const shareLink = ref('')
const sas = ref('')
const progress = ref(-1)
const confirmed = ref(false)
const rejected = ref(false)

const showSasDialog = computed(() => !!sas.value && !confirmed.value && !rejected.value)

// watch for any incoming shared file and notify / trigger send
watch(file, newFile => {
  if (!newFile) return
    Notify.create(`Loaded via share: “${newFile.name}”`)
    startSend()
  
})


function confirmTransfer() {
  confirmed.value = true
}
function rejectTransfer() {
  rejected.value = true
  router.back()
}

onMounted(() => {
  // Fallback for browsers that deliver via the SW message
  navigator.serviceWorker?.addEventListener('message', (evt) => {
    if (evt.data?.type === 'share-target-files') {
      const incoming = evt.data.files
      file.value = incoming[0]
      Notify.create(`Received “${incoming[0].name}” via share sheet`)
    }
  })

  // Optional: Launch Handler API (Chrome 113+)
  if ('launchQueue' in window) {
    launchQueue.setConsumer(async ({ files: lf }) => {
      if (!lf?.length) return
      file.value = lf[0]
      Notify.create(`Received “${lf[0].name}” via share sheet`)
    })
  }
})

async function startSend() {
  if (!file.value) return
  const channelID = makeUUID();
  senderFlow(router, file.value, channelID, {
    onShareLink: link => shareLink.value = link,
    onSAS: code => sas.value = code,
    waitConfirm: () => new Promise(res => {
      const stop = watch(confirmed, v => { if (v) { stop(); res() } })
    }),
    onProgress: pct => progress.value = pct,
    onDone: () => Notify.create({ type: 'positive', message: 'Transfer complete' }),
    onError: err => Notify.create({ type: 'negative', message: err.toString() })
  })
}

async function copyLink() {
  await copyToClipboard(shareLink.value)
  Notify.create('Link copied')
}
</script>

<style scoped lang="scss">
.full-width { width: 100%; }
.app-input { margin-top: 16px; }
.app-action { margin-top: 24px; min-width: 200px; }
.app-progress { margin-top: 32px; }

/* bigger SAS dialog */
.sas-card { min-width: 360px; max-width: 90vw; }
</style>
