# NoisyTransfer App

A simple e2e encrypted transfer built with **Quasar** (Vue.js) on the frontend and a Go WebSocket backend [noisytransfer](https://github.com/collapsinghierarchy/noisytransfer). Users share a UUID `appId` to join a room and send e2ee data in real time.

## Features

* **Index Page**: Choose if you want to send a file yourself or to request a file from someone else.
* **Send Page**: Encrypt and send e2ee data blobs over WebSockets.
* **Receive Page**: Prepare everything for others to send you e2ee files.
* **WebSocket communication**: Single `/ws?appID=…` handshake, then bidirectional messaging. The e2ee is realized via hybrid HPKEs (PQC) from [hpke-js](https://github.com/dajiaji/hpke-js), a Short Authentication String (SAS) and a commit-then-reveal protocol to protect against a savvy MitM. (Documentation is ONW)

## Repository Structure

```text
├── src/
│   ├── libs/ 
│       ├── noisy.js         # Contains the actual protocol 
│   ├── pages/
│   │   ├── IndexPage.vue    # Session entry & generation
│   │   ├── SendPage.vue     # UI to send encrypted blobs
│   │   └── RequestPage.vue  # UI to receive/decrypt blobs
│   ├── App.vue
```

## Prerequisites

* **Node.js** v16+ and **npm** or **yarn**
* **Quasar CLI** (`npm i -g @quasar/cli`)
* **Go** 1.18+ (for backend)

## Frontend Setup

1. **Install dependencies**

   ```bash
   cd src
   yarn install    # or npm install
   ```

2. **Configure WebSocket URL**

   In `src/libs/nois.js` set your backend URL:

   ```js
    const WS_BASE = import.meta.env.VITE_WS_URL || (
    (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + 'localhost' + ':1234'
    )
   ```

3. **Start development server**

   ```bash
   quasar dev
   ```
    quasar will tell you what port the app is on.

## Backend Setup (Go)
Check [noisytransfer](https://github.com/collapsinghierarchy/noisytransfer)

## Notes

* Uses **Web Crypto API** and [hpke-js](https://github.com/dajiaji/hpke-js) in the client. 
* Stateless backend; no persistence; on purpose.
