import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'

//Admin views
import AdminLayout from '@/views/admin/AdminLayout.vue'
import AdminUsers from '@/views/admin/AdminUsers.vue'
import AdminPermissions from '@/views/admin/AdminPermissions.vue'
import AdminGroups from '@/views/admin/AdminGroups.vue'
import AdminBilling from '@/views/admin/AdminBilling.vue'

//Profile views
import ProfileLayout from '@/views/profile/ProfileLayout.vue'
import ProfilePage from '@/views/profile/ProfilePage.vue'
import BillingPage from '@/views/profile/ProfileBilling.vue'
import SettingsPage from '@/views/profile/ProfileSettings.vue'

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
        {path: 'users', component: AdminUsers},
        {path: 'permissions', component: AdminPermissions},
        {path: 'groups', component: AdminGroups},
        {path: 'billing', component: AdminBilling}
      ]
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileLayout,
      children: [
        { path: '/home', component: ProfilePage },
        { path: '/billing', component: BillingPage },
        { path: '/settings', component: SettingsPage }
      ]
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
