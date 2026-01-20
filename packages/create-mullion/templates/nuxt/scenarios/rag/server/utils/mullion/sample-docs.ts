/**
 * Sample Documents for RAG Pipeline
 *
 * Documents with different access levels for demonstration:
 * - PUBLIC: Product docs, blog posts, marketing
 * - INTERNAL: Employee handbooks, project plans
 * - CONFIDENTIAL: Financial data, trade secrets, legal
 */

import type {Document, AccessLevel} from '~~/schemas';

export const SAMPLE_DOCUMENTS: Document[] = [
  // PUBLIC documents
  {
    id: 'doc-pub-001',
    title: 'Product Features Overview',
    accessLevel: 'public',
    tags: ['product', 'features', 'documentation'],
    content: `
Our flagship product offers enterprise-grade security, real-time collaboration,
and seamless integration with popular tools. Key features include:

- End-to-end encryption for all data
- Role-based access control (RBAC)
- Single sign-on (SSO) support
- API access for custom integrations
- 99.9% uptime SLA
- 24/7 customer support

Available on cloud or on-premise deployment. Free trial available.
    `.trim(),
  },
  {
    id: 'doc-pub-002',
    title: 'Getting Started Guide',
    accessLevel: 'public',
    tags: ['documentation', 'tutorial', 'onboarding'],
    content: `
Welcome to our platform! This guide will help you get started in 5 minutes.

Step 1: Create an account at https://example.com/signup
Step 2: Verify your email address
Step 3: Choose your plan (Free, Pro, or Enterprise)
Step 4: Invite team members
Step 5: Start creating projects

For detailed documentation, visit our help center.
    `.trim(),
  },
  {
    id: 'doc-pub-003',
    title: 'Pricing Plans',
    accessLevel: 'public',
    tags: ['pricing', 'plans', 'billing'],
    content: `
We offer three pricing tiers:

FREE: Up to 5 users, 1GB storage, community support
- Perfect for small teams and personal projects
- $0/month

PRO: Up to 50 users, 100GB storage, email support
- Advanced features and analytics
- $29/user/month

ENTERPRISE: Unlimited users, custom storage, dedicated support
- Custom integrations and SLA
- Contact sales for pricing

All plans include a 14-day free trial. No credit card required.
    `.trim(),
  },

  // INTERNAL documents
  {
    id: 'doc-int-001',
    title: 'Q4 2025 Product Roadmap',
    accessLevel: 'internal',
    tags: ['roadmap', 'planning', 'product'],
    content: `
INTERNAL ONLY - Q4 2025 Product Roadmap

Strategic Priorities:
1. Mobile app launch (iOS + Android) - Target: October
2. Advanced analytics dashboard - Target: November
3. GraphQL API v2 - Target: December

Resource Allocation:
- Engineering: 12 FTE (4 mobile, 5 backend, 3 frontend)
- Design: 2 FTE
- QA: 2 FTE

Budget: $480K for Q4
Dependencies: Hiring 2 senior mobile engineers by September

Risks: Apple App Store review delays, Android fragmentation issues
    `.trim(),
  },
  {
    id: 'doc-int-002',
    title: 'Employee Handbook 2025',
    accessLevel: 'internal',
    tags: ['hr', 'policies', 'handbook'],
    content: `
INTERNAL - Employee Handbook

Work Hours: Flexible schedule, core hours 10am-3pm
Remote Work: Fully remote or hybrid, office available in SF and NYC

Benefits:
- Health insurance (medical, dental, vision)
- 401(k) with 5% company match
- Unlimited PTO (minimum 15 days/year encouraged)
- $2000/year learning budget
- Home office stipend: $1000

Performance Reviews: Bi-annual (June and December)
Promotion Process: Peer nominations + manager review
    `.trim(),
  },

  // CONFIDENTIAL documents
  {
    id: 'doc-conf-001',
    title: 'Q3 2025 Financial Results',
    accessLevel: 'confidential',
    tags: ['finance', 'earnings', 'metrics'],
    content: `
CONFIDENTIAL - Q3 2025 Financial Results (Board-Level Only)

Revenue: $12.4M (up 45% YoY)
- ARR: $48M (up from $33M in Q2)
- New MRR: $850K
- Expansion MRR: $320K
- Churn MRR: -$180K

Expenses: $9.8M
- R&D: $4.2M (43%)
- Sales & Marketing: $3.6M (37%)
- G&A: $2.0M (20%)

Net Income: $2.6M (21% margin)
Cash Position: $28M
Burn Rate: -$1.2M/month

Customer Metrics:
- Total Customers: 1,240 (up from 890 in Q2)
- Enterprise Customers (>$100K ARR): 34
- Average Contract Value: $38.7K
    `.trim(),
  },
  {
    id: 'doc-conf-002',
    title: 'Security Incident Report - Jan 2025',
    accessLevel: 'confidential',
    tags: ['security', 'incident', 'breach'],
    content: `
CONFIDENTIAL - Security Team + Executive Team Only

Incident Report: Unauthorized Access Attempt

Date: January 15, 2025
Severity: HIGH (contained, no data breach)
Status: RESOLVED

Summary:
Detected brute-force login attempts targeting admin accounts.
Attempts blocked by rate limiting and 2FA requirements.
No successful unauthorized access occurred.

Impact Assessment:
- NO customer data accessed
- NO systems compromised
- Attack vector: credential stuffing

Remediation Actions:
1. Blocked attacker IP ranges
2. Forced password reset for all admin accounts
3. Enhanced rate limiting
4. Implemented IP geo-blocking for non-US admin logins
    `.trim(),
  },
];

/**
 * Filter documents by access level
 */
export function filterDocumentsByAccess(
  documents: Document[],
  userAccessLevel: AccessLevel,
): Document[] {
  const accessHierarchy: Record<AccessLevel, number> = {
    public: 0,
    internal: 1,
    confidential: 2,
  };

  const userLevel = accessHierarchy[userAccessLevel];

  return documents.filter(
    (doc) => accessHierarchy[doc.accessLevel] <= userLevel,
  );
}

/**
 * Get documents by tag
 */
export function getDocumentsByTag(
  documents: Document[],
  tag: string,
): Document[] {
  return documents.filter((doc) => doc.tags.includes(tag));
}

/**
 * Simple relevance scoring based on keyword matching
 */
export function scoreDocumentRelevance(
  document: Document,
  query: string,
): number {
  const queryLower = query.toLowerCase();
  const contentLower = document.content.toLowerCase();
  const titleLower = document.title.toLowerCase();

  let score = 0;

  // Title match is worth more
  if (titleLower.includes(queryLower)) score += 0.5;

  // Count keyword occurrences in content
  const keywords = queryLower.split(' ').filter((w) => w.length > 3);
  for (const keyword of keywords) {
    const occurrences = (contentLower.match(new RegExp(keyword, 'g')) || [])
      .length;
    score += Math.min(occurrences * 0.1, 0.3);
  }

  // Tag match
  const matchingTags = document.tags.filter((tag) =>
    queryLower.includes(tag.toLowerCase()),
  );
  score += matchingTags.length * 0.2;

  return Math.min(score, 1.0);
}
