// backend/services/telegramService.js
// بوت تليجرام التفاعلي - سمر أكاديمي (V3.0)
// يقوم بالحجز مباشرة داخل التليجرام بدون الحاجة لفتح المتصفح

const { Telegraf, Markup } = require('telegraf');
const constants = require('../config/constants');
const bookingService = require('./bookingService');

// ===== متغيرات الجلسات (لتخزين بيانات المستخدم المؤقتة) =====
const sessions = new Map();

// ===== بيانات ثابتة (يمكن جلبها من API مستقبلاً) =====
const GRADES = [
  { id: 'p4', name: 'رابع ابتدائي' },
  { id: 'p5', name: 'خامس ابتدائي' },
  { id: 'p6', name: 'سادس ابتدائي' },
  { id: 'm1', name: 'أول متوسط' },
  { id: 'm2', name: 'ثاني متوسط' },
  { id: 'm3', name: 'ثالث متوسط' }
];

const SUBJECTS = [
  { id: 'arabic', name: 'اللغة العربية' },
  { id: 'social', name: 'الدراسات الاجتماعية' },
  { id: 'science', name: 'العلوم' },
  { id: 'math', name: 'الرياضيات' }
];

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

// ===== دوال مساعدة للواجهة =====

function buildGradeKeyboard() {
  const buttons = GRADES.map(g => Markup.button.callback(g.name, `grade_${g.id}`));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return Markup.inlineKeyboard(rows);
}

function buildSubjectKeyboard() {
  const buttons = SUBJECTS.map(s => Markup.button.callback(s.name, `subject_${s.id}`));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return Markup.inlineKeyboard(rows);
}

function buildTimeKeyboard() {
  const buttons = TIME_SLOTS.map(t => Markup.button.callback(t, `time_${t}`));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) rows.push(buttons.slice(i, i + 3));
  return Markup.inlineKeyboard(rows);
}

function getMainMenuKeyboard() {
  return Markup.keyboard([
    ['📚 دخول المنصة', '📞 حجز درس'],
    ['📱 واتساب', '🤖 تواصل معنا'],
    ['ℹ️ عن الأكاديمية', '🆘 مساعدة']
  ]).resize().persistent();
}

// ===== تهيئة البوت =====
let botInstance = null;

