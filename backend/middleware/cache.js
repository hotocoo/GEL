const NodeCache = require('node-cache');

// In-memory cache with TTL
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  maxKeys: 1000, // Maximum number of keys
  deleteOnExpire: true,
  useClones: false // Better performance for large objects
});

// Cache key generators
const generateCacheKey = (req) => {
  const { method, originalUrl, query, user } = req;
  const userId = user ? user.id : 'anonymous';

  // Include query parameters in cache key for GET requests
  const queryString = method === 'GET' && Object.keys(query).length > 0
    ? JSON.stringify(query)
    : '';

  return `${method}:${originalUrl}:${userId}:${queryString}`;
};

// Cache middleware for GET requests
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req);

    // Check if data exists in cache (node-cache v5+ uses synchronous API)
    const cachedData = cache.get(cacheKey);

    if (cachedData !== undefined) {
      // Add cache hit header
      res.set('X-Cache-Status', 'HIT');
      const ttlRemaining = cache.getTtl(cacheKey);
      if (ttlRemaining) {
        res.set('X-Cache-TTL', String(Math.floor((ttlRemaining - Date.now()) / 1000)));
      }

      // Return cached data
      return res.json(cachedData);
    }

    // Cache miss - store original json method
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttl);
      }

      // Add cache miss header
      res.set('X-Cache-Status', 'MISS');

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

// Selective cache middleware for specific endpoints
const selectiveCache = (endpoints, ttl = 300) => {
  return (req, res, next) => {
    const isTargetEndpoint = endpoints.some(endpoint =>
      req.path.includes(endpoint) && req.method === 'GET'
    );

    if (isTargetEndpoint) {
      return cacheMiddleware(ttl)(req, res, next);
    }

    next();
  };
};

// Cache invalidation helpers
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));

  matchingKeys.forEach(key => {
    cache.del(key);
  });

  return matchingKeys.length;
};

const invalidateUserCache = (userId) => {
  return invalidateCache(userId);
};

const invalidateCourseCache = (courseId) => {
  return invalidateCache(`courses:${courseId}`);
};

const invalidateLessonCache = (lessonId) => {
  return invalidateCache(`lessons:${lessonId}`);
};

const clearAllCache = () => {
  return cache.flushAll();
};

// Cache statistics
const getCacheStats = () => {
  return cache.getStats();
};

// Pre-populate cache for frequently accessed data
const warmCache = async (dataFetchers) => {
  const promises = dataFetchers.map(async (fetcher) => {
    try {
      const data = await fetcher();
      return data;
    } catch (error) {
      console.error('Cache warming error:', error);
      return null;
    }
  });

  return Promise.allSettled(promises);
};

module.exports = {
  cache,
  cacheMiddleware,
  selectiveCache,
  invalidateCache,
  invalidateUserCache,
  invalidateCourseCache,
  invalidateLessonCache,
  clearAllCache,
  getCacheStats,
  warmCache,
  generateCacheKey
};