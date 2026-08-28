// backend/services/bookingService.js
// خدمة الحجوزات - الإصدار المتكامل (V3.0) لدعم البوت التفاعلي

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
 * إضافة حجز جديد (يدعم الحصص التجريبية والعادية)
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
    gradeName: bookingData.gradeName || bookingData.grade,
    subject: bookingData.subject,
    subjectName: bookingData.subjectName || bookingData.subject,
    date: bookingData.date,
    time: bookingData.time,
    notes: bookingData.notes || '',
    type: isTrial ? 'trial' : 'regular',
    status: 'pending',
    source: bookingData.source || 'telegram',
    meetLink: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  bookings.push(newBooking);
  saveBookings(bookings);
  
  console.log(`✅ تم إضافة حجز ${isTrial ? '🆓 تجريبي' : '📚 عادي'} (${id}) من مصدر: ${newBooking.source}`);
  return newBooking;
}

/**
 * جلب حجز بواسطة المعرف
 */
function getBookingById(id) {
  const bookings = getBookings();
  return bookings.find(b => b.id === id) || null;
}

/**
 * تحديث حجز (عام)
 */
function updateBooking(id, updates) {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  
  if (index === -1) return null;
  
  bookings[index] = {
    ...bookings[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  saveBookings(bookings);
  return bookings[index];
}

/**
 * تحديث حالة الحجز (مع دعم Google Meet)
 */
function updateBookingStatus(id, status, meetLink = null) {
  const updates = { status };
  if (meetLink) updates.meetLink = meetLink;
  return updateBooking(id, updates);
}

/**
 * جلب حجوزات اليوم المؤكدة
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

/**
 * حذف حجز
 */
function deleteBooking(id) {
  let bookings = getBookings();
  const initialLength = bookings.length;
  bookings = bookings.filter(b => b.id !== id);
  if (bookings.length === initialLength) return false;
  saveBookings(bookings);
  return true;
}

module.exports = {
  getBookings,
  getBookingById,
  addBooking,
  updateBooking,
  updateBookingStatus,
  getTodayBookings,
  getTrialBookings,
  deleteBooking
};