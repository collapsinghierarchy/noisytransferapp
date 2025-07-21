// High‑level pairing + file‑transfer helpers
import { CipherSuite, Aes128Gcm, HkdfSha256, HpkeError } from '@hpke/core'
import { HybridkemX25519Kyber768 } from '@hpke/hybridkem-x25519-kyber768'

/*********************************
 * Internal helpers
 *********************************/
const suite = () => new CipherSuite({
  kem: new HybridkemX25519Kyber768(),
  kdf: new HkdfSha256(),
  aead: new Aes128Gcm(),
})

const WS_BASE = import.meta.env.VITE_WS_URL || (
  "wss://" + 'pseudocrypt.site'
)

// ---- Base‑64 helpers (URL‑safe tolerant) --------------------------
const b64 = data => {
  const u8 = data instanceof ArrayBuffer ? new Uint8Array(data) : data
  if (!u8 || typeof u8[Symbol.iterator] !== 'function') {
    throw new TypeError('b64() expected Uint8Array/ArrayBuffer, got: ' + data)
  }
  return btoa(String.fromCharCode(...u8))
}
const unb64 = str => {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = str.length % 4
  if (pad) str += '='.repeat(4 - pad)
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

const enc = s => new TextEncoder().encode(s)
const sha256 = async u8 => new Uint8Array(await crypto.subtle.digest('SHA-256', u8))

async function keypairB64 () {
  const kp = await suite().kem.generateKeyPair({ extractable: true })
  return {
    pub: b64(await suite().kem.serializePublicKey(kp.publicKey)),
    priv: kp.privateKey,
  }
}

// Modified SAS function for one-sided PK
async function sas (pkB64, nonceBU8, nonceAU8) {
  const input = pkB64 + b64(nonceBU8) + b64(nonceAU8) + 'sas'
  const bits = await sha256(enc(input))
  const num = new DataView(bits.buffer).getUint32(0) & 0xfffff
  return num.toString().padStart(6, '0')
}

/**
 * Trigger a download and return the blob URL.
 */
function saveBlob (chunks, name) {
  const blob = new Blob(chunks)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  return url
}

/*********************************
 * Exported high‑level flows
 *********************************/

/* ------------------------------------------------------------------
 *  SENDER - Uses receiver's ephemeral PK for all encryptions
 * ---------------------------------------------------------------- */
export async function senderFlow (
  router,
  file,
  channelID,
  {
    onShareLink = () => {},
    onSAS = () => {},
    waitConfirm = () => Promise.resolve(),
    onProgress = () => {},
    onDone = () => {},
    onError = console.error,
  } = {}
) {
  const ws = new WebSocket(`${WS_BASE}/ws?appID=${channelID}`)
  ws.addEventListener('error', onError)
  try {

  // 1) Signal “I’m here” to the receiver
  await new Promise(res => ws.addEventListener('open', res))
  onShareLink(`${location.origin}/#/receive/${channelID}`)

  // 2) Wait exactly once for the server’s peer‑join event
  await new Promise(resolve => {
    const listener = ev => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'room_full') {
        ws.removeEventListener('message', listener)
        resolve()
      }
    }
    ws.addEventListener('message', listener)
  })


   // 3) Now wait for the receiver’s commitment…
    let receiverCommit = null
    let nonceA = null
    let receiverPub = null
    let receiverNonce = null
    let ackResolve = null
    let rcvConfirmReceived = false
    let rcvConfirmResolve = null

    ws.addEventListener('message', async ev => {
      const msg = JSON.parse(ev.data)
      
      // Phase 1: Receive commitment
      if (msg.type === 'commit') {
        receiverCommit = msg.commit
        nonceA = crypto.getRandomValues(new Uint8Array(16))
        ws.send(JSON.stringify({ type: 'nonce', nonce: b64(nonceA) }))
      }
      
      // Phase 3: Receive reveal
      if (msg.type === 'reveal') {
        // Verify commitment
        const computedCommit = b64(await sha256(enc(msg.pk + b64(unb64(msg.nonceB)))))
        if (computedCommit !== receiverCommit) {
          throw new Error('Commitment verification failed')
        }
        
        receiverPub = msg.pk
        receiverNonce = unb64(msg.nonceB)
        onSAS(await sas(receiverPub, receiverNonce, nonceA))
      }
      
      // Handle receiver confirmation
      if (msg.type === 'rcvconfirm') {
        rcvConfirmReceived = true;
        if (rcvConfirmResolve) {
          rcvConfirmResolve();
          rcvConfirmResolve = null;
        }
      }
      
      // Handle ACK for flow control
      if (msg.type === 'ack') {
        if (ackResolve) {
          ackResolve()
          ackResolve = null
        }
      }
    })

    // Wait for local SAS confirmation
    await waitConfirm()
    
    // Send sender confirmation to receiver
    ws.send(JSON.stringify({ type: 'sndconfirm' }))
    
    // Wait for receiver's SAS confirmation
    if (!rcvConfirmReceived) {
      await new Promise(resolve => {
        rcvConfirmResolve = resolve;
      });
    }
    
    if (!receiverPub) {
      throw new Error('Receiver public key not received')
    }

    // Encrypt file using receiver's public key
    const pubKey = await suite().kem.deserializePublicKey(unb64(receiverPub))
    let sent = 0
    const reader = file.stream().getReader()
    
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      // Create ack waiter for this chunk
      await new Promise(resolve => {
        ackResolve = resolve
        
        // Encrypt and send
        suite().createSenderContext({ recipientPublicKey: pubKey })
          .then(async ctx => {
            const ct = await ctx.seal(value)
            ws.send(JSON.stringify({
              type: 'cipher',
              enc: b64(ctx.enc),
              ct: b64(new Uint8Array(ct))
            }))
          })
          .catch(e => {
            onError(e)
            ws.close(1008, 'Encryption failed')
            resolve() // Ensure we don't hang
          })
      })

      sent += value?.length || 0
      onProgress(sent / file.size)
    }

    ws.send(JSON.stringify({ type: 'close', name: file.name }))
    onDone()
    router.push('/') 
  } catch (e) {
    onError(e)
    ws.close(1008, e.message)
  }
}

