const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const {
  securityMiddleware,
  rateLimitMiddleware,
  corsOptions,
  sanitizeInput,
  validateDemoToken,
  securityLogger,
} = require('./security');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const config = {
  maxSessions: parseInt(process.env.DEMO_MAX_SESSIONS) || 10,
  sessionTimeout: parseInt(process.env.DEMO_SESSION_TIMEOUT) || 1800, // 30 minutes
  cleanupInterval: parseInt(process.env.DEMO_CLEANUP_INTERVAL) || 300, // 5 minutes
  portRangeStart: parseInt(process.env.DEMO_PORT_RANGE_START) || 8100,
  portRangeEnd: parseInt(process.env.DEMO_PORT_RANGE_END) || 8199,
  scriptsPath: process.env.SCRIPTS_PATH || './scripts'
};

// In-memory session storage (in production, use Redis or database)
const sessions = new Map();

// Apply security middleware
app.use(securityMiddleware());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeInput);

// Apply rate limiting to all routes
app.use(rateLimitMiddleware('api'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Utility functions
const execAsync = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

const findAvailablePort = async () => {
  for (let port = config.portRangeStart; port <= config.portRangeEnd; port++) {
    try {
      await execAsync(`netstat -tuln | grep -q ":${port} "`);
    } catch {
      // Port is available if netstat command fails
      return port;
    }
  }
  throw new Error('No available ports');
};

const generateSessionId = () => {
  return `demo-${Date.now()}-${uuidv4().substring(0, 8)}`;
};

// Session management
const createSession = async (userAgent, ipAddress) => {
  // Check session limit
  const activeSessions = Array.from(sessions.values()).filter(s => s.status === 'running');
  if (activeSessions.length >= config.maxSessions) {
    throw new Error('Maximum number of demo sessions reached');
  }

  const sessionId = generateSessionId();
  const port = await findAvailablePort();
  const expiresAt = new Date(Date.now() + config.sessionTimeout * 1000);

  const session = {
    id: sessionId,
    port,
    status: 'starting',
    createdAt: new Date(),
    expiresAt,
    userAgent,
    ipAddress,
    containerId: null,
    accessUrl: `http://localhost:${port}`
  };

  sessions.set(sessionId, session);

  // Start container asynchronously
  startContainer(sessionId).catch(error => {
    console.error(`Failed to start container for session ${sessionId}:`, error);
    session.status = 'error';
    session.error = error.message;
  });

  return session;
};

const startContainer = async (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  try {
    console.log(`Starting container for session ${sessionId}...`);
    
    // Set environment variables for the start script
    const env = {
      ...process.env,
      DEMO_SESSION_ID: sessionId,
      DEMO_PORT: session.port.toString(),
      DEMO_EXPIRES_AT: session.expiresAt.toISOString()
    };

    const envString = Object.entries(env)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    // Execute start script
    const output = await execAsync(`${envString} ${config.scriptsPath}/start-demo.sh start`);
    
    // Parse output to get container ID
    const lines = output.split('\n');
    const containerInfo = lines.find(line => line.includes(':'));
    if (containerInfo) {
      const [containerId, port] = containerInfo.split(':');
      session.containerId = containerId;
      session.status = 'running';
      console.log(`Container started for session ${sessionId}: ${containerId}`);
    } else {
      throw new Error('Failed to parse container startup output');
    }

    // Schedule cleanup
    setTimeout(() => {
      cleanupSession(sessionId);
    }, config.sessionTimeout * 1000);

  } catch (error) {
    console.error(`Error starting container for session ${sessionId}:`, error);
    session.status = 'error';
    session.error = error.message;
    throw error;
  }
};

const cleanupSession = async (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  try {
    console.log(`Cleaning up session ${sessionId}...`);
    
    if (session.containerId) {
      await execAsync(`${config.scriptsPath}/start-demo.sh cleanup ${session.containerId}`);
    }
    
    sessions.delete(sessionId);
    console.log(`Session ${sessionId} cleaned up successfully`);
  } catch (error) {
    console.error(`Error cleaning up session ${sessionId}:`, error);
  }
};

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    maxSessions: config.maxSessions
  });
});

// Get system status
app.get('/api/status', (req, res) => {
  const activeSessions = Array.from(sessions.values()).filter(s => s.status === 'running');
  const startingSessions = Array.from(sessions.values()).filter(s => s.status === 'starting');
  const errorSessions = Array.from(sessions.values()).filter(s => s.status === 'error');

  res.json({
    system: {
      maxSessions: config.maxSessions,
      sessionTimeout: config.sessionTimeout,
      portRange: `${config.portRangeStart}-${config.portRangeEnd}`
    },
    sessions: {
      total: sessions.size,
      active: activeSessions.length,
      starting: startingSessions.length,
      error: errorSessions.length,
      available: config.maxSessions - activeSessions.length - startingSessions.length
    }
  });
});

// Create new demo session with stricter rate limiting
app.post('/api/demo/start', rateLimitMiddleware('demoCreate'), async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Log security event
    securityLogger('demo_session_start', {
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    const session = await createSession(userAgent, ipAddress);

    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        accessUrl: session.accessUrl,
        expiresAt: session.expiresAt,
        credentials: {
          email: 'demo@solobase.dev',
          password: 'demo123!'
        }
      }
    });
  } catch (error) {
    console.error('Error creating demo session:', error);
    
    // Log security event
    securityLogger('demo_session_error', {
      error: error.message,
      ipAddress: req.ip,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session status
app.get('/api/demo/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json({
    success: true,
    session: {
      id: session.id,
      status: session.status,
      accessUrl: session.accessUrl,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      error: session.error
    }
  });
});

// Stop demo session
app.delete('/api/demo/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  try {
    await cleanupSession(sessionId);
    res.json({
      success: true,
      message: 'Session stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List all sessions (admin endpoint with token validation)
app.get('/api/admin/sessions', validateDemoToken, (req, res) => {
  const sessionList = Array.from(sessions.values()).map(session => ({
    id: session.id,
    status: session.status,
    port: session.port,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent
  }));

  res.json({
    success: true,
    sessions: sessionList
  });
});

// Cleanup all sessions (admin endpoint with token validation)
app.post('/api/admin/cleanup', validateDemoToken, async (req, res) => {
  try {
    const sessionIds = Array.from(sessions.keys());
    const cleanupPromises = sessionIds.map(id => cleanupSession(id));
    await Promise.all(cleanupPromises);

    res.json({
      success: true,
      message: `Cleaned up ${sessionIds.length} sessions`
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Cleanup expired sessions periodically
setInterval(() => {
  const now = new Date();
  const expiredSessions = Array.from(sessions.entries())
    .filter(([_, session]) => session.expiresAt < now)
    .map(([id, _]) => id);

  expiredSessions.forEach(sessionId => {
    console.log(`Cleaning up expired session: ${sessionId}`);
    cleanupSession(sessionId);
  });
}, config.cleanupInterval * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, cleaning up...');
  
  const sessionIds = Array.from(sessions.keys());
  const cleanupPromises = sessionIds.map(id => cleanupSession(id));
  await Promise.all(cleanupPromises);
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, cleaning up...');
  
  const sessionIds = Array.from(sessions.keys());
  const cleanupPromises = sessionIds.map(id => cleanupSession(id));
  await Promise.all(cleanupPromises);
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Demo manager server running on port ${PORT}`);
  console.log(`Max sessions: ${config.maxSessions}`);
  console.log(`Session timeout: ${config.sessionTimeout}s`);
  console.log(`Port range: ${config.portRangeStart}-${config.portRangeEnd}`);
});