// Vercel Serverless Function - 商城 API
// 支持商品管理、订单处理、多语言响应

const crypto = require('crypto');

// 安全头中间件
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// CORS 处理
function corsHeaders(res, req) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
}

// 多语言响应
const messages = {
  zh: {
    productNotFound: '商品不存在',
    orderCreated: '订单创建成功',
    insufficientStock: '库存不足',
    paymentRequired: '请先登录'
  },
  en: {
    productNotFound: 'Product not found',
    orderCreated: 'Order created successfully',
    insufficientStock: 'Insufficient stock',
    paymentRequired: 'Please login first'
  },
  fr: {
    productNotFound: 'Produit non trouvé',
    orderCreated: 'Commande créée avec succès',
    insufficientStock: 'Stock insuffisant',
    paymentRequired: 'Veuillez vous connecter'
  },
  de: {
    productNotFound: 'Produkt nicht gefunden',
    orderCreated: 'Bestellung erfolgreich erstellt',
    insufficientStock: 'Nicht genug Lagerbestand',
    paymentRequired: 'Bitte zuerst anmelden'
  },
  ja: {
    productNotFound: '商品が見つかりません',
    orderCreated: '注文が作成されました',
    insufficientStock: '在庫不足',
    paymentRequired: '先にログインしてください'
  },
  ar: {
    productNotFound: 'المنتج غير موجود',
    orderCreated: 'تم إنشاء الطلب بنجاح',
    insufficientStock: 'مخزون غير كافٍ',
    paymentRequired: 'يرجى تسجيل الدخول أولاً'
  }
};

function getMessage(lang, key) {
  return messages[lang]?.[key] || messages.zh[key];
}

// 模拟数据库
const products = new Map([
  ['prod_001', {
    id: 'prod_001',
    name: { zh: '无线蓝牙耳机', en: 'Wireless Earbuds', fr: 'Écouteurs sans fil', de: 'Kabellose Kopfhörer', ja: 'ワイヤレスイヤホン', ar: 'سماعات لاسلكية' },
    price: 89,
    originalPrice: 299,
    stock: 500,
    sales: 12580,
    category: 'electronics',
    badge: { zh: '热卖', en: 'Hot' }
  }],
  ['prod_002', {
    id: 'prod_002',
    name: { zh: '男士运动鞋', en: 'Men\'s Running Shoes', fr: 'Chaussures de course', de: 'Herren-Laufschuhe', ja: 'メンズランニングシューズ', ar: 'أحذية رجالية للجري' },
    price: 129,
    originalPrice: 399,
    stock: 300,
    sales: 8234,
    category: 'fashion',
    badge: { zh: '新品', en: 'New' }
  }],
  ['prod_003', {
    id: 'prod_003',
    name: { zh: '智能手表', en: 'Smart Watch', fr: 'Montre intelligente', de: 'Smartwatch', ja: 'スマートウォッチ', ar: 'ساعة ذكية' },
    price: 199,
    originalPrice: 599,
    stock: 200,
    sales: 6521,
    category: 'electronics',
    badge: { zh: '秒杀', en: 'Flash Sale' }
  }]
]);

const orders = new Map();
const carts = new Map();

export default async function handler(req, res) {
  securityHeaders(res);
  corsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const lang = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'zh';
  const path = req.url.split('?')[0].replace('/api/shop', '');
  
  try {
    // ==================== 获取商品列表 ====================
    if (path === '/products' && req.method === 'GET') {
      const { category, page = 1, limit = 20 } = req.query || {};
      
      let productList = Array.from(products.values());
      
      if (category) {
        productList = productList.filter(p => p.category === category);
      }
      
      const start = (page - 1) * limit;
      const paginatedList = productList.slice(start, start + parseInt(limit));
      
      return res.status(200).json({
        success: true,
        products: paginatedList.map(p => ({
          ...p,
          name: p.name[lang] || p.name.zh,
          badge: p.badge?.[lang] || p.badge?.zh
        })),
        total: productList.length,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }
    
    // ==================== 获取单个商品 ====================
    if (path.match(/^\/products\/prod_\d+$/) && req.method === 'GET') {
      const productId = path.split('/')[2];
      const product = products.get(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: getMessage(lang, 'productNotFound')
        });
      }
      
      return res.status(200).json({
        success: true,
        product: {
          ...product,
          name: product.name[lang] || product.name.zh,
          badge: product.badge?.[lang] || product.badge?.zh
        }
      });
    }
    
    // ==================== 购物车操作 ====================
    if (path === '/cart' && req.method === 'GET') {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: getMessage(lang, 'paymentRequired')
        });
      }
      
      const cart = carts.get(userId) || { items: [], total: 0 };
      
      return res.status(200).json({
        success: true,
        cart
      });
    }
    
    if (path === '/cart' && req.method === 'POST') {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: getMessage(lang, 'paymentRequired')
        });
      }
      
      const { productId, quantity = 1 } = req.body || {};
      const product = products.get(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: getMessage(lang, 'productNotFound')
        });
      }
      
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          error: getMessage(lang, 'insufficientStock')
        });
      }
      
      let cart = carts.get(userId) || { items: [], total: 0 };
      
      const existingItem = cart.items.find(i => i.productId === productId);
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.subtotal = existingItem.quantity * product.price;
      } else {
        cart.items.push({
          productId,
          name: product.name[lang] || product.name.zh,
          price: product.price,
          quantity,
          subtotal: quantity * product.price
        });
      }
      
      cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
      carts.set(userId, cart);
      
      return res.status(200).json({
        success: true,
        cart
      });
    }
    
    // ==================== 创建订单 ====================
    if (path === '/orders' && req.method === 'POST') {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: getMessage(lang, 'paymentRequired')
        });
      }
      
      const cart = carts.get(userId);
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cart is empty'
        });
      }
      
      const orderId = `order_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const order = {
        id: orderId,
        userId,
        items: cart.items,
        total: cart.total,
        status: 'pending',
        createdAt: Date.now()
      };
      
      orders.set(orderId, order);
      carts.delete(userId);
      
      return res.status(201).json({
        success: true,
        message: getMessage(lang, 'orderCreated'),
        order
      });
    }
    
    // ==================== 获取订单列表 ====================
    if (path === '/orders' && req.method === 'GET') {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: getMessage(lang, 'paymentRequired')
        });
      }
      
      const userOrders = Array.from(orders.values())
        .filter(o => o.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      
      return res.status(200).json({
        success: true,
        orders: userOrders
      });
    }
    
    // 未找到路由
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      availableEndpoints: ['/products', '/products/:id', '/cart', '/orders']
    });
    
  } catch (error) {
    console.error('Shop API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
