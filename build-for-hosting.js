import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// دالة مساعدة لنسخ المجلدات
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('🚀 بدء تحويل التطبيق للاستضافة العادية...');

// إنشاء مجلد التوزيع
const distDir = path.join(__dirname, 'dist-hosting');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. بناء الواجهة الأمامية
console.log('📦 بناء الواجهة الأمامية...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ تم بناء الواجهة الأمامية بنجاح');
} catch (error) {
  console.error('❌ فشل في بناء الواجهة الأمامية');
  process.exit(1);
}

// 2. نسخ ملفات الواجهة الأمامية
console.log('📂 نسخ ملفات الواجهة الأمامية...');
if (fs.existsSync('dist')) {
  copyDir('dist', distDir);
  console.log('✅ تم نسخ ملفات الواجهة الأمامية');
} else {
  console.log('⚠️ مجلد dist غير موجود، تخطي نسخ الواجهة الأمامية');
}

// 3. إنشاء ملف PHP للـ API
console.log('🔧 إنشاء ملفات PHP للواجهة الخلفية...');

// إنشاء ملف الاتصال بقاعدة البيانات
const dbConfigPhp = `<?php
// إعدادات قاعدة البيانات
class Database {
    private $host = 'localhost';     // عادة localhost في Hostinger
    private $database = 'your_db_name';  // اسم قاعدة البيانات في Hostinger
    private $username = 'your_db_user';  // اسم المستخدم
    private $password = 'your_db_pass';  // كلمة المرور
    private $charset = 'utf8mb4';
    
    private $pdo;
    
    public function __construct() {
        $dsn = "mysql:host={$this->host};dbname={$this->database};charset={$this->charset}";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        try {
            $this->pdo = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $e) {
            throw new PDOException($e->getMessage(), (int)$e->getCode());
        }
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}

// دالة للاستجابة بـ JSON
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// دالة للحصول على البيانات المرسلة
function getRequestData() {
    $input = file_get_contents('php://input');
    return json_decode($input, true);
}
?>`;

