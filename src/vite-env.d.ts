/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// File Handling API types not yet in standard TypeScript lib
interface LaunchParams {
  files: FileSystemFileHandle[];
  targetURL: string;
}

interface LaunchQueue {
  setConsumer(callback: (launchParams: LaunchParams) => void): void;
}

interface Window {
  launchQueue?: LaunchQueue;
}
