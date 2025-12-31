import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import { user } from '@/stores/user.js'

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
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
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
      meta: { requiresAuth: true },
      children: [
        { path: '', component: ProfilePage },
        { path: 'billing', component: BillingPage },
        { path: 'settings', component: SettingsPage }
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
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('../views/WelcomePage.vue'),
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('../views/BlogPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/blog/view/:id',
      name: 'blogView',
      component: () => import('../views/BlogViewPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/friends',
      name: 'friends',
      component: () => import('../views/FriendsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/user/:handle',
      name: 'publicProfile',
      component: () => import('../views/PublicProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/about-company',
      name: 'aboutCompany',
      component: () => import('../views/AboutCompanyPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/employment',
      name: 'employment',
      component: () => import('../views/EmploymentPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/help-desk',
      name: 'helpDesk',
      component: () => import('../views/HelpDeskPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/company-portal',
      name: 'companyPortal',
      component: () => import('../views/CompanyPortalPage.vue'),
      meta: { requiresAuth: true },
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // Fetch user if not already loaded
    if (!user.username) {
      await user.fetchUser()
    }

    if (!user.username) {
      // Not logged in, redirect to about page
      next({ name: 'about' })
    } else if (to.matched.some(record => record.meta.requiresAdmin)) {
      // Check for admin permission
      try {
        const res = await fetch('/api/auth/can/admin_access', {
          credentials: 'include'
        })
        const data = await res.json()
        if (data.has_permission) {
          next()
        } else {
          // Not an admin, redirect to breakroom
          next({ name: 'breakroom' })
        }
      } catch (err) {
        next({ name: 'breakroom' })
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
