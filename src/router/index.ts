import { createRouter, createWebHistory } from 'vue-router'
import { guardSesionYRol } from './guards'
import { inicioPorRol, useSessionStore } from '@/stores/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'inicio',
      redirect: () => {
        const s = useSessionStore()
        return s.rol ? inicioPorRol(s.rol) : '/login'
      },
    },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { publica: true, titulo: 'Entrar' } },
    {
      path: '/mis-incidencias',
      name: 'mis-incidencias',
      component: () => import('@/views/residente/MisIncidenciasView.vue'),
      meta: { roles: ['residente'], titulo: 'Mis incidencias' },
    },
    {
      path: '/nueva',
      name: 'nueva',
      component: () => import('@/views/residente/NuevaIncidenciaView.vue'),
      meta: { roles: ['residente'], titulo: 'Reportar incidencia' },
    },
    {
      path: '/incidencias/:id',
      name: 'incidencia',
      component: () => import('@/views/IncidenciaDetalleView.vue'),
      props: true,
      meta: { titulo: 'Incidencia' },
    },
    {
      path: '/tablero',
      name: 'tablero',
      component: () => import('@/views/KanbanView.vue'),
      meta: { roles: ['mantenimiento', 'administrador'], titulo: 'Tablero' },
    },
    {
      path: '/panel',
      name: 'panel',
      component: () => import('@/views/admin/DashboardView.vue'),
      meta: { roles: ['administrador'], titulo: 'Panel' },
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('@/views/admin/UsuariosView.vue'),
      meta: { roles: ['administrador'], titulo: 'Usuarios' },
    },
    { path: '/:ruta(.*)*', name: 'no-encontrado', component: () => import('@/views/NotFoundView.vue'), meta: { publica: true, titulo: 'No encontrado' } },
  ],
  scrollBehavior(to, from, guardado) {
    if (guardado) return guardado
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

router.beforeEach(guardSesionYRol)
router.afterEach((to) => {
  document.title = to.meta.titulo ? `${to.meta.titulo} · FixIt` : 'FixIt'
})

export default router
