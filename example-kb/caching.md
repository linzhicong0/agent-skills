---
title: "Caching Strategy (Redis)"
description: "Redis caching patterns, TTL policies, cache invalidation rules, and performance tuning for the application cache layer"
read_when:
  - Implementing or modifying caching logic
  - Debugging stale data or cache consistency issues
  - Questions about Redis configuration or cache invalidation
  - Performance optimization involving repeated database queries
keywords:
  - cache
  - redis
  - ttl
  - invalidation
  - performance
  - memoization
  - stale
  - eviction
  - latency
---

# Caching Strategy (Redis)

## Cache Layers

1. **Application Cache** — Redis, TTL 5-60 min
2. **CDN Cache** — CloudFront, TTL 1-24 hours
3. **Browser Cache** — HTTP headers, TTL 0-1 year

## Invalidation Rules

- Write-through: update cache immediately on write
- Event-driven: invalidate on database change events
- TTL-based: auto-expire stale entries

## Key Naming Convention

```
{service}:{entity}:{id}:{version}
Example: api:user:123:v2
```

## Common Pitfalls

- Don't cache user-specific data in shared keys
- Always set a TTL (no infinite cache)
- Monitor cache hit ratio — below 80% needs investigation
