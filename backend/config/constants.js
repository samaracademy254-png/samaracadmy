const path = require('path');

module.exports = {
  // ===== معلومات المنصة =====
  APP_NAME: 'سمر أكاديمي',
  VERSION: '1.0.0',
  DESCRIPTION: 'منصة تعليمية مصرية متخصصة في المناهج الدراسية للصفوف الابتدائية والإعدادية',
  
  // ===== إعدادات السيرفر =====
  PORT: process.env.PORT || 3000,
  
  // ===== بوت تليجرام =====
  BOT_TOKEN: process.env.BOT_TOKEN,
  
  // ===== روابط المنصة =====
  GITHUB_PAGES_URL: process.env.GITHUB_PAGES_URL || 'https://samaracademy254-png.github.io/samaracadmy/',
  
  // ===== معلومات التواصل =====
  WHATSAPP_LINK: process.env.WHATSAPP_LINK || 'https://wa.me/201120008704',
  TELEGRAM_LINK: process.env.TELEGRAM_LINK || 'https://t.me/Edu_Samar_Academy_bot',
  FACEBOOK_LINK: process.env.FACEBOOK_LINK || 'https://web.facebook.com/SamarAcademy.AS',
  EMAIL: process.env.EMAIL || 'samaracademy254@gmail.com',
  PHONE: process.env.PHONE || '+201120008704',
  
  // ===== معرف المشرف في تليجرام =====
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID || '6009586052',
  
  // ===== مسارات الملفات =====
  LESSONS_FILE: path.join(__dirname, '../data/lessons-data.json'),
  BOOKINGS_FILE: path.join(__dirname, '../data/bookings.json'),
  
  // ===== إعدادات المصادقة =====
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123456',
};
