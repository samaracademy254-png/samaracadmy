require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

// ============================================================
//  استيراد الوحدات والخدمات
// ============================================================
const constants = require('./config/constants');
const bookingService = require('./services/bookingService');
const telegramService = require('./services/telegramService');

// ============================================================
//  إعداد التطبيق
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('═══════════════════════════════════════════════');
console.log(`🚀 بدء تشغيل السيرفر (${isProduction ? 'إنتاج' : 'تطوير'})`);
console.log(`📌 المنفذ: ${PORT}`);
console.log(`📌 البيئة: ${process.env.NODE_ENV || 'development'}`);
console.log('═══════════════════════════════════════════════');

// ============================================================
//  إعدادات الأمان والوسائط
// ============================================================

// ثقة الوكيل (لـ Suga و Render)
if (isProduction) {
  app.set('trust proxy', 1);
  console.log('✅ تم تفعيل trust proxy');
}

// CORS
app.use(cors({
  origin: isProduction 
    ? ['https://professoracademy589-ops.github.io', 'https://professor-academy.vercel.app'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Helmet (مع تعطيل CSP مؤقتاً لتسهيل التطوير)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// معالجة JSON و URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// تسجيل الطلبات (للتتبع)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// خدمة الملفات الثابتة (الواجهة الأمامية)
const docsPath = path.join(__dirname, '../docs');
console.log(`📂 مسار الملفات الثابتة: ${docsPath}`);
app.use(express.static(docsPath));

// مسار البداية
app.get('/', (req, res) => {
  res.sendFile(path.join(docsPath, 'index.html'));
});

// ============================================================
//  دوال مساعدة (Helper Functions)
// ============================================================

/**
 * قراءة ملف JSON بأمان مع حماية من Path Traversal
 */
function safeReadJSON(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    const dataDir = path.resolve(__dirname, '../docs/data');
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

/**
 * تنظيف المعاملات (لمنع الحقن)
 */
function sanitizeParam(param) {
  return param.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
}

// ============================================================
//  مسارات API العامة (بدون حماية)
// ============================================================

console.log('🔍 تحميل مسارات API العامة...');

// 1. جلب الدروس (للاختبارات والشرح)
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

    if (!lessonsData[gradeId]) {
      lessonsData[gradeId] = { subjects: {} };
    }
    if (!lessonsData[gradeId].subjects[subjectName]) {
      lessonsData[gradeId].subjects[subjectName] = { units: [] };
    }

    let unit = lessonsData[gradeId].subjects[subjectName].units.find(u => u.id === unitId);
    if (!unit) {
      unit = { id: unitId, name: unitName, lessons: [] };
      lessonsData[gradeId].subjects[subjectName].units.push(unit);
    }

    const lessonExists = unit.lessons.some(l => l.id === lessonId);
    if (lessonExists) {
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

// 3. مسارات البيانات (Study, Quiz, Units) - مع حماية Path Traversal
app.get('/api/study/:grade/:subject/:unit/:lesson', (req, res) => {
  const { grade, subject, unit, lesson } = req.params;
  const cleanGrade = sanitizeParam(grade);
  const cleanSubject = sanitizeParam(subject);
  const cleanUnit = sanitizeParam(unit);
  const cleanLesson = sanitizeParam(lesson);
  
  const filePath = path.join(__dirname, `../docs/data/study_data/${cleanGrade}/${cleanSubject}/${cleanUnit}/${cleanLesson}.json`);
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
  
  const filePath = path.join(__dirname, `../docs/data/quiz_data/${cleanGrade}/${cleanSubject}/${cleanUnit}/${cleanLesson}.json`);
  const result = safeReadJSON(filePath);
  
  if (result.error) {
    console.error('❌ خطأ في /api/quiz:', result.error);
    return res.status(404).json({ success: false, message: result.error });
  }
  res.json({ success: true, data: result.data });
});

app.get('/api/units', (req, res) => {
  const filePath = path.join(__dirname, '../docs/data/units.json');
  const result = safeReadJSON(filePath);
  
  if (result.error) {
    console.error('❌ خطأ في /api/units:', result.error);
    return res.status(404).json({ success: false, message: result.error });
  }
  res.json({ success: true, data: result.data });
});

// 4. حجز درس خصوصي (مع دعم الحصص التجريبية)
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

    // إرسال إشعار للمشرف (عبر تليجرام)
    try {
      const bot = telegramService.getBot();
      if (bot) {
        const typeLabel = bookingType === 'trial' ? '🆓 حصة تجريبية' : '📚 درس عادي';
        const message = 
          `📚 **حجز جديد في أكاديمية الأستاذ!**\n\n` +
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

// 5. جلب جميع الحجوزات (للمشرف)
app.get('/api/bookings', (req, res) => {
  try {
    const bookings = bookingService.getBookings();
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('❌ خطأ في /api/bookings:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. تحديث حالة الحجز (مع دعم Google Meet)
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
//  مسارات لوحة التحكم (Admin Routes) - محمية بكلمة مرور
// ============================================================
console.log('🔍 تحميل مسارات لوحة التحكم...');

let adminRoutesLoaded = false;
try {
  const adminRoutes = require('./routes/admin');
  console.log('✅ تم استيراد adminRoutes بنجاح');
  console.log('🔍 نوع adminRoutes:', typeof adminRoutes);
  console.log('🔍 هل هو Router؟', adminRoutes && adminRoutes.stack ? 'نعم' : 'لا');
  
  // تسجيل المسارات
  app.use('/api/admin', adminRoutes);
  adminRoutesLoaded = true;
  console.log('✅ تم تحميل مسارات لوحة التحكم (/api/admin) بنجاح');
} catch (error) {
  console.error('❌ فشل تحميل مسارات لوحة التحكم:');
  console.error(error);
  console.error('❌ Stack trace:', error.stack);
}

// ============================================================
//  فحص صحة السيرفر (Health Check)
// ============================================================
// ... (باقي الكود كما هو حتى app.get('/health', ...)

// ============================================================
//  فحص صحة السيرفر (Health Check)
// ============================================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    bookingsCount: bookingService.getBookings().length,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    adminRoutesLoaded: adminRoutesLoaded,  // ✅ المتغير الصحيح
    routesCount: app._router.stack.filter(r => r.route).length
  });
});

// ... (باقي الكود)
// ============================================================
//  معالج الأخطاء العام (يجب أن يكون آخر middleware)
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
//  معالجات الأخطاء غير المتوقعة (لمنع توقف السيرفر)
// ============================================================
process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err.message);
  console.error(err.stack);
  if (!isProduction) process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason);
});

// ============================================================
//  تشغيل السيرفر
// ============================================================
const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`);
  console.log(`📚 عدد الحجوزات: ${bookingService.getBookings().length}`);
  console.log(`🔑 ADMIN_PASSWORD موجود: ${!!process.env.ADMIN_PASSWORD}`);
  console.log(`📋 مسارات /api/admin محملة: ${adminRoutesLoaded ? '✅ نعم' : '❌ لا'}`);
  
  // تشغيل بوت تليجرام (مع معالجة الأخطاء)
  try {
    telegramService.initBot();
    console.log('✅ بوت تليجرام يعمل بنجاح');
  } catch (botError) {
    console.error('❌ فشل بدء البوت:', botError.message);
  }
  console.log('═══════════════════════════════════════════════');
});

// ============================================================
//  إغلاق آمن (Graceful Shutdown)
// ============================================================
process.on('SIGINT', () => {
  console.log('🛑 جاري إيقاف السيرفر...');
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