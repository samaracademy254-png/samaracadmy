// ============================================================
//  سمر أكاديمي - الخادم الرئيسي (V3.3)
//  الإصدار المتين للتشغيل في بيئات الإنتاج (Suga/Render)
//  تم إصلاح ترتيب المسارات لضمان عمل API بشكل صحيح
// ============================================================

// ===== [1] التقاط الأخطاء المبكرة (قبل أي شيء) =====
process.on('uncaughtException', (err) => {
  console.error('🔥 [uncaughtException]', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 [unhandledRejection]', reason);
  process.exit(1);
});

// ===== [2] تحميل الوحدات مع طباعة الأخطاء (للتشخيص) =====
console.log('⏳ جاري تحميل الوحدات الأساسية...');

let dotenv, express, cors, helmet, fs, path;
try {
  dotenv = require('dotenv');
  dotenv.config();
  console.log('✅ dotenv تم تحميله');
} catch (e) {
  console.error('❌ فشل تحميل dotenv:', e.message);
  process.exit(1);
}

try {
  express = require('express');
  console.log('✅ express تم تحميله');
} catch (e) {
  console.error('❌ فشل تحميل express:', e.message);
  process.exit(1);
}

try {
  cors = require('cors');
  console.log('✅ cors تم تحميله');
} catch (e) {
  console.error('❌ فشل تحميل cors:', e.message);
  process.exit(1);
}

try {
  helmet = require('helmet');
  console.log('✅ helmet تم تحميله');
} catch (e) {
  console.error('❌ فشل تحميل helmet:', e.message);
  process.exit(1);
}

try {
  fs = require('fs');
  path = require('path');
  console.log('✅ fs و path تم تحميلهما');
} catch (e) {
  console.error('❌ فشل تحميل fs/path:', e.message);
  process.exit(1);
}

// ===== [3] تحميل الوحدات الداخلية مع الحماية =====
let constants, bookingService, telegramService;
try {
  constants = require('./config/constants');
  console.log('✅ constants تم تحميله');
} catch (e) {
  console.error('❌ فشل تحميل ./config/constants:', e.message);
  process.exit(1);
}

try {
  bookingService = require('./services/bookingService');
  console.log('✅ bookingService تم تحميله');
} catch (e) {
  console.error('❌ فشل تحميل ./services/bookingService:', e.message);
  process.exit(1);
}

try {
  telegramService = require('./services/telegramService');
  console.log('✅ telegramService تم تحميله');
} catch (e) {
  console.error('❌ فشل تحميل ./services/telegramService:', e.message);
  process.exit(1);
}

// ===== [4] تهيئة التطبيق =====
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('═══════════════════════════════════════════════');
console.log(`🚀 بدء تشغيل سمر أكاديمي (${isProduction ? 'إنتاج' : 'تطوير'})`);
console.log(`📌 المنفذ: ${PORT}`);
console.log(`📌 البيئة: ${process.env.NODE_ENV || 'development'}`);
console.log(`📌 جذر المشروع: ${process.cwd()}`);
console.log('═══════════════════════════════════════════════');

// ===== [5] إعدادات الأمان والوسائط =====
if (isProduction) {
  app.set('trust proxy', 1);
  console.log('✅ trust proxy مفعّل');
}

// CORS
app.use(cors({
  origin: isProduction
    ? ['https://samaracademy254-png.github.io', 'https://samar-academy.vercel.app']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
console.log('✅ CORS مهيأ');

// Helmet (مع تعطيل CSP مؤقتًا لتوافق الواجهة)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
console.log('✅ Helmet مهيأ');

// معالجة JSON و URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('✅ JSON/URL-encoded parsers مهيأة');

// ===== [6] تسجيل الطلبات =====
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ===== [7] خدمة الملفات الثابتة (مع تحقق قوي) =====
const projectRoot = process.cwd();
const docsPath = path.join(projectRoot, 'docs');
const dataPath = path.join(projectRoot, 'docs', 'data');

console.log(`📂 مسار docs: ${docsPath}`);

if (!fs.existsSync(docsPath)) {
  console.error(`❌ مجلد docs غير موجود في: ${docsPath}`);
  console.error('   تأكد من أن مجلد docs موجود في جذر المشروع');
  process.exit(1);
} else {
  console.log('✅ مجلد docs موجود');
}

if (!fs.existsSync(path.join(docsPath, 'index.html'))) {
  console.warn('⚠️ index.html غير موجود داخل docs! قد تظهر صفحة 404');
} else {
  console.log('✅ index.html موجود');
}

// تقديم الملفات الثابتة
app.use(express.static(docsPath));
console.log('✅ خدمة الملفات الثابتة مفعلة');

// ============================================================
//  [8] مسار الجذر (يجب أن يكون قبل أي شيء آخر)
// ============================================================
app.get('/', (req, res) => {
  const indexPath = path.join(docsPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>⚠️ index.html غير موجود</h1>
      <p>المسار المتوقع: ${indexPath}</p>
      <p>تأكد من رفع مجلد docs إلى المستودع.</p>
    `);
  }
});

// ============================================================
//  [9] دوال مساعدة
// ============================================================

/**
 * قراءة ملف JSON بأمان (مع منع الوصول خارج مجلد data)
 */
function safeReadJSON(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    const dataDir = path.join(projectRoot, 'docs', 'data');
    if (!resolvedPath.startsWith(dataDir)) {
      return { error: 'مسار غير مصرح به' };
    }
    if (!fs.existsSync(resolvedPath)) {
      return { error: 'الملف غير موجود' };
    }
    const data = fs.readFileSync(resolvedPath, 'utf8');
    return { data: JSON.parse(data) };
  } catch (error) {
    return { error: error.message };
  }
}

function sanitizeParam(param) {
  return param.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
}

// ============================================================
//  [10] مسارات API العامة (يجب أن تأتي قبل الـ catch-all)
// ============================================================

console.log('🔍 تحميل مسارات API العامة...');

// 1. جلب الدروس
app.get('/api/lessons', (req, res) => {
  try {
    const rawData = fs.readFileSync(constants.LESSONS_FILE, 'utf8');
    const data = JSON.parse(rawData || '{}');
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ خطأ في /api/lessons:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. إضافة درس جديد (CMS)
app.post('/api/cms/add-lesson', (req, res) => {
  try {
    const { gradeId, subjectName, unitId, unitName, lessonId, lessonName } = req.body;
    
    if (!gradeId || !subjectName || !unitId || !unitName || !lessonId || !lessonName) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    let rawData = fs.readFileSync(constants.LESSONS_FILE, 'utf8');
    let lessonsData = rawData ? JSON.parse(rawData) : {};

    if (!lessonsData[gradeId]) lessonsData[gradeId] = { subjects: {} };
    if (!lessonsData[gradeId].subjects[subjectName]) {
      lessonsData[gradeId].subjects[subjectName] = { units: [] };
    }

    let unit = lessonsData[gradeId].subjects[subjectName].units.find(u => u.id === unitId);
    if (!unit) {
      unit = { id: unitId, name: unitName, lessons: [] };
      lessonsData[gradeId].subjects[subjectName].units.push(unit);
    }

    if (unit.lessons.some(l => l.id === lessonId)) {
      return res.status(400).json({ success: false, message: 'الدرس موجود بالفعل' });
    }

    unit.lessons.push({ id: lessonId, name: lessonName });
    fs.writeFileSync(constants.LESSONS_FILE, JSON.stringify(lessonsData, null, 2), 'utf8');

    res.json({ success: true, message: 'تم إضافة الدرس بنجاح 🎉' });
  } catch (error) {
    console.error('❌ خطأ في /api/cms/add-lesson:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. مسارات البيانات (Study, Quiz, Units)
app.get('/api/study/:grade/:subject/:unit/:lesson', (req, res) => {
  const { grade, subject, unit, lesson } = req.params;
  const cleanGrade = sanitizeParam(grade);
  const cleanSubject = sanitizeParam(subject);
  const cleanUnit = sanitizeParam(unit);
  const cleanLesson = sanitizeParam(lesson);
  
  const filePath = path.join(projectRoot, `docs/data/study_data/${cleanGrade}/${cleanSubject}/${cleanUnit}/${cleanLesson}.json`);
  const result = safeReadJSON(filePath);
  
  if (result.error) {
    console.error('❌ خطأ في /api/study:', result.error);
    return res.status(404).json({ success: false, message: result.error });
  }
  res.json({ success: true, data: result.data });
});

app.get('/api/quiz/:grade/:subject/:unit/:lesson', (req, res) => {
  const { grade, subject, unit, lesson } = req.params;
  const cleanGrade = sanitizeParam(grade);
  const cleanSubject = sanitizeParam(subject);
  const cleanUnit = sanitizeParam(unit);
  const cleanLesson = sanitizeParam(lesson);
  
  const filePath = path.join(projectRoot, `docs/data/quiz_data/${cleanGrade}/${cleanSubject}/${cleanUnit}/${cleanLesson}.json`);
  const result = safeReadJSON(filePath);
  
  if (result.error) {
    console.error('❌ خطأ في /api/quiz:', result.error);
    return res.status(404).json({ success: false, message: result.error });
  }
  res.json({ success: true, data: result.data });
});

app.get('/api/units', (req, res) => {
  const filePath = path.join(projectRoot, 'docs/data/units.json');
  const result = safeReadJSON(filePath);
  
  if (result.error) {
    console.error('❌ خطأ في /api/units:', result.error);
    return res.status(404).json({ success: false, message: result.error });
  }
  res.json({ success: true, data: result.data });
});

// 4. حجز درس خصوصي
app.post('/api/booking', (req, res) => {
  try {
    const { name, phone, grade, subject, date, time, notes, bookingType } = req.body;
    
    if (!name || !phone || !grade || !subject || !date || !time) {
      return res.status(400).json({ 
        success: false, 
        message: 'جميع الحقول مطلوبة (الاسم، الهاتف، الصف، المادة، التاريخ، الوقت)' 
      });
    }

    const booking = bookingService.addBooking({
      name,
      phone,
      grade,
      subject,
      date,
      time,
      notes: notes || '',
      bookingType: bookingType || 'regular'
    });

    console.log(`✅ تم إضافة حجز جديد: ${booking.id} (نوع: ${bookingType || 'regular'})`);

    // إرسال إشعار للمشرف
    try {
      const bot = telegramService.getBot();
      if (bot) {
        const typeLabel = bookingType === 'trial' ? '🆓 حصة تجريبية' : '📚 درس عادي';
        const message = 
          `📚 **حجز جديد في سمر أكاديمي!**\n\n` +
          `👤 الاسم: ${name}\n` +
          `📱 الهاتف: ${phone}\n` +
          `📚 الصف: ${grade}\n` +
          `📖 المادة: ${subject}\n` +
          `📅 التاريخ: ${date}\n` +
          `⏰ الوقت: ${time}\n` +
          `📋 النوع: ${typeLabel}\n` +
          `📝 ملاحظات: ${notes || 'لا يوجد'}\n` +
          `🆔 رقم الحجز: ${booking.id}`;
        
        bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' })
          .then(() => console.log('✅ تم إرسال إشعار للمشرف'))
          .catch(err => console.error('❌ فشل إرسال إشعار للمشرف:', err.message));
      }
    } catch (botError) {
      console.warn('⚠️ البوت غير متاح:', botError.message);
    }

    res.json({ 
      success: true, 
      message: 'تم استلام طلب الحجز بنجاح! سيتم التواصل معك قريباً.',
      bookingId: booking.id 
    });

  } catch (error) {
    console.error('❌ خطأ في /api/booking:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. جلب جميع الحجوزات
app.get('/api/bookings', (req, res) => {
  try {
    const bookings = bookingService.getBookings();
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('❌ خطأ في /api/bookings:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. تحديث حالة الحجز
app.put('/api/booking/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, meetLink } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'الحالة مطلوبة' });
    }
    
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    }
    
    const updated = bookingService.updateBookingStatus(id, status, meetLink);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }
    
    // إشعار تأكيد الحجز مع رابط Meet
    if (status === 'confirmed' && meetLink) {
      try {
        const bot = telegramService.getBot();
        if (bot) {
          const message = 
            `✅ **تم تأكيد حجز واستضافة Google Meet!**\n\n` +
            `👤 الاسم: ${updated.name}\n` +
            `📱 الهاتف: ${updated.phone}\n` +
            `📅 التاريخ: ${updated.date}\n` +
            `⏰ الوقت: ${updated.time}\n` +
            `🔗 رابط الاجتماع:\n${meetLink}`;
          
          bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' })
            .catch(err => console.error('❌ فشل إرسال إشعار التأكيد:', err.message));
        }
      } catch (e) {}
    }
    
    res.json({ success: true, data: updated, message: 'تم تحديث الحالة' });
  } catch (error) {
    console.error('❌ خطأ في /api/booking/:id:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
//  [11] مسارات لوحة التحكم (Admin Routes)
// ============================================================

console.log('🔍 تحميل مسارات لوحة التحكم...');

let adminRoutesLoaded = false;
try {
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  adminRoutesLoaded = true;
  console.log('✅ تم تحميل مسارات لوحة التحكم (/api/admin)');
} catch (error) {
  console.error('❌ فشل تحميل مسارات لوحة التحكم:', error.message);
}

// ============================================================
//  [12] نقطة التحقق الصحي (Health Check)
// ============================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    version: '3.3.0',
    timestamp: new Date().toISOString(),
    bookingsCount: bookingService.getBookings().length,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    adminRoutesLoaded: adminRoutesLoaded,
    docsExists: fs.existsSync(docsPath),
    indexExists: fs.existsSync(path.join(docsPath, 'index.html')),
    dataExists: fs.existsSync(dataPath)
  });
});

// ============================================================
//  [13] نقطة التوجيه الشاملة لـ SPA (تسليم index.html لأي مسار غير معروف)
//      يجب أن تأتي في آخر الملف، بعد جميع مسارات API و /health
// ============================================================

app.get('*', (req, res) => {
  const indexPath = path.join(docsPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'index.html غير موجود' });
  }
});

// ============================================================
//  [14] معالج الأخطاء العام (يظهر بعد كل المسارات)
// ============================================================

app.use((err, req, res, next) => {
  console.error('❌ خطأ غير متوقع:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'حدث خطأ داخلي في الخادم.',
    error: isProduction ? undefined : err.message 
  });
});

// ============================================================
//  [15] تشغيل السيرفر
// ============================================================

console.log('⏳ جاري بدء تشغيل السيرفر...');

const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ سمر أكاديمي يعمل على: http://localhost:${PORT}`);
  console.log(`📚 عدد الحجوزات: ${bookingService.getBookings().length}`);
  console.log(`🔑 ADMIN_PASSWORD موجود: ${!!process.env.ADMIN_PASSWORD}`);
  console.log(`📋 مسارات /api/admin محملة: ${adminRoutesLoaded ? '✅' : '❌'}`);
  console.log(`📂 مجلد docs: ${docsPath} (${fs.existsSync(docsPath) ? 'موجود ✅' : 'غير موجود ❌'})`);
  console.log(`📄 index.html: ${fs.existsSync(path.join(docsPath, 'index.html')) ? 'موجود ✅' : 'غير موجود ❌'}`);
  
  // محاولة بدء البوت (لا نوقف التشغيل إذا فشل)
  try {
    telegramService.initBot();
    console.log('✅ بوت تليجرام يعمل بنجاح');
  } catch (botError) {
    console.warn('⚠️ فشل بدء البوت (لكن السيرفر يعمل):', botError.message);
  }
  console.log('═══════════════════════════════════════════════');
});

// ============================================================
//  [16] إغلاق آمن
// ============================================================

process.on('SIGINT', () => {
  console.log('🛑 جاري إيقاف السيرفر (SIGINT)...');
  server.close(() => {
    const bot = telegramService.getBot();
    if (bot) bot.stop('SIGINT');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 جاري إيقاف السيرفر (SIGTERM)...');
  server.close(() => process.exit(0));
});

console.log('✅ تم تهيئة جميع المكونات بنجاح. في انتظار الطلبات...');