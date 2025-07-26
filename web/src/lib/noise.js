// High‑level pairing + file‑transfer helpers
import { CipherSuite, Aes128Gcm, HkdfSha256, HpkeError } from '@hpke/core'
import { HybridkemX25519Kyber768 } from '@hpke/hybridkem-x25519-kyber768'
import { v4 as uuidv4 } from 'uuid'


const cryptoAPI = window.crypto;
// grab method refs so they can’t be shadowed
const getRandomValues = cryptoAPI.getRandomValues.bind(cryptoAPI);
const subtle          = cryptoAPI.subtle;

export function makeUUID () {
  if (typeof cryptoAPI.randomUUID === 'function') {
    return cryptoAPI.randomUUID()
  }
  return uuidv4()
}

/*********************************
 * Internal helpers
 *********************************/
const suite = () => new CipherSuite({
  kem: new HybridkemX25519Kyber768(),
  kdf: new HkdfSha256(),
  aead: new Aes128Gcm(),
})

const WS_BASE = import.meta.env.VITE_WS_URL ||
  "wss://api.whitenoise.systems/v1";

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
const sha256 = async u8 => new Uint8Array(await subtle.digest('SHA-256', u8))

async function keypairB64 () {
  const kp = await suite().kem.generateKeyPair({ extractable: true })
  return {
    pub: b64(await suite().kem.serializePublicKey(kp.publicKey)),
    priv: kp.privateKey,
  }
}

// Concatenate (little helper)
const concat = (...bufs) => {
  const len = bufs.reduce((n, b) => n + b.byteLength, 0)
  const out = new Uint8Array(len)
  let off = 0
  for (const b of bufs) { out.set(new Uint8Array(b), off); off += b.byteLength }
  return out.buffer
}

/**
 * Deterministic Short Authentication String.
 * Both parties call this with identical inputs ➜ identical 4‑emoji code.
 */
