const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter configurations
const rateLimiters = {
  // General API rate limiter
  api: new RateLimiterMemory({
    keyPrefix: 'api',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 1 minute
  }),
  
  // Demo creation rate limiter (stricter)
  demoCreate: new RateLimiterMemory({
    keyPrefix: 'demo_create',
    points: 5, // 5 demo sessions
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour
  }),
  
  // Authentication rate limiter
  auth: new RateLimiterMemory({
    keyPrefix: 'auth',
    points: 5, // 5 attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
  }),
};

// Security middleware
const securityMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://demo.solobase.dev", "wss://demo.solobase.dev"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for demo iframe if needed
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
};

// Rate limiting middleware
const rateLimitMiddleware = (limiterType = 'api') => {
  return async (req, res, next) => {
    const limiter = rateLimiters[limiterType];
    const key = req.ip || req.connection.remoteAddress;
    
    try {
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 60,
      });
    }
  };
};

// IP-based access control
const ipAccessControl = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next();
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    const normalizedIP = clientIP.replace(/^::ffff:/, ''); // Remove IPv6 prefix
    
    if (allowedIPs.includes(normalizedIP)) {
      next();
    } else {
      res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource',
      });
    }
  };
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://solobase.dev',
      'https://www.solobase.dev',
      'https://demo.solobase.dev',
      'http://localhost:3000',
      'http://localhost:8080',
    ];
    
    if (process.env.NODE_ENV !== 'production') {
      // Allow all origins in development
      callback(null, true);
    } else if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove script tags and dangerous HTML
        req.query[key] = req.query[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .trim();
      }
    });
  }
  
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };
    sanitizeObject(req.body);
  }
  
  next();
};

// Security headers for demo containers
const demoSecurityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN', // Allow iframe from same origin
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Demo-Instance': 'true',
  'X-Demo-Timeout': '3600', // 1 hour
};

// Validate demo session token
const validateDemoToken = (req, res, next) => {
  const token = req.headers['x-demo-token'] || req.query.token;
  
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Demo token is required',
    });
  }
  
  // Validate token format (UUID v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Demo token format is invalid',
    });
  }
  
  req.demoToken = token;
  next();
};

// Security event logger
const securityLogger = (eventType, details) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type: eventType,
    ...details,
  };
  
  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (e.g., CloudWatch, Datadog, etc.)
    console.log('[SECURITY]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY]', logEntry);
  }
};

module.exports = {
  securityMiddleware,
  rateLimitMiddleware,
  ipAccessControl,
  corsOptions,
  sanitizeInput,
  demoSecurityHeaders,
  validateDemoToken,
  securityLogger,
  rateLimiters,
};