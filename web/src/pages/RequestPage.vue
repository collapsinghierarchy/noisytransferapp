<template>
  <q-page padding class="column items-center q-pa-md">
    <h5 class="q-mb-md">Request a File</h5>

    <!-- Share Link and QR Code -->
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

    <!-- Loading indicator before shareLink is ready -->
    <div v-else class="column items-center q-gutter-md">
      <q-spinner size="xl" color="primary" />
      <div>Initializing request...</div>
    </div>

   <!-- SAS Verification Dialog -->
   <q-dialog v-model="showSasDialog" persistent>
     <q-card class="sas-card q-pa-lg">
       <q-card-section class="text-center">
         <div class="text-h6">Confirm 6‑digit code</div>
         <div class="text-h4 text-primary q-mt-md">{{ sas }}</div>
       </q-card-section>
        <q-card-actions align="around">
          <q-btn flat color="negative" label="Reject" @click="rejectTransfer" />
          <q-btn flat color="positive" label="Confirm" @click="confirmTransfer" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Progress Bar -->
    <q-linear-progress
      v-if="progress >= 0"
      :value="progress"
      color="primary"
      class="full-width q-mt-lg"
    />

    <!-- Download Link on Done -->
    <div v-if="done && fileUrl" class="column items-center q-gutter-md q-mt-lg">
      <q-btn
        flat
        icon="download"
        label="Download {{ fileName }}"
        @click="downloadFile"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted , watch} from 'vue'
import { useRouter } from 'vue-router'
import { Notify, copyToClipboard } from 'quasar'
import QrcodeVue from 'qrcode.vue'
import { receiverFlow, makeUUID } from 'src/lib/noise.js'

// Reactive state
const router = useRouter()
const channelID = makeUUID()

const shareLink = ref('')
const sas = ref('')
const confirmed     = ref(false)
const rejected      = ref(false)
const showSasDialog = ref(false)   
const progress = ref(-1)
const done = ref(false)
const fileName = ref('file.bin')
const fileUrl = ref('')


// Computed flag for showing SAS dialog

// Copy link to clipboard
async function copyLink() {
  await copyToClipboard(shareLink.value)
  Notify.create({ message: 'Link copied', color: 'positive' })
}

// Confirm or reject SAS code
function confirmTransfer() {
  confirmed.value     = true
  showSasDialog.value = false   // hide the dialog
}
function rejectTransfer() {
  rejected.value      = true
  showSasDialog.value = false
  router.push({ name: 'IndexPage' })
}

// Initiate receiverFlow on mount
onMounted(() => {
  // Build and display shareable link
  shareLink.value = `${window.location.origin}/#/submit/${channelID}`

  // Start the pairing + transfer flow
  receiverFlow(router, channelID, {
    onSAS: code => {
      sas.value           = code
      showSasDialog.value = true     // open the dialog
    },
    waitConfirm: () => new Promise(res => {
      // resolve only when the user clicks Confirm
      const stop = watch(confirmed, v => {
        if (v) {
          stop()
          res()
        }
      })
    }),
    onProgress: pct => { progress.value = pct },
    onDone: ({ fileName: fn, url }) => {
      fileName.value = fn
      fileUrl.value = url
      done.value = true
      Notify.create({ message: 'File received!', color: 'positive' })
    },
    onError: err => {
      Notify.create({ message: err.toString(), color: 'negative' })
      router.push({ name: 'IndexPage' })
    }
  })
})

// Trigger file download
function downloadFile() {
  const a = document.createElement('a')
  a.href = fileUrl.value
  a.download = fileName.value
  a.click()
}
</script>

<style scoped>
.full-width { width: 100%; }
.app-input { margin-top: 16px; }
.app-action { margin-top: 24px; min-width: 200px; }
.app-progress { margin-top: 32px; }

/* bigger SAS dialog */
.sas-card { min-width: 360px; max-width: 90vw; }
</style>