function initBot() {
  try {
    if (!constants.BOT_TOKEN) {
      console.warn('⚠️ BOT_TOKEN مفقود، البوت لن يعمل');
      return null;
    }

    const bot = new Telegraf(constants.BOT_TOKEN);

    // ===== [1] أمر /start =====
    bot.start((ctx) => {
      const userName = ctx.from.first_name || 'الطالب';
      sessions.delete(ctx.chat.id);
      
      ctx.replyWithMarkdown(
        `🇪🇬 *أهلًا بك يا ${userName} في سمر أكاديمي!* 🎓\n\n` +
        `📚 منصة تعليمية مصرية متكاملة للمناهج الدراسية.\n` +
        `✨ يمكنك حجز الدروس الخصوصية مباشرة من هنا.\n\n` +
        `اختر الخيار المناسب من الأزرار أدناه 👇`,
        getMainMenuKeyboard()
      );
    });

    // ===== [2] أمر /help =====
    bot.help((ctx) => {
      ctx.replyWithMarkdown(
        `🆘 *المساعدة والدعم*\n\n` +
        `📌 *الأوامر المتاحة:*\n` +
        `/start - عرض القائمة الرئيسية\n` +
        `/booking - بدء حجز درس خصوصي\n` +
        `/cancel - إلغاء عملية الحجز الحالية\n` +
        `/help - عرض هذه الرسالة\n\n` +
        `📞 للتواصل المباشر: [واتساب](${constants.WHATSAPP_LINK})`,
        getMainMenuKeyboard()
      );
    });

    // ===== [3] أمر /cancel =====
    bot.command('cancel', (ctx) => {
      const chatId = ctx.chat.id;
      if (sessions.has(chatId)) {
        sessions.delete(chatId);
        ctx.reply('✅ *تم إلغاء عملية الحجز بنجاح.*', { 
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard()
        });
      } else {
        ctx.reply('ℹ️ لا توجد عملية حجز جارية حالياً.', getMainMenuKeyboard());
      }
    });

    // ===== [4] أمر /booking =====
    bot.command('booking', (ctx) => {
      startBookingFlow(ctx);
    });

    // ===== [5] معالجة الأزرار السفلية (النصوص) =====
    bot.hears('📞 حجز درس', (ctx) => startBookingFlow(ctx));

    bot.hears('📚 دخول المنصة', (ctx) => {
      const url = constants.GITHUB_PAGES_URL || 'https://samaracademy254-png.github.io/samaracadmy/';
      ctx.replyWithMarkdown(
        `📚 *دخول المنصة التعليمية*\n\n` +
        `🔗 [اضغط هنا لفتح المنصة](${url})\n\n` +
        `يمكنك تصفح الدروس والاختبارات من خلال الرابط أعلاه.`,
        getMainMenuKeyboard()
      );
    });

    bot.hears('📱 واتساب', (ctx) => {
      ctx.replyWithMarkdown(
        `📱 *تواصل معنا عبر واتساب*\n\n` +
        `للحصول على استفسارات فورية، تواصل معنا على الرقم:\n` +
        `[${constants.PHONE || '01120008704'}](${constants.WHATSAPP_LINK})`,
        getMainMenuKeyboard()
      );
    });

    bot.hears('🤖 تواصل معنا', (ctx) => {
      ctx.replyWithMarkdown(
        `📞 *طرق التواصل المتاحة:*\n\n` +
        `📱 واتساب: [${constants.PHONE || '01120008704'}](${constants.WHATSAPP_LINK})\n` +
        `📧 إيميل: ${constants.EMAIL || 'samaracademy254@gmail.com'}\n` +
        `🤖 تليجرام: ${constants.TELEGRAM_LINK || '@Edu_Samar_Academy_bot'}`,
        getMainMenuKeyboard()
      );
    });

    bot.hears('ℹ️ عن الأكاديمية', (ctx) => {
      ctx.replyWithMarkdown(
        `🏫 *سمر أكاديمي*\n\n` +
        `🇪🇬 منصة تعليمية مصرية متخصصة في المناهج الدراسية.\n` +
        `🎯 نهدف إلى تقديم محتوى تعليمي مبسط وممتع.\n\n` +
        `✅ *مميزاتنا:*\n` +
        `• دروس فيديو مجانية\n` +
        `• اختبارات تفاعلية\n` +
        `• حجز دروس خصوصية\n` +
        `• متابعة مستمرة\n\n` +
        `🌐 ${constants.GITHUB_PAGES_URL || 'https://samaracademy254-png.github.io/samaracadmy/'}`,
        getMainMenuKeyboard()
      );
    });

    bot.hears('🆘 مساعدة', (ctx) => {
      ctx.replyWithMarkdown(
        `🆘 *المساعدة السريعة*\n\n` +
        `📌 لبدء حجز درس، اضغط على زر *"📞 حجز درس"*.\n` +
        `📌 لإلغاء الحجز الحالي، استخدم الأمر /cancel.\n` +
        `📌 لأي استفسار، تواصل معنا عبر واتساب.`,
        getMainMenuKeyboard()
      );
    });

    // ===== [6] معالجة الأزرار المضمنة (Inline) =====
    bot.action(/grade_(.+)/, async (ctx) => {
      const chatId = ctx.chat.id;
      const gradeId = ctx.match[1];
      const session = sessions.get(chatId) || {};

      if (session.step !== 'grade') {
        return ctx.reply('⚠️ يرجى بدء الحجز باستخدام /booking أولاً.', getMainMenuKeyboard());
      }

      const grade = GRADES.find(g => g.id === gradeId);
      if (!grade) {
        return ctx.reply('⚠️ صف غير صحيح، حاول مرة أخرى.');
      }

      session.grade = gradeId;
      session.gradeName = grade.name;
      session.step = 'subject';
      sessions.set(chatId, session);

      await ctx.editMessageText(
        `📖 *اختر المادة الدراسية* (للصف ${grade.name}):`,
        {
          parse_mode: 'Markdown',
          ...buildSubjectKeyboard()
        }
      );
    });

    bot.action(/subject_(.+)/, async (ctx) => {
      const chatId = ctx.chat.id;
      const subjectId = ctx.match[1];
      const session = sessions.get(chatId);

      if (!session || session.step !== 'subject') {
        return ctx.reply('⚠️ حدث خطأ، يرجى إعادة بدء الحجز باستخدام /booking.', getMainMenuKeyboard());
      }

      const subject = SUBJECTS.find(s => s.id === subjectId);
      if (!subject) {
        return ctx.reply('⚠️ مادة غير صحيحة، حاول مرة أخرى.');
      }

      session.subject = subjectId;
      session.subjectName = subject.name;
      session.step = 'date';
      sessions.set(chatId, session);

      await ctx.editMessageText(
        `📅 *أدخل التاريخ المفضل* (بالصيغة YYYY-MM-DD)\n` +
        `مثال: ${new Date().toISOString().split('T')[0]}\n\n` +
        `✏️ اكتب التاريخ في شريط المحادثة أدناه.`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] }
        }
      );
    });

    bot.action(/time_(.+)/, async (ctx) => {
      const chatId = ctx.chat.id;
      const time = ctx.match[1];
      const session = sessions.get(chatId);

      if (!session || session.step !== 'time') {
        return ctx.reply('⚠️ حدث خطأ، يرجى إعادة بدء الحجز.', getMainMenuKeyboard());
      }

      session.time = time;
      session.step = 'name';
      sessions.set(chatId, session);

      await ctx.editMessageText(
        `✅ تم اختيار الوقت ${time}.\n\n` +
        `👤 *أدخل اسمك الكامل:*`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] }
        }
      );
    });

    // ===== [7] معالجة الرسائل النصية (التاريخ، الاسم، رقم الهاتف) =====
    bot.on('text', async (ctx) => {
      const chatId = ctx.chat.id;
      const text = ctx.message.text.trim();
      const session = sessions.get(chatId);

      if (!session) return;

      // --- خطوة إدخال التاريخ ---
      if (session.step === 'date') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(text)) {
          return ctx.reply('⚠️ صيغة التاريخ غير صحيحة.\nاستخدم الصيغة: YYYY-MM-DD\nمثال: 2026-08-15');
        }

        const selectedDate = new Date(text);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          return ctx.reply('⚠️ لا يمكن اختيار تاريخ في الماضي. اختر تاريخاً مستقبلياً.');
        }

        session.date = text;
        session.step = 'time';
        sessions.set(chatId, session);

        await ctx.reply(
          `⏰ *اختر الوقت المناسب* للتاريخ ${text}:`,
          {
            parse_mode: 'Markdown',
            ...buildTimeKeyboard()
          }
        );
        return;
      }

      // --- خطوة إدخال الاسم ---
      if (session.step === 'name') {
        if (text.length < 3) {
          return ctx.reply('⚠️ الاسم يجب أن يحتوي على 3 أحرف على الأقل.');
        }
        session.name = text;
        session.step = 'phone';
        sessions.set(chatId, session);

        await ctx.reply(
          `📱 *أدخل رقم هاتفك (واتساب)*\n` +
          `مثال: 01120008704\n\n` +
          `✏️ اكتب الرقم في شريط المحادثة.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // --- خطوة إدخال رقم الهاتف (الخطوة الأخيرة) ---
      if (session.step === 'phone') {
        const phoneRegex = /^01[0-9]{9}$/;
        if (!phoneRegex.test(text)) {
          return ctx.reply('⚠️ رقم الهاتف غير صحيح.\nيجب أن يبدأ بـ 01 ويتكون من 11 رقم (مثال: 01120008704)');
        }

        session.phone = text;
        session.step = 'confirm';
        sessions.set(chatId, session);

        const confirmKeyboard = Markup.inlineKeyboard([
          [Markup.button.callback('✅ تأكيد الحجز', 'confirm_yes')],
          [Markup.button.callback('❌ إلغاء', 'confirm_no')]
        ]);

        await ctx.replyWithMarkdown(
          `📋 *تأكيد بيانات الحجز*\n\n` +
          `👤 الاسم: ${session.name}\n` +
          `📱 الهاتف: ${session.phone}\n` +
          `📚 الصف: ${session.gradeName}\n` +
          `📖 المادة: ${session.subjectName}\n` +
          `📅 التاريخ: ${session.date}\n` +
          `⏰ الوقت: ${session.time}\n\n` +
          `هل البيانات صحيحة؟`,
          confirmKeyboard
        );
        return;
      }
    });

    // ===== [8] تأكيد الحجز أو إلغاؤه =====
    bot.action('confirm_yes', async (ctx) => {
      const chatId = ctx.chat.id;
      const session = sessions.get(chatId);

      if (!session) {
        return ctx.reply('⚠️ انتهت صلاحية الجلسة. يرجى بدء حجز جديد باستخدام /booking.');
      }

      await ctx.editMessageText('⏳ جاري حفظ الحجز...');

      try {
        const bookingData = {
          name: session.name,
          phone: session.phone,
          grade: session.grade,
          gradeName: session.gradeName,
          subject: session.subject,
          subjectName: session.subjectName,
          date: session.date,
          time: session.time,
          bookingType: 'regular',
          notes: `تم الحجز عبر بوت تليجرام بواسطة @${ctx.from.username || ctx.from.id}`,
          source: 'telegram'
        };

        const newBooking = bookingService.addBooking(bookingData);

        if (newBooking) {
          await ctx.replyWithMarkdown(
            `✅ *تم استلام طلب الحجز بنجاح!* 🎉\n\n` +
            `📋 *تفاصيل الحجز:*\n` +
            `• الاسم: ${session.name}\n` +
            `• الهاتف: ${session.phone}\n` +
            `• الصف: ${session.gradeName}\n` +
            `• المادة: ${session.subjectName}\n` +
            `• التاريخ: ${session.date}\n` +
            `• الوقت: ${session.time}\n\n` +
            `📌 رقم الحجز: \`${newBooking.id}\`\n\n` +
            `سيتم التواصل معك قريباً لتأكيد الحجز.\n` +
            `شكراً لثقتك بسمر أكاديمي ❤️`,
            getMainMenuKeyboard()
          );

          // إشعار للمشرف
          if (constants.ADMIN_CHAT_ID) {
            await bot.telegram.sendMessage(
              constants.ADMIN_CHAT_ID,
              `🔔 *حجز جديد عبر البوت*\n\n` +
              `👤 الاسم: ${session.name}\n` +
              `📱 الهاتف: ${session.phone}\n` +
              `📚 الصف: ${session.gradeName}\n` +
              `📖 المادة: ${session.subjectName}\n` +
              `📅 التاريخ: ${session.date}\n` +
              `⏰ الوقت: ${session.time}\n` +
              `🆔 المعرف: ${newBooking.id}`,
              { parse_mode: 'Markdown' }
            );
          }

          sessions.delete(chatId);
        } else {
          throw new Error('فشل حفظ الحجز في قاعدة البيانات');
        }
      } catch (error) {
        console.error('❌ خطأ في حفظ الحجز:', error);
        await ctx.reply(
          '⚠️ عذراً، حدث خطأ أثناء حفظ الحجز. يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة عبر واتساب.',
          getMainMenuKeyboard()
        );
        sessions.delete(chatId);
      }
    });

    bot.action('confirm_no', async (ctx) => {
      const chatId = ctx.chat.id;
      sessions.delete(chatId);
      await ctx.editMessageText(
        '❌ تم إلغاء الحجز. يمكنك البدء من جديد باستخدام /booking.',
        getMainMenuKeyboard()
      );
    });

    // ===== [9] معالج الأخطاء العام =====
    bot.catch((err, ctx) => {
      console.error('❌ خطأ غير متوقع في البوت:', err);
      ctx.reply('⚠️ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.').catch(() => {});
    });

    // ===== [10] تشغيل البوت =====
    bot.launch()
      .then(() => {
        console.log('🤖 بوت تليجرام التفاعلي يعمل بنجاح! (سمر أكاديمي V3.0)');
      })
      .catch((err) => {
        console.error('❌ فشل تشغيل البوت:', err.message);
      });

    botInstance = bot;

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    return bot;
  } catch (error) {
    console.error('❌ خطأ فادح أثناء تهيئة البوت:', error);
    return null;
  }
}

// ===== دوال مساعدة =====
function startBookingFlow(ctx) {
  const chatId = ctx.chat.id;
  sessions.set(chatId, { step: 'grade' });

  ctx.replyWithMarkdown(
    `📚 *خطوات الحجز*\n\n` +
    `الخطوة 1: اختر الصف الدراسي 👇`,
    buildGradeKeyboard()
  );
}

function getBot() {
  return botInstance;
}

module.exports = { initBot, getBot };