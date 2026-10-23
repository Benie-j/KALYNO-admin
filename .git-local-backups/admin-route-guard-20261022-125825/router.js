import { createRouter, createWebHashHistory } from 'vue-router'
import { auth } from './auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
  {
    path: '/',
    component: () => import('./views/LayoutView.vue'),
    children: [
      { path: '', name: 'overview', component: () => import('./views/OverviewView.vue') },
      { path: 'defis', name: 'challenges', component: () => import('./views/ChallengesView.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  if (to.name !== 'login' && !auth.user) return { name: 'login' }
  if (to.name === 'login' && auth.user) return { name: 'overview' }
  return true
})

export default router
