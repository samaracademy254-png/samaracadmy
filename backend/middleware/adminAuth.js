const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

function adminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'غير مصرح: يرجى تسجيل الدخول' });
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(403).json({ success: false, message: 'تنسيق التوكن غير صحيح' });
  }
  
  const password = parts[1];
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, message: 'كلمة مرور خاطئة' });
  }
  
  next();
}

module.exports = { adminAuth };
