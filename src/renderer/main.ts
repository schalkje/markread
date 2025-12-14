import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter } from './router';
import App from './App.vue';
import './styles/main.css';

// T013: Vue 3 app entry with Composition API
const app = createApp(App);

// T015: Pinia state management
const pinia = createPinia();
app.use(pinia);

// T014: Vue Router
const router = createRouter();
app.use(router);

// T019: Renderer error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err, info);
  // TODO: Send to main process logger (Phase 10)
};

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

app.mount('#app');
