import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adrianluerssen.personalserver',
  appName: 'Personal Server',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_personal_server',
      iconColor: '#7DD3FC',
    },
  },
};

export default config;
