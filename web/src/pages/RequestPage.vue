<template>
  <q-page padding class="column items-center">
    <h5 class="q-mb-md">Receive a File</h5>

    <!-- SAS verification dialog -->
    <q-dialog :model-value="showSasDialog" persistent>
      <q-card class="sas-card q-pa-lg">
        <q-card-section>
          <div class="text-h6 text-center">Verify 6‑digit code</div>
          <div class="text-h4 text-primary text-center q-mt-md">{{ sas }}</div>
        </q-card-section>
        <q-card-actions align="around">
          <q-btn flat color="negative" label="Reject" @click="rejectTransfer" />
          <q-btn flat color="positive" label="Confirm" @click="confirmTransfer" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- progress bar while receiving -->
    <q-linear-progress
      v-if="progress >= 0 && !downloadUrl"
      :value="progress"
      color="primary"
      class="full-width app-progress"
    />

    <!-- download area -->
    <div v-if="downloadUrl" class="column items-center q-mt-lg">
      <div class="file-name">Saved as <b>{{ fileName }}</b></div>
      <q-btn
        color="primary"
        icon="download"
        label="Download file"
        class="q-mt-md"
        :href="downloadUrl"
        :download="fileName"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { receiverFlow } from 'src/lib/noise.js'

const route = useRoute()
const router = useRouter()

// reactive state ----------------------------------------------------------------
const sas         = ref('')
const progress    = ref(-1)
const fileName    = ref('')
const downloadUrl = ref('')
const confirmed   = ref(false)
const rejected    = ref(false)

// show dialog only after SAS visible and before confirm/reject
const showSasDialog = computed(() => !!sas.value && !confirmed.value && !rejected.value)

// dialog actions ----------------------------------------------------------------
function confirmTransfer () { confirmed.value = true }
function rejectTransfer  () {
  rejected.value = true
  router.back()
}

// main flow ---------------------------------------------------------------------
onMounted(() => {
  const channelID = route.params.id
  if (!channelID) {
    Notify.create({ type: 'negative', message: 'Missing channel ID' })
    router.back()
    return
  }

  receiverFlow(router, channelID, {
    onSAS: code => (sas.value = code),
    waitConfirm: () =>
      new Promise(res => {
        const stop = watch(confirmed, v => {
          if (v) {
            stop()
            res()
          }
        })
      }),
    onProgress: pct => (progress.value = pct),
    onDone: ({ fileName: fn, url }) => {
      fileName.value   = fn
      downloadUrl.value = url
      Notify.create({ type: 'positive', message: 'Transfer complete' })
    },
    onError: err => Notify.create({ type: 'negative', message: err.toString() }),
  })
})
</script>

<style scoped lang="scss">
.full-width  { width: 100%; }
.app-progress { margin-top: 32px; }
.file-name   { font-size: 1.1rem; }
.sas-card    { min-width: 360px; max-width: 90vw; }
</style>
