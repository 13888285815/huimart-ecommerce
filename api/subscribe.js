// Vercel Serverless Function - 订阅支付系统
// 类似 Crunchbase 的订阅机制

const crypto = require('crypto');

// 安全头
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

function corsHeaders(res, req) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 订阅计划配置
const PLANS = {
  free: {
    id: 'free',
    name: { zh: '免费版', en: 'Free' },
    price: 0,
    credits: 100,
    features: {
      apiCalls: 100,
      aiTokens: 10000,
      storage: '100MB',
      support: 'community'
    }
  },
  basic: {
    id: 'basic',
    name: { zh: '基础版', en: 'Basic' },
    price: 9.99,
    priceCny: 69,
    credits: 1000,
    features: {
      apiCalls: 1000,
      aiTokens: 100000,
      storage: '1GB',
      support: 'email'
    }
  },
  pro: {
    id: 'pro',
    name: { zh: '专业版', en: 'Pro' },
    price: 49.99,
    priceCny: 349,
    credits: 10000,
    features: {
      apiCalls: 10000,
      aiTokens: 1000000,
      storage: '10GB',
      support: 'priority'
    }
  },
  enterprise: {
    id: 'enterprise',
    name: { zh: '企业版', en: 'Enterprise' },
    price: 199.99,
    priceCny: 1399,
    credits: 100000,
    features: {
      apiCalls: -1, // 无限
      aiTokens: -1,
      storage: '100GB',
      support: 'dedicated'
    }
  }
};

// 模拟数据库
const users = new Map();
const subscriptions = new Map();
const invoices = new Map();

export default async function handler(req, res) {
  securityHeaders(res);
  corsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const path = req.url.split('?')[0].replace('/api/subscribe', '');
  
  try {
    // ==================== 获取订阅计划列表 ====================
    if (path === '/plans' && req.method === 'GET') {
      const lang = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'zh';
      
      return res.status(200).json({
        success: true,
        plans: Object.values(PLANS).map(plan => ({
          id: plan.id,
          name: plan.name[lang] || plan.name.en,
          price: plan.price,
          priceCny: plan.priceCny,
          credits: plan.credits,
          features: plan.features,
          popular: plan.id === 'pro'
        }))
      });
    }
    
    // ==================== 创建订阅 ====================
    if (path === '/create' && req.method === 'POST') {
      const { userId, planId, paymentMethod } = req.body || {};
      
      if (!userId || !planId) {
        return res.status(400).json({
          success: false,
          error: 'userId and planId required'
        });
      }
      
      const plan = PLANS[planId];
      if (!plan) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan'
        });
      }
      
      // 创建订阅
      const subscriptionId = `sub_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      const subscription = {
        id: subscriptionId,
        userId,
        planId,
        status: plan.price === 0 ? 'active' : 'pending_payment',
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天
        cancelAtPeriodEnd: false,
        createdAt: Date.now()
      };
      
      subscriptions.set(subscriptionId, subscription);
      
      // 创建发票
      const invoice = {
        id: invoiceId,
        subscriptionId,
        userId,
        amount: plan.price,
        amountCny: plan.priceCny,
        currency: 'USD',
        status: plan.price === 0 ? 'paid' : 'pending',
        createdAt: Date.now(),
        dueAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天
      };
      
      invoices.set(invoiceId, invoice);
      
      // 更新用户
      const user = users.get(userId) || { id: userId, tier: 'free', credits: 0 };
      user.tier = planId;
      user.credits += plan.credits;
      users.set(userId, user);
      
      return res.status(201).json({
        success: true,
        subscription,
        invoice,
        paymentUrl: plan.price > 0 ? `/pay/${invoiceId}` : null
      });
    }
    
    // ==================== 获取订阅状态 ====================
    if (path === '/status' && req.method === 'GET') {
      const userId = req.query?.userId || req.headers['x-user-id'];
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId required'
        });
      }
      
      const userSubscriptions = Array.from(subscriptions.values())
        .filter(s => s.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      
      const activeSubscription = userSubscriptions.find(s => s.status === 'active');
      
      return res.status(200).json({
        success: true,
        activeSubscription,
        allSubscriptions: userSubscriptions,
        plan: activeSubscription ? PLANS[activeSubscription.planId] : PLANS.free
      });
    }
    
    // ==================== 取消订阅 ====================
    if (path === '/cancel' && req.method === 'POST') {
      const { subscriptionId, immediately = false } = req.body || {};
      
      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          error: 'subscriptionId required'
        });
      }
      
      const subscription = subscriptions.get(subscriptionId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }
      
      if (immediately) {
        subscription.status = 'canceled';
      } else {
        subscription.cancelAtPeriodEnd = true;
      }
      
      subscriptions.set(subscriptionId, subscription);
      
      return res.status(200).json({
        success: true,
        subscription,
        message: immediately ? 'Subscription canceled' : 'Subscription will cancel at period end'
      });
    }
    
    // ==================== Webhook 支付回调 ====================
    if (path === '/webhook' && req.method === 'POST') {
      const { invoiceId, transactionId, status } = req.body || {};
      
      // 验证签名（生产环境必须）
      // const signature = req.headers['x-webhook-signature'];
      
      const invoice = invoices.get(invoiceId);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      invoice.status = status === 'success' ? 'paid' : 'failed';
      invoice.transactionId = transactionId;
      invoice.paidAt = Date.now();
      invoices.set(invoiceId, invoice);
      
      if (status === 'success') {
        const subscription = subscriptions.get(invoice.subscriptionId);
        if (subscription) {
          subscription.status = 'active';
          subscriptions.set(invoice.subscriptionId, subscription);
        }
      }
      
      return res.status(200).json({
        success: true,
        invoice
      });
    }
    
    // 未找到路由
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      availableEndpoints: ['/plans', '/create', '/status', '/cancel', '/webhook']
    });
    
  } catch (error) {
    console.error('Subscribe API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
