#!/usr/bin/env tsx

/**
 * Mullion Example: Helpdesk Leak Prevention
 *
 * This example demonstrates how Mullion prevents sensitive data leaks
 * in a customer support system where admin-only internal notes must
 * never be exposed to customer-facing responses.
 *
 * 🎯 Learning Objectives:
 * 1. Scope isolation ('admin' vs 'public')
 * 2. Explicit data sanitization before bridging
 * 3. ESLint catching leaks at compile time
 * 4. Confidence checking before using inferred data
 *
 * 📚 Files in this example:
 * - schemas.ts - Zod schemas for structured inference
 * - safe-flow.ts - ✅ Correct implementation with proper isolation
 * - unsafe-flow.ts - ❌ Intentional leaks that ESLint catches
 * - index.ts - This file (interactive demo)
 */

console.log('🎯 Mullion Example: Helpdesk Leak Prevention\n');

console.log('This example shows how Mullion prevents sensitive data from');
console.log('leaking between scopes in a customer support system.\n');

console.log('📖 Scenario:');
console.log('   A support ticket is analyzed by an admin AI that generates');
console.log(
  '   internal notes, risk assessments, and compensation strategies.'
);
console.log('   These MUST NOT leak into customer-facing responses.\n');

console.log('🔍 What Mullion Provides:');
console.log('   • Type-safe scope isolation (admin vs public)');
console.log('   • Compile-time leak detection via ESLint');
console.log('   • Explicit bridging with sanitization');
console.log('   • Confidence tracking for all inferred data\n');

console.log('📂 Available Commands:\n');
console.log('   npm start              - Show this help');
console.log('   npm run safe           - Run SAFE flow (proper isolation)');
console.log('   npm run unsafe         - Run UNSAFE flow (intentional leaks)');
console.log('   npm run lint           - Check for leaks with ESLint');
console.log('   npm run typecheck      - Run TypeScript type checking\n');

console.log('🚀 Quick Start:\n');
console.log('   1. Copy .env.example to .env');
console.log('   2. Add your OPENAI_API_KEY');
console.log('   3. Run: npm run safe (see correct implementation)');
console.log(
  '   4. Run: npm run lint (see ESLint catch unsafe-flow.ts violations)\n'
);

console.log('💡 Key Takeaways:\n');
console.log('   ✅ SAFE: Explicit sanitization → bridge → separate scope');
console.log('   ❌ UNSAFE: Direct access → no bridge → data leaks');
console.log(
  '   🛡️  ESLint catches leaks at compile time (before production!)\n'
);

console.log('📖 Learn More:');
console.log('   Documentation: https://github.com/mullionlabs/mullion-ts');
console.log(
  '   Report Issues: https://github.com/mullionlabs/mullion-ts/issues\n'
);

console.log('---\n');
console.log(
  '💡 TIP: Start with "npm run safe" to see the correct implementation,'
);
console.log('    then run "npm run lint" to see how ESLint prevents leaks!\n');
