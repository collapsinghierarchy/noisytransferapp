// src/router/routes.js
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      // your index
      { path: '',          component: () => import('pages/IndexPage.vue') },

      // Send page (optional ID)
      { path: 'send/:id?', component: () => import('pages/SendPage.vue') },

      // Request page (requires ID)
      { path: 'request/:id', component: () => import('pages/RequestPage.vue') },
    ]
  },

  // Catch‑all 404
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') }
]

export default routes

