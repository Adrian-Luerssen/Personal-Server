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
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6366f1',
    },
  },
};

export default config;
