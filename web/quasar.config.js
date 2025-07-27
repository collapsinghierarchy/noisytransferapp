// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers'

export default defineConfig((/* ctx */) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [
      'axios'
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: [
      'app.scss'
    ],
    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: [ 'es2022', 'firefox115', 'chrome115', 'safari14' ],
        node: 'node20'
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      // env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},
    vitePlugins: [
      ['vite-plugin-checker', {
        eslint: {
          lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
          useFlatConfig: true
          }
        }, { server: false }]
      ]
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      open: true, // opens browser window automatically
      hmr: true
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {
        dark: 'auto'
      },
      // iconet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: [ 'Notify', 'Dialog']
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
                      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render' // keep this as last one
      ],

      // extendPackageJson (json) {},
      // extendSSRWebserverConf (esbuildConf) {},

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: true
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'InjectManifest', // 'GenerateSW' or 'InjectManifest'
       workbox: {
        swSrc: 'src-pwa/custom-service-worker.js',
      },
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      // extendManifestJson (json) {},
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      // extendPWACustomSWConf (esbuildConf) {},
      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
      manifest: {
        name: 'Noisytransfer',
        short_name: 'Noisytransfer',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#027be3',
        scope           : '/',   
        share_target: {              // ⬅︎ NEW
          action : '/share-target',          // handled by the SW below
          method : 'POST',
          enctype: 'multipart/form-data',
          params : {
            title: 'title',
            text : 'text',
            files: [{
              name  : 'file',         // <input name="file">
              accept: ['*/*']         // or restrict to 'image/*' etc.
            }]
          }
        },
        icons: [
         // your Android launch icons
         { src: 'android/android-launchericon-512-512.png', sizes: '512x512', type: 'image/png' },
         { src: 'android/android-launchericon-192-192.png', sizes: '192x192', type: 'image/png' },
         { src: 'android/android-launchericon-144-144.png', sizes: '144x144', type: 'image/png' },
         { src: 'android/android-launchericon-96-96.png',  sizes: '96x96',   type: 'image/png' },
         { src: 'android/android-launchericon-72-72.png',  sizes: '72x72',   type: 'image/png' },
         { src: 'android/android-launchericon-48-48.png',  sizes: '48x48',   type: 'image/png' },

         // your iOS icon set
         { src: 'ios/16.png',   sizes: '16x16',   type: 'image/png' },
         { src: 'ios/20.png',   sizes: '20x20',   type: 'image/png' },
         { src: 'ios/29.png',   sizes: '29x29',   type: 'image/png' },
         { src: 'ios/32.png',   sizes: '32x32',   type: 'image/png' },
         { src: 'ios/40.png',   sizes: '40x40',   type: 'image/png' },
         { src: 'ios/50.png',   sizes: '50x50',   type: 'image/png' },
         { src: 'ios/57.png',   sizes: '57x57',   type: 'image/png' },
         { src: 'ios/58.png',   sizes: '58x58',   type: 'image/png' },
         { src: 'ios/60.png',   sizes: '60x60',   type: 'image/png' },
         { src: 'ios/64.png',   sizes: '64x64',   type: 'image/png' },
         { src: 'ios/72.png',   sizes: '72x72',   type: 'image/png' },
         { src: 'ios/76.png',   sizes: '76x76',   type: 'image/png' },
         { src: 'ios/80.png',   sizes: '80x80',   type: 'image/png' },
         { src: 'ios/87.png',   sizes: '87x87',   type: 'image/png' },
         { src: 'ios/100.png',  sizes: '100x100', type: 'image/png' },
         { src: 'ios/114.png',  sizes: '114x114', type: 'image/png' },
         { src: 'ios/120.png',  sizes: '120x120', type: 'image/png' },
         { src: 'ios/128.png',  sizes: '128x128', type: 'image/png' },
         { src: 'ios/144.png',  sizes: '144x144', type: 'image/png' },
         { src: 'ios/152.png',  sizes: '152x152', type: 'image/png' },
         { src: 'ios/167.png',  sizes: '167x167', type: 'image/png' },
         { src: 'ios/180.png',  sizes: '180x180', type: 'image/png' },
         { src: 'ios/192.png',  sizes: '192x192', type: 'image/png' },
         { src: 'ios/256.png',  sizes: '256x256', type: 'image/png' },
         { src: 'ios/512.png',  sizes: '512x512', type: 'image/png' },
         { src: 'ios/1024.png', sizes: '1024x1024', type: 'image/png' }
       ]
      }
    },
    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf) {},
      // extendElectronPreloadConf (esbuildConf) {},

      // extendPackageJson (json) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: [ 'electron-preload' ],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',

        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'noisytransfer'
      }
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: []
    }
  }
})
