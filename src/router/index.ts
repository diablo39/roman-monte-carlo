import { createRouter, createWebHistory } from 'vue-router'
import MonteCarlo from '../views/MonteCarlo.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MonteCarlo,
    },
  ],
})

export default router
