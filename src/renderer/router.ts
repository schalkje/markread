import { createRouter as createVueRouter, createMemoryHistory, RouteRecordRaw } from 'vue-router';

// T014: Vue Router configuration
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./components/AppLayout.vue'),
  },
];

export function createRouter() {
  return createVueRouter({
    history: createMemoryHistory(), // Use memory history for Electron
    routes,
  });
}
