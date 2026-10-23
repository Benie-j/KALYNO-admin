import { createRouter, createWebHashHistory } from 'vue-router'
import { auth, refreshSession } from './auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue')
  },
  {
    path: '/access-denied',
    name: 'access-denied',
    component: () => import('./views/AccessDeniedView.vue')
  },
  {
    path: '/',
    component: () => import('./views/LayoutView.vue'),
    children: [
      {
        path: '',
        name: 'overview',
        component: () => import('./views/OverviewView.vue')
      },
      {
        path: 'defis',
        name: 'challenges',
        component: () => import('./views/ChallengesView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  // Vérification fraîche de la session et du rôle.
  // Toute erreur doit conduire à un refus d'accès.
  try {
    await refreshSession()
  } catch {
    auth.user = null
    auth.isAdmin = false
    auth.ready = true
  }

  if (!auth.user) {
    return to.name === 'login'
      ? true
      : { name: 'login', replace: true }
  }

  if (auth.isAdmin !== true) {
    return to.name === 'access-denied'
      ? true
      : { name: 'access-denied', replace: true }
  }

  if (to.name === 'login' || to.name === 'access-denied') {
    return { name: 'overview', replace: true }
  }

  return true
})

export default router
