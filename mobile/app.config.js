// app.config.js
import 'dotenv/config';

export default ({ config }) => {
  // اقرأ المتغيرات من بيئة البناء أولاً (EAS secrets أو env local)
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL || '';
  const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || process.env.SOCKET_URL || '';

  return {
    ...config,
    extra: {
      // استخدم مفاتيح بسيطة وصغيرة (camelCase) عشان نسهل القراءة في runtime
      apiUrl,
      socketUrl,
      // احتفظ بأي قيمة EAS projectId لو موجودة
      easProjectId: config?.extra?.eas?.projectId ?? process.env.EAS_PROJECT_ID ?? '',
    },
  };
};
