const fs = require('fs');
const path = require('path');
const constants = require('../config/constants');

// ===== دوال مساعدة =====

/**
 * قراءة جميع الحجوزات من ملف JSON
 */
function getBookings() {
  try {
    if (!fs.existsSync(constants.BOOKINGS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(constants.BOOKINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ خطأ في قراءة الحجوزات:', error.message);
    return [];
  }
}

/**
 * حفظ الحجوزات في ملف JSON
 */
function saveBookings(bookings) {
  try {
    const dir = path.dirname(constants.BOOKINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(constants.BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('❌ خطأ في حفظ الحجوزات:', error.message);
    return false;
  }
}

/**
 * إضافة حجز جديد (يدعم الحصص التجريبية)
 */
function addBooking(bookingData) {
  const bookings = getBookings();
  
  // إنشاء معرف فريد
  const id = 'BK' + Date.now() + Math.floor(Math.random() * 1000);
  
  // تحديد نوع الحجز
  const isTrial = bookingData.bookingType === 'trial';
  
  const newBooking = {
    id,
    name: bookingData.name,
    phone: bookingData.phone,
    grade: bookingData.grade,
    subject: bookingData.subject,
    date: bookingData.date,
    time: bookingData.time,
    notes: bookingData.notes || '',
    type: isTrial ? 'trial' : 'regular',
    status: 'pending',
    meetLink: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  bookings.push(newBooking);
  saveBookings(bookings);
  
  console.log(`✅ تم إضافة حجز ${isTrial ? '🆓 تجريبي' : '📚 عادي'}: ${id}`);
  return newBooking;
}

/**
 * تحديث حالة الحجز (مع دعم Google Meet)
 */
function updateBookingStatus(id, status, meetLink = null) {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  
  if (index === -1) return null;
  
  bookings[index].status = status;
  bookings[index].updatedAt = new Date().toISOString();
  
  if (meetLink) {
    bookings[index].meetLink = meetLink;
  }
  
  saveBookings(bookings);
  return bookings[index];
}

/**
 * جلب حجوزات اليوم
 */
function getTodayBookings() {
  const bookings = getBookings();
  const today = new Date().toISOString().split('T')[0];
  return bookings.filter(b => b.date === today && b.status === 'confirmed');
}

/**
 * جلب الحجوزات التجريبية
 */
function getTrialBookings() {
  const bookings = getBookings();
  return bookings.filter(b => b.type === 'trial');
}

module.exports = {
  getBookings,
  addBooking,
  updateBookingStatus,
  getTodayBookings,
  getTrialBookings
};