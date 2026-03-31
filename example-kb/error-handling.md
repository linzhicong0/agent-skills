---
title: "Error Handling and Logging"
description: "Error classification, structured logging format, alerting rules, and debugging procedures for production incidents"
read_when:
  - Adding error handling to application code
  - Debugging production errors or investigating incidents
  - Setting up logging or monitoring
  - Questions about error codes, error responses, or log formats
keywords:
  - error
  - logging
  - monitoring
  - alerting
  - debugging
  - incident
  - stack-trace
  - exception
  - retry
  - timeout
---

# Error Handling and Logging

## Error Classification

| Category | HTTP Status | Example | Alert |
|----------|-------------|---------|-------|
| User Error | 400 | Invalid input | No |
| Auth Error | 401 | Expired token | No |
| System Error | 500 | Database down | Yes |

## Structured Log Format

All logs are JSON with: timestamp, level, message, request_id, error_code, context.

## Retry Policy

- Exponential backoff: 1s, 2s, 4s, 8s
- Max 3 retries
- Circuit breaker after 5 consecutive failures
