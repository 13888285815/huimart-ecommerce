// Vercel Serverless Function - 用户认证 API
// 支持 JWT Token 验证和 API Key 认证

const crypto = require('crypto');

// 模拟用户数据库（生产环境应使用真实数据库）
const users = new Map();
const apiKeys = new Map();
const subscriptions = new Map();

// JWT 简化实现（生产环境建议使用 jsonwebtoken 库）
function createToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');
  return `${header}.${payloadEncoded}.${signature}`;
}

function verifyToken(token, secret) {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true, payload: decoded };
  } catch (e) {
    return { valid: false, error: 'Invalid token format' };
  }
}

// 生成 API Key
function generateApiKey() {
  return `yiin_${crypto.randomBytes(32).toString('hex')}`;
}

// 安全头中间件
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// CORS 处理
function corsHeaders(res, req) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// 输入验证和清理
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  // 防止 XSS 和注入攻击
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#x3D;');
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  // 至少8位，包含大小写字母和数字
  return password.length >= 8 && 
         /[A-Z]/.test(password) && 
         /[a-z]/.test(password) && 
         /[0-9]/.test(password);
}

// 主处理函数
export default async function handler(req, res) {
  // 设置安全和 CORS 头
  securityHeaders(res);
  corsHeaders(res, req);
  
  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const JWT_SECRET = process.env.JWT_SECRET || 'yiinian-tech-secret-key-2024';
  const path = req.url.split('?')[0].replace('/api/auth', '');
  
  try {
    // ==================== 用户注册 ====================
    if (path === '/register' && req.method === 'POST') {
      const { email, password, name } = req.body || {};
      
      // 输入验证
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email and password required',
          error_zh: '邮箱和密码不能为空'
        });
      }
      
      if (!validateEmail(email)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email format',
          error_zh: '邮箱格式不正确'
        });
      }
      
      if (!validatePassword(password)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Password must be at least 8 characters with uppercase, lowercase and numbers',
          error_zh: '密码至少8位，需包含大小写字母和数字'
        });
      }
      
      // 检查用户是否存在
      if (users.has(email)) {
        return res.status(409).json({ 
          success: false, 
          error: 'User already exists',
          error_zh: '用户已存在'
        });
      }
      
      // 创建用户
      const userId = `user_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const hashedPassword = crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
      
      const user = {
        id: userId,
        email: sanitizeInput(email),
        name: sanitizeInput(name || email.split('@')[0]),
        password: hashedPassword,
        createdAt: Date.now(),
        tier: 'free', // free, basic, pro, enterprise
        credits: 100, // 免费额度
        verified: false
      };
      
      users.set(email, user);
      
      // 生成验证令牌
      const verificationToken = createToken({ 
        userId, 
        email, 
        type: 'verification',
        exp: Math.floor(Date.now() / 1000) + 86400 // 24小时有效
      }, JWT_SECRET);
      
      // 生成认证令牌
      const accessToken = createToken({ 
        userId, 
        email, 
        tier: user.tier,
        exp: Math.floor(Date.now() / 1000) + 604800 // 7天有效
      }, JWT_SECRET);
      
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        message_zh: '注册成功',
        user: {
          id: userId,
          email: user.email,
          name: user.name,
          tier: user.tier,
          credits: user.credits
        },
        accessToken,
        verificationToken
      });
    }
    
    // ==================== 用户登录 ====================
    if (path === '/login' && req.method === 'POST') {
      const { email, password } = req.body || {};
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email and password required' 
        });
      }
      
      const user = users.get(email);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials',
          error_zh: '邮箱或密码错误'
        });
      }
      
      const hashedPassword = crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
      if (user.password !== hashedPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials',
          error_zh: '邮箱或密码错误'
        });
      }
      
      const accessToken = createToken({ 
        userId: user.id, 
        email: user.email,
        tier: user.tier,
        exp: Math.floor(Date.now() / 1000) + 604800
      }, JWT_SECRET);
      
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          credits: user.credits
        },
        accessToken
      });
    }
    
    // ==================== 生成 API Key ====================
    if (path === '/api-key' && req.method === 'POST') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authorization required' 
        });
      }
      
      const token = authHeader.substring(7);
      const verification = verifyToken(token, JWT_SECRET);
      
      if (!verification.valid) {
        return res.status(401).json({ 
          success: false, 
          error: verification.error 
        });
      }
      
      const apiKey = generateApiKey();
      const keyData = {
        key: apiKey,
        userId: verification.payload.userId,
        email: verification.payload.email,
        createdAt: Date.now(),
        lastUsed: null,
        usageCount: 0,
        enabled: true
      };
      
      apiKeys.set(apiKey, keyData);
      
      return res.status(201).json({
        success: true,
        apiKey,
        message: 'API Key generated successfully',
        message_zh: 'API Key 生成成功'
      });
    }
    
    // ==================== 验证 API Key ====================
    if (path === '/verify' && req.method === 'POST') {
      const apiKey = req.headers['x-api-key'] || req.body?.apiKey;
      
      if (!apiKey) {
        return res.status(400).json({ 
          success: false, 
          error: 'API Key required' 
        });
      }
      
      const keyData = apiKeys.get(apiKey);
      
      if (!keyData) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid API Key',
          error_zh: 'API Key 无效'
        });
      }
      
      if (!keyData.enabled) {
        return res.status(403).json({ 
          success: false, 
          error: 'API Key disabled',
          error_zh: 'API Key 已禁用'
        });
      }
      
      // 更新使用统计
      keyData.lastUsed = Date.now();
      keyData.usageCount++;
      
      const user = users.get(keyData.email);
      
      return res.status(200).json({
        success: true,
        valid: true,
        userId: keyData.userId,
        tier: user?.tier || 'free',
        credits: user?.credits || 0,
        usageCount: keyData.usageCount
      });
    }
    
    // ==================== 订阅计划 ====================
    if (path === '/subscribe' && req.method === 'POST') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authorization required' 
        });
      }
      
      const token = authHeader.substring(7);
      const verification = verifyToken(token, JWT_SECRET);
      
      if (!verification.valid) {
        return res.status(401).json({ 
          success: false, 
          error: verification.error 
        });
      }
      
      const { plan } = req.body || {};
      const validPlans = ['free', 'basic', 'pro', 'enterprise'];
      
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid plan required (free/basic/pro/enterprise)' 
        });
      }
      
      const planCredits = {
        free: 100,
        basic: 1000,
        pro: 10000,
        enterprise: 100000
      };
      
      const user = users.get(verification.payload.email);
      if (user) {
        user.tier = plan;
        user.credits = planCredits[plan];
        users.set(verification.payload.email, user);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Subscription updated',
        message_zh: '订阅已更新',
        plan,
        credits: planCredits[plan]
      });
    }
    
    // ==================== 计费使用 ====================
    if (path === '/usage' && req.method === 'POST') {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({ 
          success: false, 
          error: 'API Key required' 
        });
      }
      
      const keyData = apiKeys.get(apiKey);
      if (!keyData || !keyData.enabled) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid API Key' 
        });
      }
      
      const { tokens = 0, model = 'default' } = req.body || {};
      const user = users.get(keyData.email);
      
      if (!user || user.credits < tokens) {
        return res.status(402).json({ 
          success: false, 
          error: 'Insufficient credits',
          error_zh: '额度不足',
          required: tokens,
          available: user?.credits || 0
        });
      }
      
      // 扣除额度
      user.credits -= tokens;
      users.set(keyData.email, user);
      
      keyData.usageCount += tokens;
      keyData.lastUsed = Date.now();
      
      return res.status(200).json({
        success: true,
        tokensUsed: tokens,
        remainingCredits: user.credits,
        model
      });
    }
    
    // ==================== 获取用户信息 ====================
    if (path === '/me' && req.method === 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authorization required' 
        });
      }
      
      const token = authHeader.substring(7);
      const verification = verifyToken(token, JWT_SECRET);
      
      if (!verification.valid) {
        return res.status(401).json({ 
          success: false, 
          error: verification.error 
        });
      }
      
      const user = users.get(verification.payload.email);
      const userApiKeys = Array.from(apiKeys.values())
        .filter(k => k.userId === user?.id)
        .map(k => ({
          key: k.key.substring(0, 12) + '...',
          createdAt: k.createdAt,
          lastUsed: k.lastUsed,
          usageCount: k.usageCount,
          enabled: k.enabled
        }));
      
      return res.status(200).json({
        success: true,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          credits: user.credits,
          verified: user.verified,
          createdAt: user.createdAt
        } : null,
        apiKeys: userApiKeys
      });
    }
    
    // 未找到路由
    return res.status(404).json({ 
      success: false, 
      error: 'Endpoint not found',
      availableEndpoints: ['/register', '/login', '/api-key', '/verify', '/subscribe', '/usage', '/me']
    });
    
  } catch (error) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      error_zh: '服务器内部错误'
    });
  }
}
