export function getServerConfig() {
  const env = typeof process !== "undefined" ? process.env : ((globalThis as any).process?.env || {});
  return {
    nodeEnv: env.NODE_ENV || import.meta.env.MODE,
    resendApiKey: env.RESEND_API_KEY || import.meta.env.VITE_RESEND_API_KEY,
  };
}
