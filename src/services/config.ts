let configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

// Tự động chuẩn hóa nếu bị nhầm cổng 8008 hoặc 8089 sang cổng backend 3008
if (configuredApiUrl && (configuredApiUrl.includes(':8008') || configuredApiUrl.includes(':8089'))) {
  configuredApiUrl = configuredApiUrl.replace(/:(8008|8089)/, ':3008');
}

export const API_BASE_URL = (configuredApiUrl || 'http://192.168.1.17:3008').replace(/\/+$/, '');
