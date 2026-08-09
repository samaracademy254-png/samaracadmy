const fs = require('fs');
const path = require('path');
const constants = require('../config/constants');
const bookingService = require('../services/bookingService');

// ========== دوال مساعدة ==========
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch { return {}; }
}

function writeJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch { return false; }
}

// ========== دوال التحكم ==========
const adminController = {
  // --- إحصائيات ---
  getStats: (req, res) => {
    try {
      const lessons = readJSON(constants.LESSONS_FILE);
      const bookings = bookingService.getBookings();
      
      let totalSubjects = 0, totalUnits = 0, totalLessons = 0;
      for (const grade in lessons) {
        if (lessons[grade].subjects) {
          for (const subject in lessons[grade].subjects) {
            totalSubjects++;
            const units = lessons[grade].subjects[subject].units || [];
            totalUnits += units.length;
            units.forEach(unit => {
              totalLessons += (unit.lessons || []).length;
            });
          }
        }
      }
      
      res.json({
        success: true,
        data: {
          totalGrades: Object.keys(lessons).length,
          totalSubjects,
          totalUnits,
          totalLessons,
          totalBookings: bookings.length,
          pendingBookings: bookings.filter(b => b.status === 'pending').length,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // --- الصفوف ---
  getGrades: (req, res) => {
    try {
      const lessons = readJSON(constants.LESSONS_FILE);
      const grades = Object.keys(lessons).map(id => ({
        id,
        name: id === 'p4' ? 'رابع ابتدائي' :
              id === 'p5' ? 'خامس ابتدائي' :
              id === 'p6' ? 'سادس ابتدائي' :
              id === 'm1' ? 'أول متوسط' :
              id === 'm2' ? 'ثاني متوسط' :
              id === 'm3' ? 'ثالث متوسط' : id,
        subjects: lessons[id].subjects ? Object.keys(lessons[id].subjects).length : 0
      }));
      res.json({ success: true, data: grades });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  addGrade: (req, res) => {
    try {
      const { id, name } = req.body;
      if (!id) return res.status(400).json({ success: false, message: 'معرف الصف مطلوب' });
      const lessons = readJSON(constants.LESSONS_FILE);
      if (lessons[id]) return res.status(400).json({ success: false, message: 'الصف موجود مسبقاً' });
      lessons[id] = { subjects: {} };
      writeJSON(constants.LESSONS_FILE, lessons);
      res.json({ success: true, message: 'تم إضافة الصف' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteGrade: (req, res) => {
    try {
      const { id } = req.params;
      const lessons = readJSON(constants.LESSONS_FILE);
      if (!lessons[id]) return res.status(404).json({ success: false, message: 'الصف غير موجود' });
      delete lessons[id];
      writeJSON(constants.LESSONS_FILE, lessons);
      res.json({ success: true, message: 'تم حذف الصف' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // --- المواد ---
  getSubjects: (req, res) => {
    try {
      const { gradeId } = req.params;
      const lessons = readJSON(constants.LESSONS_FILE);
      const subjects = lessons[gradeId]?.subjects || {};
      const list = Object.keys(subjects).map(name => ({
        name,
        grade: gradeId,
        gradeId: gradeId,
        units: subjects[name].units ? subjects[name].units.length : 0
      }));
      res.json({ success: true, data: list });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAllSubjects: (req, res) => {
    try {
      const lessons = readJSON(constants.LESSONS_FILE);
      const list = [];
      for (const gradeId in lessons) {
        const subjects = lessons[gradeId]?.subjects || {};
        for (const name in subjects) {
          list.push({
            name,
            grade: gradeId,
            gradeId: gradeId,
            units: subjects[name].units ? subjects[name].units.length : 0
          });
        }
      }
      res.json({ success: true, data: list });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  addSubject: (req, res) => {
    try {
      const { gradeId, name } = req.body;
      if (!gradeId || !name) return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
      const lessons = readJSON(constants.LESSONS_FILE);
      if (!lessons[gradeId]) lessons[gradeId] = { subjects: {} };
      if (lessons[gradeId].subjects[name]) return res.status(400).json({ success: false, message: 'المادة موجودة' });
      lessons[gradeId].subjects[name] = { units: [] };
      writeJSON(constants.LESSONS_FILE, lessons);
      res.json({ success: true, message: 'تم إضافة المادة' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteSubject: (req, res) => {
    try {
      const { gradeId, subjectName } = req.params;
      const lessons = readJSON(constants.LESSONS_FILE);
      if (!lessons[gradeId]?.subjects?.[subjectName]) return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
      delete lessons[gradeId].subjects[subjectName];
      writeJSON(constants.LESSONS_FILE, lessons);
      res.json({ success: true, message: 'تم حذف المادة' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // --- الوحدات ---
  getUnits: (req, res) => {
    try {
      const { gradeId, subjectName } = req.params;
      const lessons = readJSON(constants.LESSONS_FILE);
      const units = lessons[gradeId]?.subjects?.[subjectName]?.units || [];
      res.json({ success: true, data: units });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAllUnits: (req, res) => {
    try {
      const lessons = readJSON(constants.LESSONS_FILE);
      const list = [];
      for (const gradeId in lessons) {
        const subjects = lessons[gradeId]?.subjects || {};
        for (const subjectName in subjects) {
          const units = subjects[subjectName].units || [];
          units.forEach(u => {
            list.push({
              id: u.id,
              name: u.name,
              subject: subjectName,
              grade: gradeId,
              gradeId: gradeId,
              subjectName: subjectName,
              lessons: u.lessons ? u.lessons.length : 0
            });
          });
        }
      }
      res.json({ success: true, data: list });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  addUnit: (req, res) => {
    try {
      const { gradeId, subjectName, unitId, unitName } = req.body;
      if (!gradeId || !subjectName || !unitId || !unitName) {
        return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
      }
      const lessons = readJSON(constants.LESSONS_FILE);
      if (!lessons[gradeId]) lessons[gradeId] = { subjects: {} };
      if (!lessons[gradeId].subjects[subjectName]) {
        lessons[gradeId].subjects[subjectName] = { units: [] };
      }
      if (lessons[gradeId].subjects[subjectName].units.some(u => u.id === unitId)) {
        return res.status(400).json({ success: false, message: 'الوحدة موجودة' });
      }
      lessons[gradeId].subjects[subjectName].units.push({ id: unitId, name: unitName, lessons: [] });
      writeJSON(constants.LESSONS_FILE, lessons);
      res.json({ success: true, message: 'تم إضافة الوحدة' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteUnit: (req, res) => {
    try {
      const { gradeId, subjectName, unitId } = req.params;
      const lessons = readJSON(constants.LESSONS_FILE);
      const units = lessons[gradeId]?.subjects?.[subjectName]?.units || [];
      const index = units.findIndex(u => u.id === unitId);
      if (index === -1) return res.status(404).json({ success: false, message: 'الوحدة غير موجودة' });
      units.splice(index, 1);
      writeJSON(constants.LESSONS_FILE, lessons);
      res.json({ success: true, message: 'تم حذف الوحدة' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // --- الدروس ---
  getLessons: (req, res) => {
    try {
      const { gradeId, subjectName, unitId } = req.params;
      const lessons = readJSON(constants.LESSONS_FILE);
      const unit = lessons[gradeId]?.subjects?.[subjectName]?.units.find(u => u.id === unitId);
      res.json({ success: true, data: unit?.lessons || [] });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAllLessons: (req, res) => {
    try {
      const lessons = readJSON(constants.LESSONS_FILE);
      const list = [];
      for (const gradeId in lessons) {
        const subjects = lessons[gradeId]?.subjects || {};
        for (const subjectName in subjects) {
          const units = subjects[subjectName].units || [];
          units.forEach(u => {
            (u.lessons || []).forEach(l => {
              list.push({
                id: l.id,
                name: l.name,
                unit: u.name,
                unitId: u.id,
                subject: subjectName,
                subjectName: subjectName,
                grade: gradeId,
                gradeId: gradeId
              });
            });
          });
        }
      }
      res.json({ success: true, data: list });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  addLesson: (req, res) => {
    try {
      const { gradeId, subjectName, unitId, lessonId, lessonName, videoUrl, summary } = req.body;
      if (!gradeId || !subjectName || !unitId || !lessonId || !lessonName) {
        return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
      }
      const lessons = readJSON(constants.LESSONS_FILE);
      const unit = lessons[gradeId]?.subjects?.[subjectName]?.units.find(u => u.id === unitId);
      if (!unit) return res.status(404).json({ success: false, message: 'الوحدة غير موجودة' });
      if (unit.lessons.some(l => l.id === lessonId)) {
        return res.status(400).json({ success: false, message: 'الدرس موجود' });
      }
      unit.lessons.push({ id: lessonId, name: lessonName, videoUrl, summary });
      writeJSON(constants.LESSONS_FILE, lessons);
      res.json({ success: true, message: 'تم إضافة الدرس' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteLesson: (req, res) => {
    try {
      const { gradeId, subjectName, unitId, lessonId } = req.params;
      const lessons = readJSON(constants.LESSONS_FILE);
      const unit = lessons[gradeId]?.subjects?.[subjectName]?.units.find(u => u.id === unitId);
      if (!unit) return res.status(404).json({ success: false, message: 'الوحدة غير موجودة' });
      const index = unit.lessons.findIndex(l => l.id === lessonId);
      if (index === -1) return res.status(404).json({ success: false, message: 'الدرس غير موجود' });
      unit.lessons.splice(index, 1);
      writeJSON(constants.LESSONS_FILE, lessons);
      res.json({ success: true, message: 'تم حذف الدرس' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // --- الحجوزات ---
  getBookings: (req, res) => {
    try {
      const bookings = bookingService.getBookings();
      const { status } = req.query;
      const filtered = status ? bookings.filter(b => b.status === status) : bookings;
      res.json({ success: true, data: filtered });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateBooking: (req, res) => {
    try {
      const { id } = req.params;
      const { status, meetLink } = req.body;
      if (!status) return res.status(400).json({ success: false, message: 'الحالة مطلوبة' });
      const updated = bookingService.updateBookingStatus(id, status, meetLink);
      if (!updated) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      res.json({ success: true, data: updated, message: 'تم تحديث الحالة' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteBooking: (req, res) => {
    try {
      const { id } = req.params;
      const bookings = bookingService.getBookings();
      const index = bookings.findIndex(b => b.id === id);
      if (index === -1) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
      bookings.splice(index, 1);
      bookingService.saveBookings(bookings);
      res.json({ success: true, message: 'تم حذف الحجز' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = adminController;
