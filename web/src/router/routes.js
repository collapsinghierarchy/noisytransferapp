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
      { path: 'receive/:id', component: () => import('pages/ReceivePage.vue') },
      {
        path: 'request',
        component: () => import('pages/RequestPage.vue')
      },
      {
        path: 'submit/:id',
        component: () => import('pages/SubmitPage.vue')
      },
    ]
  },

  // Catch‑all 404
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') }
]

export default routes

