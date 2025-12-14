<template>
  <!-- T016: Base layout component with sidebar/content/toolbar structure -->
  <div class="app-layout">
    <div class="sidebar" v-if="showSidebar">
      <div class="sidebar-header">
        <h2>MarkRead</h2>
      </div>
      <div class="sidebar-content">
        <!-- File tree will go here (Phase 7) -->
        <p>File tree (Phase 7)</p>
      </div>
    </div>

    <div class="main-content">
      <div class="toolbar">
        <button @click="openFile">Open File</button>
        <button @click="toggleSidebar">Toggle Sidebar</button>
      </div>

      <div class="editor-area">
        <div class="welcome" v-if="!currentFile">
          <h1>Welcome to MarkRead</h1>
          <p>Open a markdown file to get started</p>
          <button @click="openFile" class="open-btn">Open File</button>
        </div>

        <div class="markdown-viewer" v-else>
          <!-- Markdown viewer will go here (Phase 3 - US1) -->
          <p>File: {{ currentFile }}</p>
          <p>Markdown viewer coming in Phase 3 (User Story 1)</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showSidebar = ref(true);
const currentFile = ref<string | null>(null);

const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value;
};

const openFile = async () => {
  try {
    const result = await window.electronAPI.file.openFileDialog({});
    if (result.success && result.filePaths && result.filePaths.length > 0) {
      currentFile.value = result.filePaths[0];
    }
  } catch (error) {
    console.error('Failed to open file:', error);
  }
};
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.sidebar {
  width: 250px;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #ddd;
}

.sidebar-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.sidebar-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #ddd;
  display: flex;
  gap: 8px;
}

.toolbar button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.toolbar button:hover {
  background: #f5f5f5;
}

.editor-area {
  flex: 1;
  overflow: auto;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 48px;
}

.welcome h1 {
  font-size: 32px;
  margin-bottom: 16px;
}

.welcome p {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}

.open-btn {
  padding: 12px 24px;
  font-size: 16px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.open-btn:hover {
  background: #0052a3;
}

.markdown-viewer {
  padding: 24px;
}
</style>
