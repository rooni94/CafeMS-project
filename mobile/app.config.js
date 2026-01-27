import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL ??
      process.env.API_URL ??
      (config.extra ? config.extra.apiUrl : ""),
    socketUrl:
      process.env.EXPO_PUBLIC_SOCKET_URL ??
      process.env.SOCKET_URL ??
      (config.extra ? config.extra.socketUrl : ""),
    eas: {
      projectId: "00000000-0000-0000-0000-000000000000"
    }
  },
});
