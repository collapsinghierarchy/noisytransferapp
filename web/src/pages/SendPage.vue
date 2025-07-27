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
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter }  from 'vue-router'
import { Notify }     from 'quasar'
import { makeUUID, senderFlow } from 'src/lib/noise.js'

/* ------------------------------------------------------------------
 * reactive state used in your page
 * ---------------------------------------------------------------- */
const file       = ref(null)     // the File object the user picked / shared
const shareLink  = ref('')
const sas        = ref('')
const progress   = ref(-1)
const confirmed  = ref(false)    // user pressed “Confirm” on the SAS dialog

/* ------------------------------------------------------------------
 * book‑keeping for restarting / cancelling the flow
 * ---------------------------------------------------------------- */
let   flowCancel = () => {}      // no‑op until senderFlow sets it
const channelID  = makeUUID()    // keep the same UUID between restarts

/* ------------------------------------------------------------------
 * function to start (or restart) the sender flow
 * ---------------------------------------------------------------- */
function startSend () {
  if (!file.value) return         // nothing to do

  // 1) cancel any previous run
  flowCancel()

  // 2) launch a fresh senderFlow
  const cancelHandle = senderFlow(
    useRouter(),
    file.value,
    channelID,
    {
      onShareLink: link => shareLink.value = link,
      onSAS      : code => sas.value  = code,
      waitConfirm: () =>
        new Promise(res => {
          const stop = watch(confirmed, ok => {
            if (ok) { stop(); res() }
          })
        }),
      onProgress: pct => progress.value = pct,
      onDone   : ()  => Notify.create('Transfer complete'),
      onError  : err => Notify.create({ type: 'negative', message: err.toString() })
    }
  )

  // 3) remember how to cancel it next time
  flowCancel = cancelHandle.cancel ?? (() => {})
}

/* ------------------------------------------------------------------
 * lifecycle: start once, then auto‑restart on foreground *until* SAS confirmed
 * ---------------------------------------------------------------- */
onMounted(() => {
  if (file.value) startSend()   // first kick‑off

  document.addEventListener('visibilitychange', handleVisibility, false)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibility, false)
  flowCancel()
})

function handleVisibility () {
  if (
    document.visibilityState === 'visible' &&
    file.value &&
    !confirmed.value         // we haven’t confirmed SAS yet
  ) {
    startSend()              // restart the whole flow
  }
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
