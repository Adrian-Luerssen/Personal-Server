import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adrianluerssen.personalserver',
  appName: 'Personal Record',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_personal_server',
      iconColor: '#A44A37',
    },
  },
};

export default config;
