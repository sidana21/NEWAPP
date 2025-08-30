import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'bizchat-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Mock data storage
class MemStorage {
  private users = new Map();
  private chats = new Map();
  private messages = new Map();
  private stories = new Map();
  private otpCodes = new Map();

  constructor() {
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Demo user
    const demoUser = {
      id: 'demo-user-1',
      name: 'أحمد محمد',
      phoneNumber: '+213555123456',
      location: 'تندوف',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
      isVerified: true,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    this.users.set(demoUser.id, demoUser);

    // Demo chat
    const demoChat = {
      id: 'demo-chat-1',
      name: 'محادثة تجريبية',
      isGroup: false,
      participants: [demoUser.id],
      createdBy: demoUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.chats.set(demoChat.id, demoChat);

    // Demo messages
    const demoMessages = [
      {
        id: 'msg-1',
        chatId: demoChat.id,
        senderId: demoUser.id,
        content: 'مرحباً! هذه رسالة تجريبية',
        messageType: 'text',
        timestamp: new Date().toISOString(),
        isRead: false,
        isDelivered: true
      }
    ];
    this.messages.set(demoChat.id, demoMessages);
  }

  // User methods
  getUserByPhone(phoneNumber: string) {
    return Array.from(this.users.values()).find(user => user.phoneNumber === phoneNumber);
  }

  createUser(userData: any) {
    const user = {
      id: `user-${Date.now()}`,
      ...userData,
      createdAt: new Date().toISOString(),
      isVerified: true,
      isOnline: true
    };
    this.users.set(user.id, user);
    return user;
  }

  // OTP methods
  saveOtp(phoneNumber: string, code: string) {
    this.otpCodes.set(phoneNumber, {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
    });
  }

  verifyOtp(phoneNumber: string, code: string) {
    const otpData = this.otpCodes.get(phoneNumber);
    if (!otpData) return false;
    
    if (Date.now() > otpData.expiresAt) {
      this.otpCodes.delete(phoneNumber);
      return false;
    }
    
    if (otpData.code === code) {
      this.otpCodes.delete(phoneNumber);
      return true;
    }
    
    return false;
  }

  // Chat methods
  getUserChats(userId: string) {
    return Array.from(this.chats.values()).filter(chat => 
      chat.participants.includes(userId)
    );
  }

  getChatMessages(chatId: string) {
    return this.messages.get(chatId) || [];
  }

  // Story methods
  getStoriesByLocation(location: string) {
    return Array.from(this.stories.values()).filter(story => 
      story.location === location && new Date(story.expiresAt) > new Date()
    );
  }
}

const storage = new MemStorage();

// API Routes

// Authentication routes
app.post('/api/auth/send-otp', (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ message: 'رقم الهاتف مطلوب' });
  }
  
  // Generate OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  storage.saveOtp(phoneNumber, otpCode);
  
  // In development, return the OTP code
  res.json({
    success: true,
    message: 'تم إرسال رمز التحقق بنجاح',
    ...(process.env.NODE_ENV === 'development' && { otp: otpCode })
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { phoneNumber, otpCode } = req.body;
  
  if (!storage.verifyOtp(phoneNumber, otpCode)) {
    return res.status(400).json({ message: 'رمز التحقق غير صحيح أو منتهي الصلاحية' });
  }
  
  const user = storage.getUserByPhone(phoneNumber);
  
  if (user) {
    req.session.userId = user.id;
    res.json({
      success: true,
      user,
      token: `session-${user.id}`
    });
  } else {
    res.json({
      success: false,
      requiresProfile: true
    });
  }
});

app.post('/api/auth/create-user', (req, res) => {
  const { phoneNumber, name, location } = req.body;
  
  if (!name || !location) {
    return res.status(400).json({ message: 'الاسم والمنطقة مطلوبان' });
  }
  
  const user = storage.createUser({
    name,
    phoneNumber,
    location
  });
  
  req.session.userId = user.id;
  
  res.json({
    success: true,
    user,
    token: `session-${user.id}`
  });
});

// User routes
app.get('/api/user/current', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'غير مصرح' });
  }
  
  const user = Array.from(storage.users.values()).find(u => u.id === req.session.userId);
  
  if (!user) {
    return res.status(404).json({ message: 'المستخدم غير موجود' });
  }
  
  res.json(user);
});

// Chat routes
app.get('/api/chats', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'غير مصرح' });
  }
  
  const chats = storage.getUserChats(req.session.userId);
  res.json(chats);
});

app.get('/api/chats/:chatId/messages', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'غير مصرح' });
  }
  
  const messages = storage.getChatMessages(req.params.chatId);
  res.json(messages);
});

// Story routes
app.get('/api/stories', (req, res) => {
  const { location } = req.query;
  
  if (!location) {
    return res.status(400).json({ message: 'المنطقة مطلوبة' });
  }
  
  const stories = storage.getStoriesByLocation(location as string);
  res.json(stories);
});

// Features route
app.get('/api/features', (req, res) => {
  const features = [
    {
      id: 'messaging',
      name: 'المراسلة',
      description: 'إرسال واستقبال الرسائل النصية والوسائط',
      isEnabled: true,
      category: 'communication',
      priority: 1
    },
    {
      id: 'stories',
      name: 'الحالات',
      description: 'مشاركة الحالات والصور المؤقتة',
      isEnabled: true,
      category: 'social',
      priority: 2
    },
    {
      id: 'stores',
      name: 'المتاجر',
      description: 'إنشاء وإدارة المتاجر الإلكترونية',
      isEnabled: true,
      category: 'commerce',
      priority: 3
    }
  ];
  
  res.json(features);
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist/public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/public/index.html'));
  });
}

// Create HTTP server
const server = createServer(app);

// WebSocket setup
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('عميل جديد متصل');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('رسالة مستلمة:', data);
      
      // Broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('خطأ في معالجة الرسالة:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('عميل منقطع');
  });
});

// Start server
server.listen(port, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${port}`);
  console.log(`📱 BizChat API جاهز للاستخدام`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('إيقاف الخادم...');
  server.close(() => {
    console.log('تم إيقاف الخادم بنجاح');
    process.exit(0);
  });
});