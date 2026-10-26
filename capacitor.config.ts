import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.hkskyinvaders.game',
  appName: 'HK Sky Invaders',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#000000' },
};
export default config;
