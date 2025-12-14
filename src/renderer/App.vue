<template>
  <!-- T016: Base layout component -->
  <AppLayout />
</template>

<script setup lang="ts">
import AppLayout from './components/AppLayout.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    sans-serif;
  font-size: 14px;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
