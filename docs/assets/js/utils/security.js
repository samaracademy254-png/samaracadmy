// docs/assets/js/utils/security.js
// كبير المستشارين - وحدة الأمان الموحدة

const SecurityUtils = (function() {
    // دالة تشفير بسيطة (Base64) لإخفاء كلمة المرور عن الأعين أثناء التخزين المؤقت
    // ملاحظة: هذا ليس تشفيراً حقيقياً، لكنه يمنع القراءة السريعة من localStorage
    function encode(str) {
        return btoa(encodeURIComponent(str));
    }

    function decode(str) {
        try {
            return decodeURIComponent(atob(str));
        } catch(e) {
            return null;
        }
    }

    // تخزين التوكن في SessionStorage (يُحذف تلقائياً عند إغلاق التبويب)
    function setAuthToken(token) {
        if (token) {
            sessionStorage.setItem('adminToken', encode(token));
        } else {
            sessionStorage.removeItem('adminToken');
        }
    }

    function getAuthToken() {
        const encoded = sessionStorage.getItem('adminToken');
        if (!encoded) return null;
        return decode(encoded);
    }

    // تنقية النصوص لمنع هجمات XSS (أقوى من الدالة السابقة)
    function sanitizeHTML(text) {
        if (!text) return '';
        const element = document.createElement('div');
        element.textContent = text;
        return element.innerHTML;
    }

    // التحقق من وجود صلاحية الدخول
    function isAuthenticated() {
        return !!getAuthToken();
    }

    return {
        setAuthToken,
        getAuthToken,
        sanitizeHTML,
        isAuthenticated
    };
})();

// تصدير للاستخدام العام
window.SecurityUtils = SecurityUtils;