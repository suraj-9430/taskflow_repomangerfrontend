import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskflow.pro',
  appName: 'TaskFlow Pro',
  webDir: 'dist/TaskFlow-pro/browser',
  android: {
    backgroundColor: '#111318', // Match --surface-0 dark theme
    allowMixedContent: true,    // Allow HTTP API calls during dev
  }
};

export default config;
