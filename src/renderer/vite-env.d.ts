/// <reference types="vite/client" />

// Declare CSS inline imports for Vite
declare module '*.css?inline' {
  const content: string;
  export default content;
}
