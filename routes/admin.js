const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// جميع المسارات محمية بكلمة مرور
router.use(adminAuth);

// ========== إحصائيات ==========
router.get('/stats', adminController.getStats);

// ========== الصفوف ==========
router.get('/grades', adminController.getGrades);
router.post('/grades', adminController.addGrade);
router.delete('/grades/:id', adminController.deleteGrade);

// ========== المواد ==========
router.get('/subjects/all', adminController.getAllSubjects);
router.get('/subjects/:gradeId', adminController.getSubjects);
router.post('/subjects', adminController.addSubject);
router.delete('/subjects/:gradeId/:subjectName', adminController.deleteSubject);

// ========== الوحدات ==========
router.get('/units/all', adminController.getAllUnits);
router.get('/units/:gradeId/:subjectName', adminController.getUnits);
router.post('/units', adminController.addUnit);
router.delete('/units/:gradeId/:subjectName/:unitId', adminController.deleteUnit);

// ========== الدروس ==========
router.get('/lessons/all', adminController.getAllLessons);
router.get('/lessons/:gradeId/:subjectName/:unitId', adminController.getLessons);
router.post('/lessons', adminController.addLesson);
router.delete('/lessons/:gradeId/:subjectName/:unitId/:lessonId', adminController.deleteLesson);

// ========== الحجوزات ==========
router.get('/bookings', adminController.getBookings);
router.put('/bookings/:id', adminController.updateBooking);
router.delete('/bookings/:id', adminController.deleteBooking);

module.exports = router;
