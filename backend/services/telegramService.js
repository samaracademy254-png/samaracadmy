const { Telegraf, Markup } = require('telegraf');
const constants = require('../config/constants');

let bot = null;

function initBot() {
  try {
    // التحقق من وجود التوكن
    if (!constants.BOT_TOKEN) {
      console.warn('⚠️ BOT_TOKEN مفقود، البوت لن يعمل');
      return null;
    }

    // إنشاء البوت
    bot = new Telegraf(constants.BOT_TOKEN);

    // ===== أمر /start =====
    bot.start((ctx) => {
      try {
        const userName = ctx.from.first_name || 'الطالب';

        // إزالة أي أزرار عالقة من المحادثة السابقة
        ctx.reply('🔄 جاري تحديث القائمة...', {
          reply_markup: { remove_keyboard: true }
        });

        // إرسال الأزرار الجديدة بعد تأخير بسيط
        setTimeout(() => {
          ctx.reply(
            `🇸🇦 أهلًا بك يا ${userName} في **أكاديمية الأستاذ**!\n\n` +
            `📚 منصة تعليمية شاملة للمناهج السعودية.\n` +
            `🎯 اختر الخيار المناسب من الأزرار أدناه.`,
            {
              parse_mode: 'Markdown',
              ...Markup.keyboard([
                ['📚 دخول المنصة', '📞 حجز درس'],
                ['📱 واتساب', '🤖 تواصل معنا'],
                ['ℹ️ عن الأكاديمية', '🆘 مساعدة']
              ])
              .resize()
              .persistent()
            }
          );
        }, 300);
      } catch (err) {
        console.error('❌ خطأ في bot.start:', err.message);
      }
    });

    // ===== معالجة نصوص الأزرار (مع try/catch لكل حدث) =====
    bot.hears('📚 دخول المنصة', (ctx) => {
      try {
        ctx.reply(
          `📚 **دخول المنصة:**\n${constants.GITHUB_PAGES_URL}\n\nانسخ الرابط وافتحه في المتصفح.`,
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['📚 دخول المنصة', '📞 حجز درس'],
              ['📱 واتساب', '🤖 تواصل معنا'],
              ['ℹ️ عن الأكاديمية', '🆘 مساعدة']
            ]).resize().persistent()
          }
        );
      } catch (err) {
        console.error('❌ خطأ في hears (دخول المنصة):', err.message);
      }
    });

    bot.hears('📞 حجز درس', (ctx) => {
      try {
        const baseUrl = constants.GITHUB_PAGES_URL.endsWith('/') 
          ? constants.GITHUB_PAGES_URL 
          : constants.GITHUB_PAGES_URL + '/';
        const bookingLink = baseUrl + 'pages/Contact/index.html';

        ctx.reply(
          `📚 **حجز درس خصوصي**\n\n` +
          `يرجى ملء النموذج عبر الرابط التالي:\n` +
          `${bookingLink}\n\n` +
          `أو تواصل معنا مباشرة على واتساب.`,
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['📚 دخول المنصة', '📞 حجز درس'],
              ['📱 واتساب', '🤖 تواصل معنا'],
              ['ℹ️ عن الأكاديمية', '🆘 مساعدة']
            ]).resize().persistent()
          }
        );
      } catch (err) {
        console.error('❌ خطأ في hears (حجز درس):', err.message);
      }
    });

    bot.hears('📱 واتساب', (ctx) => {
      try {
        ctx.reply(
          `📱 تواصل معنا على واتساب:\n${constants.WHATSAPP_LINK}`,
          {
            ...Markup.keyboard([
              ['📚 دخول المنصة', '📞 حجز درس'],
              ['📱 واتساب', '🤖 تواصل معنا'],
              ['ℹ️ عن الأكاديمية', '🆘 مساعدة']
            ]).resize().persistent()
          }
        );
      } catch (err) {
        console.error('❌ خطأ في hears (واتساب):', err.message);
      }
    });

    bot.hears('🤖 تواصل معنا', (ctx) => {
      try {
        ctx.reply(
          `📞 **طرق التواصل:**\n\n` +
          `📱 واتساب: ${constants.WHATSAPP_LINK}\n` +
          `📧 إيميل: ${constants.EMAIL}`,
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['📚 دخول المنصة', '📞 حجز درس'],
              ['📱 واتساب', '🤖 تواصل معنا'],
              ['ℹ️ عن الأكاديمية', '🆘 مساعدة']
            ]).resize().persistent()
          }
        );
      } catch (err) {
        console.error('❌ خطأ في hears (تواصل معنا):', err.message);
      }
    });

    bot.hears('ℹ️ عن الأكاديمية', (ctx) => {
      try {
        ctx.reply(
          `🏫 **أكاديمية الأستاذ**\n\n` +
          `منصة تعليمية سعودية متخصصة في المناهج الدراسية.\n` +
          `نقدم دروساً تفاعلية واختبارات لجميع الصفوف.\n\n` +
          `📚 ${constants.GITHUB_PAGES_URL}`,
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['📚 دخول المنصة', '📞 حجز درس'],
              ['📱 واتساب', '🤖 تواصل معنا'],
              ['ℹ️ عن الأكاديمية', '🆘 مساعدة']
            ]).resize().persistent()
          }
        );
      } catch (err) {
        console.error('❌ خطأ في hears (عن الأكاديمية):', err.message);
      }
    });

    bot.hears('🆘 مساعدة', (ctx) => {
      try {
        ctx.reply(
          `🤖 **الأوامر المتاحة:**\n` +
          `/start - القائمة الرئيسية\n` +
          `/booking - حجز درس خصوصي\n` +
          `/contact - معلومات التواصل\n` +
          `/about - عن الأكاديمية\n` +
          `/help - هذه الرسالة`,
          {
            ...Markup.keyboard([
              ['📚 دخول المنصة', '📞 حجز درس'],
              ['📱 واتساب', '🤖 تواصل معنا'],
              ['ℹ️ عن الأكاديمية', '🆘 مساعدة']
            ]).resize().persistent()
          }
        );
      } catch (err) {
        console.error('❌ خطأ في hears (مساعدة):', err.message);
      }
    });

    // ===== الأوامر النصية =====
    bot.command('booking', (ctx) => {
      try {
        const baseUrl = constants.GITHUB_PAGES_URL.endsWith('/') 
          ? constants.GITHUB_PAGES_URL 
          : constants.GITHUB_PAGES_URL + '/';
        const bookingLink = baseUrl + 'pages/Contact/index.html';

        ctx.reply(
          `📚 **حجز درس خصوصي**\n\n` +
          `يرجى ملء النموذج عبر الرابط التالي:\n` +
          `${bookingLink}\n\n` +
          `أو تواصل معنا مباشرة على واتساب.`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error('❌ خطأ في /booking:', err.message);
      }
    });

    bot.command('contact', (ctx) => {
      try {
        ctx.reply(
          `📞 **معلومات التواصل:**\n\n` +
          `📱 واتساب: ${constants.WHATSAPP_LINK}\n` +
          `🤖 تليجرام: ${constants.TELEGRAM_LINK}\n` +
          `📧 إيميل: ${constants.EMAIL}\n` +
          `📞 هاتف: ${constants.PHONE}`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error('❌ خطأ في /contact:', err.message);
      }
    });

    bot.command('about', (ctx) => {
      try {
        ctx.reply(
          `🏫 **أكاديمية الأستاذ**\n\n` +
          `منصة تعليمية سعودية متخصصة في المناهج الدراسية.\n` +
          `نقدم دروساً تفاعلية واختبارات لجميع الصفوف.\n\n` +
          `📚 ${constants.GITHUB_PAGES_URL}`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error('❌ خطأ في /about:', err.message);
      }
    });

    bot.help((ctx) => {
      try {
        ctx.reply(
          `🤖 **الأوامر المتاحة:**\n` +
          `/start - القائمة الرئيسية\n` +
          `/booking - حجز درس خصوصي\n` +
          `/contact - معلومات التواصل\n` +
          `/about - عن الأكاديمية\n` +
          `/help - هذه الرسالة`
        );
      } catch (err) {
        console.error('❌ خطأ في /help:', err.message);
      }
    });

    // ===== تشغيل البوت مع معالجة الأخطاء =====
    bot.launch()
      .then(() => {
        console.log('🤖 بوت تليجرام يعمل بنجاح (مع أزرار عادية ثابتة)!');
      })
      .catch((err) => {
        console.error('❌ فشل تشغيل البوت:', err.message);
        console.error('❌ تفاصيل إضافية:', err);
        // لا نرمي الخطأ، فقط نسجله
      });

    // ===== إضافة معالج للرفض غير المعالج =====
    bot.catch((err, ctx) => {
      console.error('❌ خطأ غير متوقع في البوت:', err.message);
    });

    return bot;

  } catch (error) {
    console.error('❌ خطأ فادح أثناء تهيئة البوت:', error.message);
    console.error('❌ تفاصيل الخطأ:', error);
    return null;
  }
}

function getBot() {
  return bot;
}

module.exports = { initBot, getBot };
