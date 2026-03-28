// Vercel Serverless Function - AI API 计费代理
// 支持多种 AI 模型，按 Token 计费

const crypto = require('crypto');

// 安全头
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function corsHeaders(res, req) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}

// Token 计费配置
const MODEL_PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },      // 每 1K tokens
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'default': { input: 0.001, output: 0.002 }
};

// 模拟用户数据库
const users = new Map();
const apiKeys = new Map();
const usageLogs = [];

// 验证 API Key
async function verifyApiKey(apiKey) {
  const keyData = apiKeys.get(apiKey);
  if (!keyData || !keyData.enabled) {
    return { valid: false };
  }
  
  const user = users.get(keyData.email);
  return {
    valid: true,
    userId: keyData.userId,
    email: keyData.email,
    tier: user?.tier || 'free',
    credits: user?.credits || 0
  };
}

// 计算 Token 费用
function calculateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return Math.ceil((inputCost + outputCost) * 1000); // 转换为积分
}

// 估算 Token 数量（简化版）
function estimateTokens(text) {
  // 粗略估算：英文约 4 字符 = 1 token，中文约 1.5 字符 = 1 token
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

export default async function handler(req, res) {
  securityHeaders(res);
  corsHeaders(res, req);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const path = req.url.split('?')[0].replace('/api/ai', '');
  
  try {
    // ==================== AI 聊天补全 ====================
    if (path === '/chat' && req.method === 'POST') {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API Key required',
          error_zh: '需要 API Key'
        });
      }
      
      const verification = await verifyApiKey(apiKey);
      if (!verification.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API Key',
          error_zh: 'API Key 无效'
        });
      }
      
      const { messages, model = 'gpt-3.5-turbo', stream = false } = req.body || {};
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Messages array required',
          error_zh: '需要消息数组'
        });
      }
      
      // 估算输入 token
      const inputText = messages.map(m => m.content).join(' ');
      const inputTokens = estimateTokens(inputText);
      
      // 模拟 AI 响应（实际生产环境应调用真实 API）
      const mockResponses = {
        'zh': '我是意念科技 AI 助手，很高兴为您服务！有什么可以帮助您的吗？',
        'en': 'I am Yiinian Tech AI Assistant, happy to help! What can I do for you?',
        'default': 'I am an AI assistant. How can I help you today?'
      };
      
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      const responseContent = mockResponses.zh;
      const outputTokens = estimateTokens(responseContent);
      
      // 计算费用
      const cost = calculateCost(model, inputTokens, outputTokens);
      
      // 检查余额
      const user = users.get(verification.email);
      if (user && user.credits < cost) {
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits',
          error_zh: '额度不足',
          required: cost,
          available: user.credits
        });
      }
      
      // 扣费
      if (user) {
        user.credits -= cost;
        users.set(verification.email, user);
      }
      
      // 记录使用日志
      usageLogs.push({
        timestamp: Date.now(),
        userId: verification.userId,
        model,
        inputTokens,
        outputTokens,
        cost,
        apiKey: apiKey.substring(0, 12) + '...'
      });
      
      // 构建响应
      const response = {
        id: `chatcmpl_${crypto.randomBytes(16).toString('hex')}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        },
        billing: {
          credits_used: cost,
          credits_remaining: user?.credits || 0
        }
      };
      
      return res.status(200).json(response);
    }
    
    // ==================== 文本嵌入 ====================
    if (path === '/embeddings' && req.method === 'POST') {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API Key required'
        });
      }
      
      const verification = await verifyApiKey(apiKey);
      if (!verification.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API Key'
        });
      }
      
      const { input, model = 'text-embedding-ada-002' } = req.body || {};
      
      if (!input) {
        return res.status(400).json({
          success: false,
          error: 'Input text required'
        });
      }
      
      const tokens = estimateTokens(Array.isArray(input) ? input.join(' ') : input);
      const cost = Math.ceil(tokens * 0.0001 * 1000); // 嵌入模型更便宜
      
      const response = {
        object: 'list',
        data: [{
          object: 'embedding',
          index: 0,
          embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1), // 模拟嵌入向量
          embedding_type: 'float'
        }],
        model,
        usage: {
          prompt_tokens: tokens,
          total_tokens: tokens
        },
        billing: {
          credits_used: cost,
          credits_remaining: verification.credits - cost
        }
      };
      
      return res.status(200).json(response);
    }
    
    // ==================== 模型列表 ====================
    if (path === '/models' && req.method === 'GET') {
      return res.status(200).json({
        object: 'list',
        data: Object.keys(MODEL_PRICING).filter(m => m !== 'default').map(model => ({
          id: model,
          object: 'model',
          created: 1700000000,
          owned_by: model.startsWith('gpt') ? 'openai' : 'anthropic',
          pricing: MODEL_PRICING[model]
        }))
      });
    }
    
    // ==================== 使用统计 ====================
    if (path === '/usage' && req.method === 'GET') {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API Key required'
        });
      }
      
      const verification = await verifyApiKey(apiKey);
      if (!verification.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API Key'
        });
      }
      
      const userLogs = usageLogs.filter(log => log.userId === verification.userId);
      
      const totalTokens = userLogs.reduce((sum, log) => sum + log.inputTokens + log.outputTokens, 0);
      const totalCost = userLogs.reduce((sum, log) => sum + log.cost, 0);
      
      return res.status(200).json({
        success: true,
        usage: {
          total_requests: userLogs.length,
          total_tokens: totalTokens,
          total_credits_used: totalCost,
          credits_remaining: verification.credits
        },
        recent_requests: userLogs.slice(-10).reverse()
      });
    }
    
    // 未找到路由
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      availableEndpoints: ['/chat', '/embeddings', '/models', '/usage']
    });
    
  } catch (error) {
    console.error('AI API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
