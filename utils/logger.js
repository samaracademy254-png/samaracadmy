/**
 * أدوات تسجيل الأحداث (Logger) - نسخة مبسطة
 * لتتبع الأخطاء والعمليات أثناء التطوير
 */
module.exports = {
  info: (msg, meta = {}) => {
    console.log(`✅ [INFO] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`⚠️ [WARN] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  error: (msg, meta = {}) => {
    console.error(`❌ [ERROR] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  debug: (msg, meta = {}) => {
    console.debug(`🔍 [DEBUG] ${msg}`, Object.keys(meta).length ? meta : '');
  },
};