/* ------------------------------------------------------------------
 *  RECEIVER - Generates an ephemeral key pair for session
 * ---------------------------------------------------------------- */
export async function receiverFlow (
  router,
  channelID,
  {
    onSAS = () => {},
    waitConfirm = () => Promise.resolve(),
    onProgress = () => {},
    onDone = () => {},
    onError = console.error,
  } = {}
) {
  const ws = new WebSocket(`${WS_BASE}/ws?appID=${channelID}`)
  
  try {
    await new Promise(res => ws.addEventListener('open', res))

    // Wait exactly once for the server’s peer‑join event
    await new Promise(resolve => {
      const listener = ev => {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'room_full') {
          ws.removeEventListener('message', listener)
          resolve()
        }
      }
      ws.addEventListener('message', listener)
    })


    // Receiver generates key pair and nonce
    const { pub: pkB, priv: skBcrypto } = await keypairB64()
    const nonceB = crypto.getRandomValues(new Uint8Array(16))

    // Phase 1: Wait for sender's nonce
    const commitment = b64(await sha256(enc(pkB + b64(nonceB))))
    ws.send(JSON.stringify({ type: 'commit', commit: commitment }))

    const skBytes = skBcrypto instanceof CryptoKey
      ? new Uint8Array(await crypto.subtle.exportKey('raw', skBcrypto))
      : skBcrypto

    let chunks = []
    let received = 0
    let totalChunks = 0
    let fileName = 'download.bin'
    let nonceA = null
    let sndConfirmReceived = false
    let sndConfirmResolve = null

    ws.addEventListener('message', async ev => {
      const msg = JSON.parse(ev.data)
      
      // Phase 2: Receive sender's nonce
      if (msg.type === 'nonce') {
        nonceA = unb64(msg.nonce)
        
        // Phase 3: Send reveal
        ws.send(JSON.stringify({
          type: 'reveal',
          pk: pkB,
          nonceB: b64(nonceB)
        }))
        
        // Compute SAS
        onSAS(await sas(pkB, nonceB, nonceA))
        
        // Wait for local SAS confirmation
        await waitConfirm()
        
        // Wait for sender's confirmation
        if (!sndConfirmReceived) {
          await new Promise(resolve => {
            sndConfirmResolve = resolve
          })
        }
        
        // Send receiver confirmation
        ws.send(JSON.stringify({ type: 'rcvconfirm' }))
        return
      }

      // Handle sender confirmation
      if (msg.type === 'sndconfirm') {
        sndConfirmReceived = true
        if (sndConfirmResolve) {
          sndConfirmResolve()
          sndConfirmResolve = null
        }
        return
      }
      
      // File transfer
      if (msg.type === 'cipher') {
        totalChunks++
        try {
          const ctx = await suite().createRecipientContext({
            recipientKey: skBytes,
            enc: unb64(msg.enc),
          })

          const pt = await ctx.open(unb64(msg.ct))
          chunks.push(pt)
          received += pt.byteLength
          onProgress(totalChunks > 0 ? received : 0)

          // Send ACK immediately after processing
          ws.send(JSON.stringify({ type: 'ack' }))
        } catch (err) {
          const root = err?.cause ?? err
          const nice = root instanceof HpkeError && root.code === 1
            ? 'Integrity check failed'
            : root.message
          onError(new Error(nice))
          ws.close(1011, 'hpke decrypt failed')
        }
        return
      }
      
      if (msg.type === 'close') {
        fileName = msg.name || fileName
        const url = saveBlob(chunks, fileName)
        ws.send(JSON.stringify({ type: 'ack' }))
        onDone({ fileName, url, totalChunks })
        router.push('/') 
      }
    })
  } catch (e) {
    onError(e)
    ws.close(1008, e.message)
  }
}