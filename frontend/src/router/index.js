import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'

//Admin views
import AdminLayout from '@/views/admin/AdminLayout.vue'
import AdminUsers from '@/views/admin/AdminUsers.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutPage.vue'),
    },
    {
      path: '/breakroom',
      name: 'breakroom',
      component: () => import('../views/BreakroomPage.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminLayout,
      children: [
        {path: 'users', component: AdminUsers}
      ]
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfilePage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginPage.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignupPage.vue'),
    },
    {
      path: '/verify',
      name: 'verify',
      component: () => import('../views/VerifyPage.vue'),
    }
  ],
})

export default router