async function sas(pkB,
                   nonceB,
                   nonceA,
                   vkA,
                   algA) {

  // transcript =  pkB || nonceB || nonceA || vkA || algId
  const transcript = concat(
    pkB,
    nonceB.buffer,
    nonceA.buffer,
    vkA,
    new TextEncoder().encode(algA)   // keeps future‑proof choice of scheme
  )

  const hash = await subtle.digest('SHA-256', transcript)
  const num = new DataView(hash).getUint32(0) & 0xfffff
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
// signature helpers -------------------------------------------------------------

async function genRSAPSS() {
  const { publicKey, privateKey } = await subtle.generateKey(
    { name: 'RSA-PSS', modulusLength: 3072,
      publicExponent: new Uint8Array([1,0,1]),
      hash: 'SHA-256'
    },
    true,
    ['sign','verify']
  );
  const spki = await subtle.exportKey('spki', publicKey);
  return { verificationKey: new Uint8Array(spki), signingKey: privateKey };
}


const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
     .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')


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
  ws.addEventListener("open", () => {
  console.log("▶️ WebSocket open");
    // Immediately send your “hello” or “subscribe” if required:
    ws.send(JSON.stringify({ type: "hello i'm Sender" }));
  });
  ws.addEventListener('error', onError)
  // state ----------------------------------------------------------------
  let ephemSigningKey = null       // keep only while you need to sign
  let ephemVKRaw = null              // 32 B Ed25519  | 384 B RSA‑PSS
  let algUsed = null

  let receiverCommit = null
  let nonceA = null
  let receiverPub = null
  let receiverNonce = null
  let ackResolve = null
  let rcvConfirmReceived = false
  let rcvConfirmResolve = null
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
    ws.addEventListener('message', async ev => {
      const msg = JSON.parse(ev.data)
      
      // Phase 1: Receive commitment
   if (msg.type === 'commit') {
    receiverCommit = msg.commit

    nonceA = getRandomValues(new Uint8Array(16))
    const { verificationKey, signingKey } = await genRSAPSS()
    ephemVKRaw = verificationKey
    ephemSigningKey = signingKey
    algUsed = 'RSA-PSS'
      

      ws.send(JSON.stringify({
        type:  'nonce',
        alg:   algUsed,
        nonce: b64url(nonceA),
        vk:    b64url(ephemVKRaw) 
      }))
    }
        
      // Phase 3: Receive reveal
      if (msg.type === 'reveal') {
        // Verify commitment
        const computedCommit = b64(await sha256(enc(msg.pk + b64(unb64(msg.nonceB)))))
        if (computedCommit !== receiverCommit) {
          throw new Error('Commitment verification failed')
        }
        
        const pkBytes = unb64(msg.pk)        // Uint8Array
        receiverPub   = pkBytes.buffer       // ArrayBuffer
        receiverNonce = unb64(msg.nonceB)
        onSAS(await sas(receiverPub, receiverNonce, nonceA, ephemVKRaw.buffer, algUsed))
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
    const signChunk = async (data) =>
      new Uint8Array(await subtle.sign(
        { name: algUsed, ...(algUsed === 'RSA-PSS' && { saltLength: 32 }) },
        ephemSigningKey,
        data
      ))

    const pubKey = await suite().kem.deserializePublicKey(new Uint8Array(receiverPub))
    let sent = 0
    const reader = file.stream().getReader()

   while (true) {
    const { value, done } = await reader.read()
    if (done) break

    await new Promise(resolve => {
      ackResolve = resolve

      suite().createSenderContext({ recipientPublicKey: pubKey })
        .then(async ctx => {
          const ct    = new Uint8Array(await ctx.seal(value))
          const enc   = ctx.enc        // KEM encapsulation
          const toSig = concat(enc, ct)                // what we’ll sign
          const sig   = await signChunk(toSig)

          ws.send(JSON.stringify({
            type: 'cipher',
            enc: b64(enc),
            ct:  b64(ct),
            sig: b64(sig)             // NEW
            // no need to repeat alg – peer learned it in Phase 2
          }))
        })
        .catch(e => {
          onError(e)
          ws.close(1008, 'Encryption failed')
          resolve()
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
  ws.addEventListener("open", () => {
  console.log("▶️ WebSocket open");
    // Immediately send your “hello” or “subscribe” if required:
    ws.send(JSON.stringify({ type: "hello i'm Receiver" }));
  });
    // top‑level state
  let vkA = null       // sender's verification key in raw form
  let algA = null

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
    const nonceB = getRandomValues(new Uint8Array(16))

    // Phase 1: Wait for sender's nonce
    const commitment = b64(await sha256(enc(pkB + b64(nonceB))))
    ws.send(JSON.stringify({ type: 'commit', commit: commitment }))

    const skBytes = skBcrypto instanceof CryptoKey
      ? new Uint8Array(await subtle.exportKey('raw', skBcrypto))
      : skBcrypto

    let chunks = []
    let received = 0
    let totalChunks = 0
    let fileName = 'download.bin'
    let nonceA = null
    let sndConfirmReceived = false
    let sndConfirmResolve = null
    let senderVerifyKey   // keep as long as file transfer lives

    ws.addEventListener('message', async ev => {
      const msg = JSON.parse(ev.data)
      
  if (msg.type === 'nonce') {
      // (1) pull fields out
      nonceA = unb64(msg.nonce)               // Uint8Array(16)
      vkA    = unb64(msg.vk)                  // ArrayBuffer (32 B or 384 B)
      algA   = msg.alg ?? 'Ed25519'           // default if omitted
      senderVerifyKey = await subtle.importKey(
        algA === 'Ed25519' ? 'raw' : 'spki',
        vkA,
        { name: algA, hash: 'SHA-256' },
        false, ['verify']
      )

      // (2) OPTIONAL: stash an imported key in case you ever verify later
      // const senderVK = await crypto.subtle.importKey(
      //   algA === 'Ed25519' ? 'raw' : 'spki',
      //   vkA,
      //   { name: algA, hash: 'SHA-256' },
      //   false, ['verify']
      // )

      // ── Phase 3: send reveal ─────────────────────────────────────────
      ws.send(JSON.stringify({
        type: 'reveal',
        pk:    pkB,                // your static or semi‑static key
        nonceB: b64(nonceB)
      }))

      const pkBBytes = unb64(pkB)              // Uint8Array
      const pkBBuf   = pkBBytes.buffer           // ArrayBuffer
      // ── Compute and display SAS (now binds vkA) ─────────────────────
      onSAS(await sas(pkBBuf, nonceB, nonceA, vkA, algA))

      // ── Usual confirmation dance ────────────────────────────────────
      await waitConfirm()

      if (!sndConfirmReceived) {
        await new Promise(resolve => { sndConfirmResolve = resolve })
      }
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
        const enc = unb64(msg.enc)       // Uint8Array
        const ct  = unb64(msg.ct)        // Uint8Array
        const sig = unb64(msg.sig)       // Uint8Array

        // (1) verify ---------------------------------------------------
        const ok = await subtle.verify(
          { name: algA, ...(algA === 'RSA-PSS' && { saltLength: 32 }) },
          senderVerifyKey,
          sig,
          concat(enc, ct)                // same byte order as sender
        )
        if (!ok) {
          onError(new Error('Bad signature on ciphertext chunk'))
          ws.close(1008, 'Signature failure')
          return
        }

        try {
          const ctx = await suite().createRecipientContext({
            recipientKey: skBytes,
            enc,
          })
          const pt = await ctx.open(ct)
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