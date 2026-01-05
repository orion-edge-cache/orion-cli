export const README_CONTENT = `
╔════════════════════════════════════════════════════════════════════════════╗
║                           ORION - EDGE CACHE CLI                          ║
║                      Quick Start & Usage Guide                            ║
╚════════════════════════════════════════════════════════════════════════════╝

WHAT DOES ORION DO?
─────────────────────────────────────────────────────────────────────────────
Orion automatically provisions a complete edge caching infrastructure for your
GraphQL API with a single command. It creates services on Fastly (CDN) and AWS
(logging infrastructure) to cache GraphQL queries and improve performance.


SERVICES CREATED
─────────────────────────────────────────────────────────────────────────────

FASTLY:
  • CDN Service (Cache Layer)
    Caches GraphQL queries at edge locations worldwide

  • Compute Service
    Handles request transformation and routing logic

  • Config Store
    Stores configuration data for your services

  • Secret Store
    Securely stores sensitive credentials

AWS:
  • IAM Role
    Grants Fastly permission to write logs to AWS services

  • S3 Bucket
    Stores access logs from your CDN

  • Kinesis Stream
    Captures real-time analytics and events from your edge services


WHAT YOU NEED TO PROVIDE
─────────────────────────────────────────────────────────────────────────────

1. DOMAIN NAME
   Format: "example.com" or "www.example.com"
   → The domain where your GraphQL server is hosted

2. PROTOCOL
   Options: HTTP, HTTPS, or Both
   → The protocol your GraphQL server uses

3. API CREDENTIALS (required)
   • Fastly API Key
   • AWS Access Key ID
   • AWS Secret Access Key


WHAT YOU GET BACK
─────────────────────────────────────────────────────────────────────────────

After successful deployment, you'll receive a CDN URL.

USE THIS URL IN YOUR FRONTEND APP:
  Replace your GraphQL endpoint with the CDN URL provided by Orion.
  All subsequent GraphQL queries will be cached at the edge!

Example:
  Before: https://api.example.com/graphql
  After:  https://cdn-[instance-id].global.ssl.fastly.net/graphql


HOW TO USE ORION
─────────────────────────────────────────────────────────────────────────────

1. Run the CLI:
   npm run start

2. Choose an option:
   • View README (this guide)
   • Create New Edge Cache

3. Follow the prompts to enter your domain and protocol

4. Wait for infrastructure provisioning to complete

5. Copy the generated CDN URL to your frontend application


MONITORING & LOGS
─────────────────────────────────────────────────────────────────────────────

Your S3 bucket stores detailed access logs.
Your Kinesis stream provides real-time analytics.
Check the AWS console to view logs and metrics.


DESTROYING INFRASTRUCTURE
─────────────────────────────────────────────────────────────────────────────

To remove all created resources:
  npm run start
  → Select "Destroy existing infrastructure"
  → Confirm the operation

All Fastly services and AWS resources will be deleted.


TROUBLESHOOTING
─────────────────────────────────────────────────────────────────────────────

Missing API credentials?
  → Set environment variables:
    FASTLY_API_KEY=your_key
    AWS_ACCESS_KEY_ID=your_key
    AWS_SECRET_ACCESS_KEY=your_secret

Infrastructure creation failed?
  → Check the error logs for details
  → Verify your API credentials are correct
  → Ensure your AWS account has sufficient permissions

═════════════════════════════════════════════════════════════════════════════
For more information, visit: https://www.fastly.com/edge-compute
═════════════════════════════════════════════════════════════════════════════
`;

export const displayReadme = () => {
  console.log(README_CONTENT);
};