# Mullion Tracing Guide

Production-ready observability for LLM workflows with OpenTelemetry compatibility.

## Quick Start (5 Minutes)

### 1. Start Local Jaeger

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

### 2. Enable Tracing

```typescript
import {TracingPresets} from '@mullion/core';

// One line - tracing enabled!
TracingPresets.jaeger();
```

### 3. View Traces

Open http://localhost:16686 in your browser.

## Production Setup

### Honeycomb

```typescript
import {TracingPresets} from '@mullion/core';

TracingPresets.honeycomb(process.env.HONEYCOMB_API_KEY!);
```

### Datadog

```typescript
import {TracingPresets} from '@mullion/core';

TracingPresets.datadog(process.env.DATADOG_API_KEY!);
```

### New Relic

```typescript
import {TracingPresets} from '@mullion/core';

TracingPresets.newRelic(process.env.NEW_RELIC_LICENSE_KEY!);
```

### Grafana Cloud

```typescript
import {TracingPresets} from '@mullion/core';

TracingPresets.grafana(
  'tempo-prod-01-eu-west-0', // Your instance ID
  process.env.GRAFANA_API_KEY!,
);
```

### Custom Backend

```typescript
import {setupMullionTracing} from '@mullion/core';

setupMullionTracing({
  endpoint: 'https://your-otel-collector.com/v1/traces',
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`,
  },
  serviceName: 'my-app',
});
```

## Configuration Options

### Full Configuration

```typescript
import {setupMullionTracing} from '@mullion/core';

setupMullionTracing({
  // OTLP endpoint URL
  endpoint: 'http://localhost:4318/v1/traces',

  // Service name (appears in traces)
  serviceName: 'my-app',

  // Authentication headers
  headers: {
    Authorization: 'Bearer token',
    'X-Custom-Header': 'value',
  },

  // Buffer size before auto-flush
  maxSpans: 1000,

  // Export immediately (vs buffered)
  autoExport: false,

  // HTTP request timeout (ms)
  timeout: 10000,
});
```

### Custom Exporter

```typescript
import {setupMullionTracing, SpanExporter} from '@mullion/core';

class MyExporter implements SpanExporter {
  async export(spans) {
    // Your custom logic
  }

  async shutdown() {
    // Cleanup
  }
}

setupMullionTracing({
  exporter: new MyExporter(),
});
```

## Manual Instrumentation

Until auto-instrumentation is available, you can manually create spans:

```typescript
import {getGlobalTraceCollector} from '@mullion/core';

const collector = getGlobalTraceCollector();

// Start a span
const spanCtx = collector.startSpan({
  name: 'mullion.infer',
  kind: 'client',
  attributes: {
    'mullion.scope.id': 'admin',
    'mullion.scope.name': 'admin-review',
    'mullion.operation': 'infer',
  },
});

try {
  // Your operation
  const result = await performOperation();

  // End span with success
  await collector.endSpan(spanCtx, {
    status: 'ok',
    attributes: {
      'mullion.confidence': 0.95,
      'gen_ai.usage.input_tokens': 1500,
      'gen_ai.usage.output_tokens': 300,
    },
  });
} catch (error) {
  // End span with error
  await collector.endSpan(spanCtx, {
    status: 'error',
    statusMessage: error.message,
  });
  throw error;
}
```

### Parent/Child Spans

```typescript
// Parent span
const parentCtx = collector.startSpan({
  name: 'mullion.fork',
  kind: 'internal',
});

// Child span (inherits traceId)
const childCtx = collector.startSpan({
  name: 'mullion.infer',
  kind: 'client',
  parentSpanId: parentCtx.spanId,
  traceId: parentCtx.traceId,
});

// End child first
await collector.endSpan(childCtx);

// Then parent
await collector.endSpan(parentCtx);
```

## Mullion Attributes

Mullion spans include specialized attributes for LLM workflow observability:

### Scope Attributes

Track context boundaries and provenance:

- `mullion.scope.id` - Scope identifier (e.g., 'admin', 'customer')
- `mullion.scope.name` - Human-readable scope name

### Operation Attributes

Identify Mullion operations:

- `mullion.operation` - Operation type: 'infer', 'bridge', 'fork', 'merge'

### Confidence Attributes

Track LLM confidence levels:

- `mullion.confidence` - Confidence score (0-1)

### Bridge Attributes

Track cross-scope data flow:

- `mullion.bridge.source` - Source scope ID
- `mullion.bridge.target` - Target scope ID

### Fork Attributes

Track parallel execution:

- `mullion.fork.strategy` - 'fast-parallel' or 'cache-optimized'
- `mullion.fork.branch_count` - Number of parallel branches
- `mullion.fork.warmup_strategy` - 'explicit', 'first-branch', or 'none'

### Merge Attributes

Track result aggregation:

- `mullion.merge.strategy` - Merge strategy name
- `mullion.merge.consensus_level` - Consensus score (0-1)

### Cache Attributes

Monitor cache performance:

- `mullion.cache.hit_rate` - Cache hit ratio (0-1)
- `mullion.cache.saved_tokens` - Tokens saved from cache
- `mullion.cache.created_tokens` - Tokens written to cache

### Cost Attributes

Track LLM costs:

- `mullion.cost.usd` - Operation cost in USD
- `mullion.cost.saved_usd` - Cost savings from cache

### GenAI Attributes (Standard)

Following OpenTelemetry semantic conventions:

- `gen_ai.system` - LLM provider ('anthropic', 'openai', etc.)
- `gen_ai.request.model` - Model identifier
- `gen_ai.usage.input_tokens` - Input tokens consumed
- `gen_ai.usage.output_tokens` - Output tokens generated
- `gen_ai.response.finish_reasons` - Completion reasons

## Lifecycle Management

### Graceful Shutdown

```typescript
import {disableMullionTracing} from '@mullion/core';