// إنشاء مجلد api
const apiDir = path.join(distDir, 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

fs.writeFileSync(path.join(apiDir, 'config.php'), dbConfigPhp);

// إنشاء ملف API رئيسي
const indexPhp = `<?php
require_once 'config.php';

// الحصول على المسار والطريقة
$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// إزالة البادئة إذا كانت موجودة
$path = str_replace('/api/', '', parse_url($request_uri, PHP_URL_PATH));

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    // توجيه الطلبات
    switch (true) {
        // المصادقة
        case $path === 'auth/send-otp' && $method === 'POST':
            require_once 'endpoints/auth.php';
            sendOtp($pdo);
            break;
            
        case $path === 'auth/verify-otp' && $method === 'POST':
            require_once 'endpoints/auth.php';
            verifyOtp($pdo);
            break;
            
        case $path === 'auth/create-user' && $method === 'POST':
            require_once 'endpoints/auth.php';
            createUser($pdo);
            break;
            
        // المستخدمين
        case $path === 'user/current' && $method === 'GET':
            require_once 'endpoints/users.php';
            getCurrentUser($pdo);
            break;
            
        // المحادثات
        case $path === 'chats' && $method === 'GET':
            require_once 'endpoints/chats.php';
            getChats($pdo);
            break;
            
        case preg_match('/^chats\/([^\/]+)\/messages$/', $path, $matches) && $method === 'GET':
            require_once 'endpoints/messages.php';
            getChatMessages($pdo, $matches[1]);
            break;
            
        // الحالات
        case $path === 'stories' && $method === 'GET':
            require_once 'endpoints/stories.php';
            getStories($pdo);
            break;
            
        case $path === 'stories' && $method === 'POST':
            require_once 'endpoints/stories.php';
            createStory($pdo);
            break;
            
        // الميزات
        case $path === 'features' && $method === 'GET':
            require_once 'endpoints/features.php';
            getFeatures($pdo);
            break;
            
        default:
            jsonResponse(['message' => 'الطريق غير موجود'], 404);
    }
    
} catch (Exception $e) {
    jsonResponse(['message' => 'خطأ في الخادم: ' . $e->getMessage()], 500);
}
?>`;

fs.writeFileSync(path.join(apiDir, 'index.php'), indexPhp);

// إنشاء ملفات الـ endpoints
const authEndpoints = `<?php
function sendOtp($pdo) {
    $data = getRequestData();
    $phoneNumber = $data['phoneNumber'] ?? '';
    
    if (empty($phoneNumber)) {
        jsonResponse(['message' => 'رقم الهاتف مطلوب'], 400);
    }
    
    // توليد رمز OTP
    $otpCode = sprintf('%06d', mt_rand(100000, 999999));
    
    // حفظ OTP في قاعدة البيانات
    $stmt = $pdo->prepare("INSERT INTO otp_codes (phone_number, code, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 10 MINUTE))");
    $stmt->execute([$phoneNumber, $otpCode]);
    
    // في البيئة التطويرية، نرجع الكود. في الإنتاج، أرسل SMS
    jsonResponse([
        'success' => true,
        'message' => 'تم إرسال رمز التحقق بنجاح',
        'otp' => $otpCode // إزالة هذا في الإنتاج
    ]);
}

function verifyOtp($pdo) {
    $data = getRequestData();
    $phoneNumber = $data['phoneNumber'] ?? '';
    $otpCode = $data['otpCode'] ?? '';
    
    // التحقق من OTP
    $stmt = $pdo->prepare("SELECT * FROM otp_codes WHERE phone_number = ? AND code = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$phoneNumber, $otpCode]);
    $otp = $stmt->fetch();
    
    if (!$otp) {
        jsonResponse(['message' => 'رمز التحقق غير صحيح أو منتهي الصلاحية'], 400);
    }
    
    // التحقق من وجود المستخدم
    $stmt = $pdo->prepare("SELECT * FROM users WHERE phone_number = ?");
    $stmt->execute([$phoneNumber]);
    $user = $stmt->fetch();
    
    if ($user) {
        // إنشاء جلسة
        $token = bin2hex(random_bytes(32));
        $stmt = $pdo->prepare("INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))");
        $stmt->execute([$user['id'], $token]);
        
        jsonResponse([
            'success' => true,
            'user' => $user,
            'token' => $token
        ]);
    } else {
        jsonResponse(['success' => false, 'requiresProfile' => true]);
    }
}

function createUser($pdo) {
    $data = getRequestData();
    $phoneNumber = $data['phoneNumber'] ?? '';
    $name = $data['name'] ?? '';
    $location = $data['location'] ?? '';
    
    if (empty($name) || empty($location)) {
        jsonResponse(['message' => 'الاسم والمنطقة مطلوبان'], 400);
    }
    
    // إنشاء المستخدم
    $userId = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare("INSERT INTO users (id, name, phone_number, location, created_at) VALUES (?, ?, ?, ?, NOW())");
    $stmt->execute([$userId, $name, $phoneNumber, $location]);
    
    // الحصول على المستخدم المُنشأ
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    // إنشاء جلسة
    $token = bin2hex(random_bytes(32));
    $stmt = $pdo->prepare("INSERT INTO sessions (user_id, token, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))");
    $stmt->execute([$userId, $token]);
    
    jsonResponse([
        'success' => true,
        'user' => $user,
        'token' => $token
    ]);
}
?>`;

// إنشاء مجلد endpoints
const endpointsDir = path.join(apiDir, 'endpoints');
if (!fs.existsSync(endpointsDir)) {
  fs.mkdirSync(endpointsDir, { recursive: true });
}

fs.writeFileSync(path.join(endpointsDir, 'auth.php'), authEndpoints);

// إنشاء ملف .htaccess للتوجيه
const htaccess = `RewriteEngine On

# إعادة توجيه طلبات API إلى ملف PHP
RewriteRule ^api/(.*)$ api/index.php [QSA,L]

# إعادة توجيه باقي الطلبات إلى index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]

# تمكين CORS
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

# ضغط الملفات
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# تخزين مؤقت للملفات الثابتة
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>`;

fs.writeFileSync(path.join(distDir, '.htaccess'), htaccess);

// إنشاء ملف قاعدة البيانات SQL
const sqlSchema = `-- إنشاء قاعدة البيانات لـ BizChat
CREATE DATABASE IF NOT EXISTS bizchat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bizchat;

-- جدول المستخدمين
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- جدول رموز OTP
CREATE TABLE otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_phone_code (phone_number, code),
    INDEX idx_expires (expires_at)
);

-- جدول الجلسات
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);

-- جدول المحادثات
CREATE TABLE chats (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    participants JSON NOT NULL,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- جدول الرسائل
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    chat_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT,
    message_type ENUM('text', 'image', 'video', 'audio', 'file', 'sticker', 'location') DEFAULT 'text',
    image_url VARCHAR(500),
    audio_url VARCHAR(500),
    sticker_url VARCHAR(500),
    sticker_id VARCHAR(36),
    location_lat DECIMAL(10, 8),
    location_lon DECIMAL(11, 8),
    location_name VARCHAR(255),
    reply_to_message_id VARCHAR(36),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    is_delivered BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL,
    INDEX idx_chat_timestamp (chat_id, timestamp),
    INDEX idx_sender (sender_id)
);

-- جدول الحالات
CREATE TABLE stories (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    location VARCHAR(255) NOT NULL,
    content TEXT,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    background_color VARCHAR(7) DEFAULT '#075e54',
    text_color VARCHAR(7) DEFAULT '#ffffff',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    view_count INT DEFAULT 0,
    viewers JSON DEFAULT ('[]'),
    category VARCHAR(50) DEFAULT 'general',
    is_highlight BOOLEAN DEFAULT FALSE,
    privacy_settings JSON DEFAULT ('{"isPublic": true}'),
    poll_options JSON,
    music_url VARCHAR(500),
    link_url VARCHAR(500),
    link_title VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_location_expires (location, expires_at),
    INDEX idx_user_timestamp (user_id, timestamp)
);

-- جدول ميزات التطبيق
CREATE TABLE app_features (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    category VARCHAR(100) DEFAULT 'general',
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- إدراج الميزات الافتراضية
INSERT INTO app_features (id, name, description, is_enabled, category, priority) VALUES
('messaging', 'المراسلة', 'إرسال واستقبال الرسائل النصية والوسائط', true, 'communication', 1),
('stories', 'الحالات', 'مشاركة الحالات والصور المؤقتة', true, 'social', 2),
('stores', 'المتاجر', 'إنشاء وإدارة المتاجر الإلكترونية', true, 'commerce', 3),
('products', 'المنتجات', 'عرض وبيع المنتجات', true, 'commerce', 4),
('cart', 'سلة التسوق', 'إضافة المنتجات وإجراء عمليات الشراء', true, 'commerce', 5);

-- إنشاء مستخدم تجريبي
INSERT INTO users (id, name, phone_number, location, is_verified) VALUES 
('demo-user-1', 'أحمد محمد', '+213555123456', 'تندوف', true);`;

fs.writeFileSync(path.join(distDir, 'database.sql'), sqlSchema);

// إنشاء دليل التثبيت
const installGuide = `# دليل تثبيت BizChat على استضافة Hostinger

## المتطلبات
- استضافة تدعم PHP 7.4+ و MySQL
- إمكانية الوصول إلى cPanel أو File Manager
- قاعدة بيانات MySQL

## خطوات التثبيت

### 1. رفع الملفات
1. ادخل إلى cPanel في Hostinger
2. افتح File Manager
3. اذهب إلى مجلد public_html
4. احذف أي ملفات موجودة (index.html وغيرها)
5. ارفع جميع الملفات من مجلد dist-hosting
6. فك ضغط الملفات إذا لزم الأمر

### 2. إنشاء قاعدة البيانات
1. في cPanel، اذهب إلى MySQL Databases
2. أنشئ قاعدة بيانات جديدة (مثل: username_bizchat)
3. أنشئ مستخدم قاعدة بيانات وأعطه جميع الصلاحيات
4. افتح phpMyAdmin
5. اختر قاعدة البيانات الجديدة
6. استورد ملف database.sql

### 3. تكوين الإعدادات
1. افتح ملف api/config.php
2. عدّل إعدادات قاعدة البيانات:
   - \$host = 'localhost' (عادة localhost)
   - \$database = 'اسم_قاعدة_البيانات'
   - \$username = 'اسم_المستخدم'
   - \$password = 'كلمة_المرور'

### 4. التحقق من التثبيت
1. اذهب إلى رابط موقعك
2. يجب أن تظهر واجهة BizChat
3. جرب تسجيل الدخول برقم هاتف

## ملاحظات مهمة
- تأكد من أن ملف .htaccess مرفوع ويعمل
- في بعض الاستضافات قد تحتاج لتفعيل mod_rewrite
- لإرسال SMS حقيقي، ستحتاج لإضافة خدمة SMS في ملف auth.php

## حل المشاكل الشائعة
- إذا لم تعمل الروابط: تحقق من ملف .htaccess
- إذا ظهرت أخطاء قاعدة البيانات: تحقق من إعدادات config.php
- إذا لم تظهر الصور: تحقق من المسارات في الملفات

## الدعم
إذا واجهت أي مشاكل، تحقق من:
- Error logs في cPanel
- إعدادات PHP (يجب أن تكون 7.4+)
- صلاحيات الملفات (644 للملفات، 755 للمجلدات)`;

fs.writeFileSync(path.join(distDir, 'INSTALL.md'), installGuide);

console.log('\n🎉 تم تحويل التطبيق بنجاح!');
console.log('📁 ستجد الملفات في مجلد: dist-hosting');
console.log('📖 اقرأ ملف INSTALL.md للحصول على دليل التثبيت');
console.log('\n📋 الملفات المُنشأة:');
console.log('   ├── public/ (ملفات الواجهة الأمامية)');
console.log('   ├── api/ (ملفات PHP للواجهة الخلفية)');
console.log('   ├── .htaccess (إعدادات Apache)');
console.log('   ├── database.sql (بنية قاعدة البيانات)');
console.log('   └── INSTALL.md (دليل التثبيت)');