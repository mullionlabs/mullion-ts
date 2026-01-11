/**
 * Sample Documents for RAG Pipeline
 *
 * These documents represent different access levels in a corporate knowledge base:
 * - PUBLIC: Product documentation, blog posts, marketing materials
 * - INTERNAL: Employee handbooks, project plans, meeting notes
 * - CONFIDENTIAL: Financial data, trade secrets, legal documents
 */

import type { Document, AccessLevel } from '../schemas.js';

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

For detailed documentation, visit our help center at https://help.example.com
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

Code of Conduct: Respect, integrity, collaboration
    `.trim(),
  },
  {
    id: 'doc-int-003',
    title: 'Customer Success Playbook',
    accessLevel: 'internal',
    tags: ['customer-success', 'playbook', 'support'],
    content: `
INTERNAL - Customer Success Team Playbook

Onboarding Workflow:
Day 1: Welcome email + kickoff call
Day 7: Check-in on initial setup
Day 30: Success review + feature training
Day 90: Quarterly business review (QBR)

Escalation Process:
1. Customer reports issue via support ticket
2. L1 support triages within 2 hours
3. If unresolved in 4 hours, escalate to L2
4. If critical or enterprise customer, notify CS manager immediately

Churn Prevention:
- Monitor usage metrics weekly
- Reach out if usage drops 30%+
- Offer feature training or discount if needed
- Exit interview for all churned customers

Success Metrics: NPS >50, CSAT >4.5/5, Churn <5% annually
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
Burn Rate: -$1.2M/month (including one-time costs)

Customer Metrics:
- Total Customers: 1,240 (up from 890 in Q2)
- Enterprise Customers (>$100K ARR): 34
- Average Contract Value: $38.7K

Board approved Series B funding round targeting $30M at $180M valuation.
Lead investor: Sequoia Capital (term sheet signed, due diligence in progress)
    `.trim(),
  },
  {
    id: 'doc-conf-002',
    title: 'Acquisition Discussions - CompetitorCo',
    accessLevel: 'confidential',
    tags: ['m&a', 'acquisition', 'strategy'],
    content: `
HIGHLY CONFIDENTIAL - CEO/CFO/Legal Only

Subject: Acquisition Interest from CompetitorCo

Summary:
CompetitorCo approached us with preliminary acquisition interest on Sept 15.
Initial indication: $250M all-cash offer (5x ARR multiple)

Key Points:
- They want to acquire our technology and customer base
- Offering retention packages to key employees (CEO: $10M, CTO: $5M over 3 years)
- Would integrate our product into their enterprise suite
- Timeline: Due diligence in Q4, close in Q1 2026

Concerns:
- Below our internal valuation ($300M+ based on growth trajectory)
- Cultural fit uncertain (they have 5,000 employees, we have 65)
- Product roadmap may be deprioritized post-acquisition

Next Steps:
- Board meeting scheduled Oct 10 to discuss
- Hired Goldman Sachs for acquisition advisory
- Exploring counter-offer or alternative strategic options

DO NOT DISCUSS OUTSIDE OF EXECUTIVE TEAM
    `.trim(),
  },
  {
    id: 'doc-conf-003',
    title: 'Patent Application - Core Algorithm',
    accessLevel: 'confidential',
    tags: ['legal', 'patent', 'ip'],
    content: `
CONFIDENTIAL - Legal Department Only

Patent Application: Real-Time Data Synchronization Algorithm
Application Number: US-2025-0123456
Filing Date: August 1, 2025
Status: Under review (USPTO)

Invention Summary:
Novel conflict-free replicated data type (CRDT) algorithm for real-time
collaborative editing with operational transformation. Achieves sub-50ms
synchronization latency with 99.99% consistency guarantee.

Key Claims:
1. Method for distributed state synchronization
2. Conflict resolution algorithm with causal ordering
3. Optimized merge strategy for concurrent edits
4. Network-partition tolerant consistency protocol

Commercial Value:
- Core differentiator vs competitors
- Enables our real-time collaboration features
- Potential licensing opportunity ($5M-10M/year estimated)

Prior Art Analysis:
- Google's Operational Transform (Wave) - differs in merge strategy
- Figma's approach - uses different CRDT implementation
- Our method is 3x faster and more scalable

Inventor: Jane Smith (CTO), John Doe (Principal Engineer)
Legal Counsel: Wilson Sonsini Goodrich & Rosati

Expected approval: Q2 2026
    `.trim(),
  },
  {
    id: 'doc-conf-004',
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
Detected brute-force login attempts targeting admin accounts from IP range
203.0.113.0/24 (traced to Eastern European data center). Attempts blocked by
rate limiting and 2FA requirements. No successful unauthorized access occurred.

Timeline:
- 02:15 UTC: Automated alert triggered (100+ failed logins in 5 minutes)
- 02:18 UTC: On-call engineer paged
- 02:30 UTC: IP range blocked at firewall level
- 03:00 UTC: Full security audit initiated
- 08:00 UTC: Executive team notified

Impact Assessment:
- NO customer data accessed
- NO systems compromised
- Attack vector: credential stuffing (likely from third-party data breach)
- Targeted accounts: 3 admin users, all had 2FA enabled (attack failed)

Remediation Actions:
1. ✅ Blocked attacker IP ranges
2. ✅ Forced password reset for all admin accounts
3. ✅ Enhanced rate limiting (now 3 attempts per 15 min)
4. ✅ Implemented IP geo-blocking for non-US admin logins
5. ⏳ Rolling out hardware security keys for all admin users (ETA: Feb 1)

Notification Requirements:
- No customer notification required (no breach occurred)
- No regulatory reporting required (GDPR/SOC2)
- Board informed at Feb 2 meeting

Lessons Learned:
- Rate limiting prevented breach (system worked as designed)
- Need faster escalation for high-severity alerts (improving runbook)
- Consider requiring hardware 2FA for all privileged accounts
    `.trim(),
  },
];

/**
 * Helper function to filter documents by access level
 */
export function filterDocumentsByAccess(
  documents: Document[],
  userAccessLevel: AccessLevel
): Document[] {
  const accessHierarchy: Record<AccessLevel, number> = {
    public: 0,
    internal: 1,
    confidential: 2,
  };

  const userLevel = accessHierarchy[userAccessLevel];

  return documents.filter(
    (doc) => accessHierarchy[doc.accessLevel] <= userLevel
  );
}

/**
 * Helper function to get documents by tag
 */
export function getDocumentsByTag(
  documents: Document[],
  tag: string
): Document[] {
  return documents.filter((doc) => doc.tags.includes(tag));
}

/**
 * Simple relevance scoring based on keyword matching
 * (In production, you'd use embeddings and vector similarity)
 */
export function scoreDocumentRelevance(
  document: Document,
  query: string
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
    queryLower.includes(tag.toLowerCase())
  );
  score += matchingTags.length * 0.2;

  return Math.min(score, 1.0);
}
