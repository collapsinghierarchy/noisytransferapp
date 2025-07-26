<template>
  <q-page padding class="column items-center">
    <h5 class="q-mb-md">Upload File</h5>

    <div class="full-width">
    <q-btn
      v-if="canUseFS"
      class="full-width app-input"
      color="primary"
      icon="drive_file_move"
      label="Select File"
      @click="chooseFile"
    />

    <q-file
      v-else
      v-model="file"
      outlined
      use-chips
      accept="*/*"
      label="Select File"
      class="full-width app-input"
    />
  </div>
     <q-btn
      label="Start Transfer"
      icon="cloud_upload"
      color="primary"
      class="q-mt-md"
      :disable="!file"
      @click="startSend"
    />

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

    <q-linear-progress
      v-if="progress >= 0"
      :value="progress"
      color="primary"
      class="full-width q-mt-md"
    />
  </q-page>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { senderFlow } from 'src/lib/noise.js'

const route = useRoute()
const router = useRouter()
const canUseFS = 'showOpenFilePicker' in window
const file = ref(null)

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

const progress = ref(-1)
const sas = ref('')
const confirmed     = ref(false)
const rejected      = ref(false)
const showSasDialog = ref(false) 

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

function startSend() {
  if (!file.value) return
  const channelID = route.params.id
  
  senderFlow(router, file.value, channelID, {
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
    onProgress: pct => progress.value = pct,
    onDone: () => Notify.create({ 
      type: 'positive', 
      message: 'File sent successfully' 
    }),
    onError: err => Notify.create({ 
      type: 'negative', 
      message: `Error: ${err.toString()}` 
    })
  })
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