// At application exit
process.on('SIGINT', async () => {
  await disableMullionTracing(); // Flushes pending spans
  process.exit(0);
});
```

### Reconfiguration

```typescript
// Initial setup
TracingPresets.jaeger();

// Switch to production
setupMullionTracing({
  endpoint: 'https://api.honeycomb.io/v1/traces',
  headers: {'x-honeycomb-team': process.env.API_KEY},
});
```

### Manual Flush

```typescript
import {getGlobalTraceCollector} from '@mullion/core';

const collector = getGlobalTraceCollector();

// Force export of buffered spans
await collector.flush();
```

## Performance

### Zero Overhead by Default

When no exporter is configured, tracing operations are no-ops:

```typescript
// No exporter configured - zero overhead
const collector = getGlobalTraceCollector();
collector.startSpan({name: 'test'}); // No-op
```

### Buffered Export

By default, spans are buffered and exported in batches:

```typescript
setupMullionTracing({
  endpoint: '...',
  maxSpans: 1000, // Export when buffer reaches 1000 spans
  autoExport: false, // Buffered mode (default)
});
```

### Immediate Export

For debugging or low-traffic scenarios:

```typescript
setupMullionTracing({
  endpoint: '...',
  autoExport: true, // Export immediately after each span
});
```

## Troubleshooting

### Spans Not Appearing

1. **Check exporter is configured:**

   ```typescript
   const collector = getGlobalTraceCollector();
   console.log(collector.isEnabled()); // Should be true
   ```

2. **Check endpoint URL:**

   ```typescript
   // Verify endpoint is correct for your backend
   // Most OTLP endpoints use /v1/traces path
   ```

3. **Check authentication:**

   ```typescript
   // Verify headers/API keys are correct
   setupMullionTracing({
     endpoint: '...',
     headers: {Authorization: 'Bearer YOUR_TOKEN'},
   });
   ```

4. **Manually flush:**
   ```typescript
   await getGlobalTraceCollector().flush();
   ```

### Connection Errors

Check network connectivity:

```bash
# Test endpoint
curl -X POST https://your-endpoint.com/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'
```

### Performance Issues

1. **Reduce autoExport frequency:**

   ```typescript
   setupMullionTracing({
     autoExport: false, // Use buffered mode
     maxSpans: 500, // Smaller buffer = more frequent exports
   });
   ```

2. **Increase timeout:**
   ```typescript
   setupMullionTracing({
     timeout: 30000, // 30 seconds
   });
   ```

## Best Practices

### 1. Use Environment Variables

```typescript
setupMullionTracing({
  endpoint: process.env.OTEL_ENDPOINT,
  headers: {
    Authorization: `Bearer ${process.env.OTEL_TOKEN}`,
  },
  serviceName: process.env.SERVICE_NAME || 'mullion',
});
```

### 2. Set Service Name

```typescript
setupMullionTracing({
  serviceName: 'my-app', // Makes traces easier to filter
});
```

### 3. Flush on Shutdown

```typescript
process.on('SIGTERM', async () => {
  await disableMullionTracing();
  process.exit(0);
});
```

### 4. Use Span Hierarchy

```typescript
// Parent for overall operation
const operationCtx = collector.startSpan({name: 'api.request'});

// Children for sub-operations
const inferCtx = collector.startSpan({
  name: 'mullion.infer',
  parentSpanId: operationCtx.spanId,
  traceId: operationCtx.traceId,
});

// End children first, then parent
await collector.endSpan(inferCtx);
await collector.endSpan(operationCtx);
```

### 5. Add Context to Attributes

```typescript
collector.startSpan({
  name: 'mullion.infer',
  attributes: {
    'mullion.scope.id': 'admin',
    'user.id': userId,
    'request.id': requestId,
  },
});
```

## Examples

### Complete Example

```typescript
import {setupMullionTracing, getGlobalTraceCollector} from '@mullion/core';

// Setup tracing at app startup
setupMullionTracing({
  endpoint: process.env.OTEL_ENDPOINT!,
  serviceName: 'my-app',
});

const collector = getGlobalTraceCollector();

// In your application code
async function processRequest(userId: string, message: string) {
  const requestCtx = collector.startSpan({
    name: 'request.process',
    kind: 'server',
    attributes: {
      'user.id': userId,
    },
  });

  try {
    // Simulate Mullion operations
    const inferCtx = collector.startSpan({
      name: 'mullion.infer',
      kind: 'client',
      parentSpanId: requestCtx.spanId,
      traceId: requestCtx.traceId,
      attributes: {
        'mullion.scope.id': 'user-input',
        'mullion.operation': 'infer',
      },
    });

    // Perform inference
    const result = await performInference(message);

    await collector.endSpan(inferCtx, {
      status: 'ok',
      attributes: {
        'mullion.confidence': 0.95,
        'gen_ai.usage.input_tokens': 100,
        'gen_ai.usage.output_tokens': 50,
      },
    });

    await collector.endSpan(requestCtx, {status: 'ok'});
    return result;
  } catch (error) {
    await collector.endSpan(requestCtx, {
      status: 'error',
      statusMessage: error.message,
    });
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await disableMullionTracing();
  process.exit(0);
});
```

## Next Steps

- See [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) for GenAI attributes
- See API documentation for complete type definitions
- Join our community for support and examples
