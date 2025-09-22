import express from 'express';
import { createModelEndpoint } from '../lib/modelEndpoint/factory';

const router = express.Router();

// GET /api/health - Basic health check
router.get('/', async (req, res) => {
  try {
    const mode = process.env.MODEL_ENDPOINT_MODE ?? 'openai';
    
    // Basic server health
    const healthInfo = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      mode: mode,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(healthInfo);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/health/model - Model endpoint health check
router.get('/model', async (req, res) => {
  try {
    const mode = process.env.MODEL_ENDPOINT_MODE ?? 'openai';
    const endpoint = createModelEndpoint();
    
    const healthResult = await endpoint.health();
    
    res.json({
      mode: mode,
      timestamp: new Date().toISOString(),
      endpoint_health: healthResult
    });
  } catch (error) {
    console.error('Model health check error:', error);
    res.status(500).json({
      mode: process.env.MODEL_ENDPOINT_MODE ?? 'openai',
      timestamp: new Date().toISOString(),
      endpoint_health: {
        ok: false,
        info: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;