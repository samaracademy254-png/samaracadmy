// docs/assets/js/services/api.service.js
// كبير المستشارين - خدمة API الموحدة (V3.0)

const ApiService = (function() {
    // يمكن تغيير هذا الرابط هنا مستقبلاً بسهولة دون تعديل باقي الكود
    const BASE_URL = 'https://w2rb3hs4r802-production-rll4xs02.europe-west1.suga.run';

    // دالة مساعدة للحصول على التوكن ديناميكياً
    function getToken() {
        if (typeof SecurityUtils !== 'undefined') {
            return SecurityUtils.getAuthToken();
        }
        return null;
    }

    // الدالة الأساسية للطلبات (تعيد كائن Response)
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
            // إذا كان الرد 401، نقوم بتسجيل الخروج تلقائياً
            if (response.status === 401 || response.status === 403) {
                if (typeof SecurityUtils !== 'undefined') {
                    SecurityUtils.setAuthToken(null);
                    // إذا كنا في صفحة الأدمن، نعيد التوجيه للدخول
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

    // ===== واجهات API العامة =====
    function getStudyData(grade, subject, unit, lesson) {
        return request(`/api/study/${grade}/${subject}/${unit}/${lesson}`);
    }

    function getQuizData(grade, subject, unit, lesson) {
        return request(`/api/quiz/${grade}/${subject}/${unit}/${lesson}`);
    }

    function getGrades() {
        return request('/api/admin/grades');
    }

    function getSubjects(gradeId) {
        return request(`/api/admin/subjects/${gradeId}`);
    }

    function getUnits(gradeId, subjectName) {
        return request(`/api/admin/units/${gradeId}/${encodeURIComponent(subjectName)}`);
    }

    function getBookings(params = {}) {
        const query = new URLSearchParams(params).toString();
        return request(`/api/admin/bookings${query ? '?' + query : ''}`);
    }

    function updateBooking(id, data) {
        return request(`/api/admin/bookings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    function deleteBooking(id) {
        return request(`/api/admin/bookings/${id}`, {
            method: 'DELETE'
        });
    }

    function addGrade(data) { return request('/api/admin/grades', { method: 'POST', body: JSON.stringify(data) }); }
    function deleteGrade(id) { return request(`/api/admin/grades/${id}`, { method: 'DELETE' }); }

    function addSubject(data) { return request('/api/admin/subjects', { method: 'POST', body: JSON.stringify(data) }); }
    function deleteSubject(gradeId, subjectName) { return request(`/api/admin/subjects/${gradeId}/${encodeURIComponent(subjectName)}`, { method: 'DELETE' }); }

    function addUnit(data) { return request('/api/admin/units', { method: 'POST', body: JSON.stringify(data) }); }
    function deleteUnit(gradeId, subjectName, unitId) { return request(`/api/admin/units/${gradeId}/${encodeURIComponent(subjectName)}/${unitId}`, { method: 'DELETE' }); }

    function addLesson(data) { return request('/api/admin/lessons', { method: 'POST', body: JSON.stringify(data) }); }
    function deleteLesson(gradeId, subjectName, unitId, lessonId) { return request(`/api/admin/lessons/${gradeId}/${encodeURIComponent(subjectName)}/${unitId}/${lessonId}`, { method: 'DELETE' }); }

    function getStats() {
        return request('/api/admin/stats');
    }

    function createBooking(data) {
        return request('/api/booking', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // فضح الواجهات العامة
    return {
        getStudyData,
        getQuizData,
        getGrades,
        getSubjects,
        getUnits,
        getBookings,
        updateBooking,
        deleteBooking,
        addGrade,
        deleteGrade,
        addSubject,
        deleteSubject,
        addUnit,
        deleteUnit,
        addLesson,
        deleteLesson,
        getStats,
        createBooking,
        // فضح الدالة الأساسية للاستخدامات الاستثنائية
        request
    };
})();

window.ApiService = ApiService;