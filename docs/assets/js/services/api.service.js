// docs/assets/js/services/api.service.js
// خدمة API الموحدة - الإصدار المطور (V5.0)

const ApiService = (function() {
    // الرابط الأساسي للخادم (Suga)
    const BASE_URL = 'https://lnbbsnxkkm0w-production-rll4xs02.europe-west1.suga.run';

    // ===== دوال أساسية =====
    function getToken() {
        if (typeof SecurityUtils !== 'undefined') {
            return SecurityUtils.getAuthToken();
        }
        return null;
    }

    async function request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const token = getToken();

        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            if (response.status === 401 || response.status === 403) {
                if (typeof SecurityUtils !== 'undefined') {
                    SecurityUtils.setAuthToken(null);
                    if (window.location.pathname.includes('admin')) {
                        window.location.href = 'login.html';
                    }
                }
                throw new Error('Unauthorized');
            }
            return response;
        } catch (error) {
            console.error('API Service Error:', error);
            throw error;
        }
    }

    // ===== جلب البيانات من الملفات المحلية (للواجهة الأمامية) =====
    async function fetchLocalJSON(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`❌ فشل جلب الملف: ${path}`, error);
            return null;
        }
    }

    // ===== دوال المنهج الجديد =====

    /**
     * جلب قائمة الوحدات لصف ومادة معينين
     * @param {string} gradeId - معرف الصف (مثل: p4)
     * @param {string} subjectId - معرف المادة (مثل: arabic)
     * @returns {Promise<Array>} قائمة الوحدات
     */
    async function getUnits(gradeId, subjectId) {
        const data = await fetchLocalJSON('../../data/units.json');
        if (data && data[gradeId] && data[gradeId][subjectId]) {
            return data[gradeId][subjectId].units || [];
        }
        return [];
    }

    /**
     * جلب قائمة الدروس لوحدة معينة (من study_data أو quiz_data)
     * @param {string} type - نوع البيانات ('study' أو 'quiz')
     * @param {string} gradeId - معرف الصف
     * @param {string} subjectId - معرف المادة
     * @param {string} unitId - معرف الوحدة
     * @returns {Promise<Array>} قائمة الدروس
     */
    async function getLessonsList(type, gradeId, subjectId, unitId) {
        const folder = type === 'study' ? 'study_data' : 'quiz_data';
        const path = `../../data/${folder}/${gradeId}/${subjectId}/${unitId}/lessons.json`;
        const data = await fetchLocalJSON(path);
        return data && data.lessons ? data.lessons : [];
    }

    /**
     * جلب محتوى درس معين (من study_data أو quiz_data)
     * @param {string} type - نوع البيانات ('study' أو 'quiz')
     * @param {string} gradeId - معرف الصف
     * @param {string} subjectId - معرف المادة
     * @param {string} unitId - معرف الوحدة
     * @param {string} lessonId - معرف الدرس
     * @returns {Promise<Object>} محتوى الدرس
     */
    async function getLessonContent(type, gradeId, subjectId, unitId, lessonId) {
        const folder = type === 'study' ? 'study_data' : 'quiz_data';
        const path = `../../data/${folder}/${gradeId}/${subjectId}/${unitId}/${lessonId}.json`;
        return await fetchLocalJSON(path);
    }

    /**
     * جلب إعدادات الصفوف
     */
    async function getGrades() {
        const data = await fetchLocalJSON('../../data/grades.json');
        return data || { primary: [], intermediate: [] };
    }

    // ===== دوال التوافق مع الإصدارات السابقة (للـ Admin) =====
    // ... (تبقى دوال API القديمة كما هي للتوافق مع لوحة التحكم)

    // ===== تصدير الواجهات العامة =====
    return {
        // الدوال الأساسية
        request,
        fetchLocalJSON,
        
        // دوال المنهج الجديد
        getUnits,
        getLessonsList,
        getLessonContent,
        getGrades,

        // دوال التوافق القديم (للـ Admin - سيتم تحديثها لاحقاً)
        getSubjects: () => request('/api/admin/subjects'),
        getBookings: (params) => request(`/api/admin/bookings${params ? '?' + new URLSearchParams(params).toString() : ''}`),
        updateBooking: (id, data) => request(`/api/admin/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        deleteBooking: (id) => request(`/api/admin/bookings/${id}`, { method: 'DELETE' }),
        getStats: () => request('/api/admin/stats'),
        createBooking: (data) => request('/api/booking', { method: 'POST', body: JSON.stringify(data) }),
    };
})();

window.ApiService = ApiService;
