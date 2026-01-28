// In-Memory Cache Service for ultra-fast answer retrieval
// Reduces database hits and speeds up common question responses

class InMemoryCache {
  constructor(maxSize = 500, ttlMs = 3600000) { // Default: 500 items, 1 hour TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.hits = 0;
    this.misses = 0;
    
    // Statistics tracking
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      evictions: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Generate cache key from question
   */
  _generateKey(question) {
    return question.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  /**
   * Check if cache entry is expired
   */
  _isExpired(entry) {
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  /**
   * Get value from cache
   */
  get(question) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    
    const key = this._generateKey(question);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.cacheMisses++;
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      this.stats.cacheMisses++;
      this.misses++;
      return null;
    }
    
    // Update access time and hit count
    entry.lastAccess = Date.now();
    entry.hits++;
    
    this.stats.cacheHits++;
    this.hits++;
    
    // Track response time
    const responseTime = Date.now() - startTime;
    this.stats.avgResponseTime = 
      (this.stats.avgResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
      this.stats.totalRequests;
    
    return {
      answer: entry.value,
      cached: true,
      memoryCache: true,
      hits: entry.hits,
      age: Date.now() - entry.timestamp,
      category: entry.category,
      quality: entry.quality
    };
  }

  /**
   * Set value in cache with LRU eviction
   */
  set(question, answer, metadata = {}) {
    const key = this._generateKey(question);
    
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._evictLRU();
    }
    
    const entry = {
      value: answer,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      hits: 0,
      category: metadata.category || 'general',
      quality: metadata.quality || 0.80,
      originalQuestion: question
    };
    
    this.cache.set(key, entry);
    return true;
  }

  /**
   * Evict least recently used entry
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestAccess = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Check if key exists in cache
   */
  has(question) {
    const key = this._generateKey(question);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear entire cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      evictions: 0,
      avgResponseTime: 0
    };
    return size;
  }

  /**
   * Remove specific entry
   */
  delete(question) {
    const key = this._generateKey(question);
    return this.cache.delete(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0
      ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      totalHits: this.stats.cacheHits,
      totalMisses: this.stats.cacheMisses,
      totalRequests: this.stats.totalRequests,
      evictions: this.stats.evictions,
      avgResponseTimeMs: this.stats.avgResponseTime.toFixed(2),
      memoryUsageMB: this._estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  _estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimate: string length * 2 bytes per char + object overhead
      totalSize += (entry.value.length * 2) + 200;
    }
    
    return (totalSize / 1024 / 1024).toFixed(2); // Convert to MB
  }

  /**
   * Get top N most accessed entries
   */
  getTopEntries(limit = 10) {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        question: entry.originalQuestion,
        hits: entry.hits,
        category: entry.category,
        quality: entry.quality,
        age: Date.now() - entry.timestamp,
        lastAccess: entry.lastAccess
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
    
    return entries;
  }

  /**
   * Warm up cache with common questions
   */
  async warmUp(commonAnswers = []) {
    let loaded = 0;
    
    for (const item of commonAnswers) {
      if (item.question && item.answer) {
        this.set(item.question, item.answer, {
          category: item.category,
          quality: item.quality
        });
        loaded++;
      }
    }
    
    return {
      loaded,
      cacheSize: this.cache.size
    };
  }

  /**
   * Clean expired entries
   */
  cleanup() {
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this._isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Export cache to array for persistence
   */
  export() {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      question: entry.originalQuestion,
      answer: entry.value,
      category: entry.category,
      quality: entry.quality,
      hits: entry.hits,
      timestamp: entry.timestamp
    }));
  }

  /**
   * Import cache from array
   */
  import(data) {
    let imported = 0;
    
    for (const item of data) {
      if (item.question && item.answer) {
        this.set(item.question, item.answer, {
          category: item.category,
          quality: item.quality
        });
        imported++;
      }
    }
    
    return imported;
  }
}

// Singleton instance
let cacheInstance = null;

function getCache() {
  if (!cacheInstance) {
    const maxSize = parseInt(process.env.MEMORY_CACHE_SIZE) || 500;
    const ttlMs = parseInt(process.env.MEMORY_CACHE_TTL_MS) || 3600000;
    cacheInstance = new InMemoryCache(maxSize, ttlMs);
  }
  return cacheInstance;
}

module.exports = {
  InMemoryCache,
  getCache
};
