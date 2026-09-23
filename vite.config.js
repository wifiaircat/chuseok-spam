import { defineConfig } from 'vite'

// 상대 경로로 빌드해서 GitHub Pages(/chuseok-spam/)든 다른 호스팅이든 그대로 동작하게 한다.
export default defineConfig({
  base: './',
})
