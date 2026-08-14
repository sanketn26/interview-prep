---
title: Cloud Provider Comparison
description: "AWS, GCP, Azure. How they're similar, where they differ, and when to use each. Working knowledge for architecture interviews."
prerequisites:
  - Cloud basics
---

# Cloud Provider Comparison

**Prerequisites:** [Docker](docker.md), [Kubernetes](../kubernetes/index.md)

[← Cloud](index.md)

---

## Why This Exists

"We're going to move to the cloud" is not a technical decision; it's a business one. The technical decision is **which cloud**.

Each provider has similar primitives (VMs, databases, load balancers) but different pricing, operator experience, and strengths. This page teaches the **working knowledge** for architecture interviews: what each provider does well, where they're weak, and what questions unlock the decision.

---

## The Two Foundational Concepts: VPC & Auth

Everything in the cloud flows from these two:

### 1. VPC: Your Private Network in the Cloud

Think of VPC like renting a private building:

```
Physical datacenter (AWS region)
  │
  ├─ Your VPC (your private building)
  │  ├─ Subnet A (floor 1, private — no internet)
  │  ├─ Subnet B (floor 2, public — has internet gateway)
  │  └─ Security Group = door policy for each instance
  │
  ├─ Another customer's VPC (another private building, completely isolated)
  │
  └─ AWS services (shared, accessed via VPC endpoints)
```

**Key insight:** By default, nothing on your VPC can talk to anything outside it. You must explicitly:
- Add an Internet Gateway to get outbound internet
- Attach a NAT Gateway for private instances to reach outside (but not vice versa)
- Create a VPC Peering link to another VPC

**Cross-cloud mapping:**

```
AWS VPC          ↔   GCP VPC                    ↔   Azure Virtual Network
  Subnet         ↔   Subnetwork                 ↔   Subnet
  Security Group ↔   Firewall Rules             ↔   Network Security Group
  NACLs          ↔   (built into VPC)           ↔   (built into vNet)
  IGW            ↔   Cloud NAT / Cloud Router   ↔   Public IP / NAT Gateway
```

### 2. Auth: Who Can Do What

```
Three layers:

Layer 1: Network-level (VPC)
  Question: "Can this EC2 instance talk to that database?"
  Answer: Security Group rules + NACLs + route tables

Layer 2: Identity-level (IAM)
  Question: "Can this AWS principal delete this S3 bucket?"
  Answer: IAM policies (roles and permissions)

Layer 3: Application-level (your code)
  Question: "Can this user read this other user's data?"
  Answer: Your application authorization logic
```

**Example: Secure architecture**

```
Internet
  │
  ├─ Security Group (network layer)
  │  └─ Allow: TCP:443 from 0.0.0.0/0
  │
  ALB (in public subnet)
  │
  ├─ Security Group (network layer)
  │  └─ Allow: TCP:8080 from ALB security group
  │
  EC2 App Server (in private subnet)
  │ IAM Role: S3ReadOnly (identity layer)
  │ Trusts: Code on this instance can read from S3
  │
  └─ S3 Bucket
     Resource Policy: Only EC2 instance with S3ReadOnly role can read
```

**Cross-cloud mapping:**

```
AWS                    ↔   GCP                       ↔   Azure
────────────────────────────────────────────────────────────────
IAM Roles              ↔   IAM Roles                  ↔   RBAC Roles
IAM Policies           ↔   IAM Predefined Roles       ↔   Role Definitions
EC2 Instance Profile   ↔   Service Account            ↔   Managed Identity
Assume Role            ↔   Service Account Key        ↔   Managed Identity
STS (temporary tokens) ↔   OAuth2 tokens              ↔   JWT tokens
```

### Everything Else Derives From These

Once you understand VPC and Auth, every other service makes sense:

```
RDS (database)
  Lives in: VPC (private or public subnet)
  Protected by: Security Group + IAM roles (who can connect?)
  Access: Can only be reached if your app is in the same VPC

S3 (storage)
  Location: Not in VPC (but can use VPC endpoints to reach privately)
  Protected by: IAM policies (who can read/write?) + bucket policies
  Access: Your EC2 instance needs IAM role with S3 permissions

Lambda (serverless)
  Execution: Can run in your VPC (private) or outside it
  Protected by: IAM role (what can this Lambda do?)
  Access: Lambda needs IAM permission to read RDS, write S3, etc.

ALB (load balancer)
  Location: In VPC (public subnet)
  Protected by: Security Group (allow HTTP/HTTPS?)
  Access: Routes traffic to EC2 instances in private subnet
```

## Mental Model: Building on the Cloud

All three clouds offer the same spectrum of abstraction:

```
Low-level (you manage everything)          High-level (cloud manages everything)
─────────────────────────────────────────────────────────────────────────────────
VM                                         Serverless
Self-managed DB                            Managed database
Containers (you orchestrate)                Managed orchestration
Custom monitoring                           Built-in monitoring
```

### How the Spectrum Works

**Example: A database**

```
AWS Path:
  Self-managed: EC2 + install Postgres yourself → full control, ~$0
  RDS:          AWS manages backups, patches, failover → pay 3× more, sleep 10× better

GCP Path:
  Self-managed: Compute Engine + install Postgres → same as AWS
  Cloud SQL:    GCP manages backups, patches, failover → pay similar to RDS, same benefits

Azure Path:
  Self-managed: VM + install Postgres → same
  Azure SQL:    Azure manages everything → similar cost, same benefits
```

**Key insight:** Managed services cost more per unit but save operator toil. They're a bet: "We pay more so our team isn't on-call for database disasters."

### The Hierarchy of Control

Every service follows this pattern:

```
AWS                          GCP                        Azure
─────────────────────────────────────────────────────────────────
EC2 (bare VM, you config)   Compute Engine             Virtual Machines
ECS (Docker orchestration)  GKE (Kubernetes)           AKS (Kubernetes)
Fargate (managed ECS)       Cloud Run (serverless)     Container Instances

RDS (managed DB)            Cloud SQL (managed DB)     Azure SQL
DynamoDB (serverless DB)    Firestore (serverless DB) Cosmos DB (serverless DB)

S3 (object storage)         Cloud Storage              Blob Storage
Lambda (serverless code)    Cloud Functions/Cloud Run  Azure Functions
```

**The pattern:** Each layer is simpler but less flexible than the layer below. Pick where you want to be on the spectrum based on your team size and SLA needs.

---

## AWS: The Mental Model Foundation

AWS is the reference implementation. Understanding AWS is the key to understanding all three clouds, because GCP and Azure are usually "AWS service X, but different."

### Core Concepts: The AWS Mental Model

**1. Compute: Where Code Runs**

```
EC2 (VMs)
  ├─ You choose: OS, CPU, RAM, network
  ├─ You manage: OS patches, application deployment, scaling
  └─ Use when: Need full control, legacy apps, specific OS

ECS (Container orchestration)
  ├─ You provide: Docker images
  ├─ AWS manages: Container scheduling, networking
  └─ Use when: Containers but don't want Kubernetes

EKS (Kubernetes)
  ├─ You provide: Kubernetes manifests
  ├─ AWS manages: Control plane, etcd backups
  └─ Use when: Need Kubernetes, want AWS to handle operations

Lambda (Serverless)
  ├─ You provide: Code (Python, Node, Go, Java, Rust)
  ├─ AWS manages: Everything (scaling, security, OS)
  └─ Use when: Event-driven, unpredictable traffic, low volume

Fargate (Managed containers)
  ├─ You provide: Docker image
  ├─ AWS manages: EC2 instances, orchestration
  └─ Use when: Want ECS without managing EC2
```

**Mapping across clouds:**

```
AWS                        GCP                           Azure
────────────────────────────────────────────────────────────────
EC2                    ↔   Compute Engine              ↔ Virtual Machines
ECS                    ↔   (no exact equivalent)        ↔ Container Instances
EKS                    ↔   GKE (more mature)           ↔ AKS
Lambda                 ↔   Cloud Functions             ↔ Azure Functions
Fargate                ↔   Cloud Run                    ↔ Container Instances
```

**2. Storage: Where Data Lives**

```
S3 (Object storage)
  ├─ Use for: User uploads, backups, static files, logs
  ├─ Structure: Buckets (namespaced folders), zero folder hierarchy
  └─ Cost: $0.023/GB/month + requests

EBS (Block storage for VMs)
  ├─ Use for: Database files, app data on EC2
  ├─ Structure: Volumes attached to instances (like hard drives)
  └─ Cost: $0.10/GB/month provisioned (whether you use it or not)

RDS (Managed relational DB)
  ├─ Use for: Postgres, MySQL, Aurora (AWS's proprietary, PostgreSQL-compatible)
  ├─ Managed: Backups, failover, patches, read replicas
  └─ Cost: $0.195/hour (db.t3.micro) + storage

DynamoDB (Managed NoSQL, serverless)
  ├─ Use for: Document storage, real-time data, high throughput
  ├─ Managed: Global tables, automatic scaling, backups
  └─ Cost: $1.25/M write units + $0.25/M read units (or on-demand)

Elasticache (Managed cache)
  ├─ Use for: Redis or Memcached in front of RDS
  ├─ Managed: Replication, failover, cluster mode
  └─ Cost: $0.017/hour (cache.t3.micro)
```

**Mapping across clouds:**

```
AWS             ↔   GCP                    ↔   Azure
────────────────────────────────────────────────────────
S3              ↔   Cloud Storage          ↔   Blob Storage
EBS             ↔   Persistent Disk        ↔   Managed Disk
RDS             ↔   Cloud SQL              ↔   Azure SQL
DynamoDB        ↔   Firestore/BigTable     ↔   Cosmos DB
Elasticache     ↔   Memorystore            ↔   Cache for Redis
```

**3. Networking: How Services Talk**

```
VPC (Virtual Private Cloud)
  ├─ Your isolated network within AWS
  ├─ Contains subnets (public, private), security groups (firewalls), route tables
  └─ Think: a corporation's internal network, but in the cloud

Security Groups
  ├─ Inbound rules: "allow traffic from X"
  ├─ Outbound rules: "allow traffic to X"
  └─ Applied per-instance (fine-grained firewall)

ALB (Application Load Balancer) / NLB (Network Load Balancer)
  ├─ ALB: L7, route by hostname/path, typical for microservices
  ├─ NLB: L4, millions of RPS, non-HTTP protocols
  └─ Result: Single VIP distributes traffic to backends

Route53 (DNS + routing)
  ├─ Manage DNS records (A, AAAA, CNAME, MX)
  ├─ Geographic routing: "users in US → us-west API, users in EU → eu-west API"
  └─ Health checks: failover if a region is down
```

**Mapping across clouds:**

```
AWS             ↔   GCP                              ↔   Azure
────────────────────────────────────────────────────────────────────
VPC             ↔   VPC                              ↔   Virtual Network
Security Groups ↔   Firewall Rules                    ↔   Network Security Groups
ALB             ↔   Cloud Load Balancer (external)   ↔   Application Gateway
NLB             ↔   Cloud Load Balancer (internal)   ↔   Basic LB
Route53         ↔   Cloud DNS                        ↔   Azure DNS
CloudFront      ↔   Cloud CDN                        ↔   Front Door
```

**4. Identity & Access: Who Can Do What**

```
IAM (Identity & Access Management)
  ├─ Roles: "what can this principal do?" (e.g., ec2-admin)
  ├─ Policies: Statements like "allow s3:GetObject on bucket:my-bucket"
  └─ Applied to: Users, roles, services

Example policy:
  {
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*"
  }
  ↓ means ↓
  "Let this principal read objects in my-bucket"
```

**Mapping across clouds:**

```
AWS                 ↔   GCP                      ↔   Azure
────────────────────────────────────────────────────────────
IAM                 ↔   IAM                      ↔   RBAC (Role-Based Access Control)
Roles & Policies    ↔   Roles & Permissions      ↔   Roles & Assignments
STS (temporary creds) ↔   Service Accounts       ↔   Service Principals
```

### Strengths

- **Breadth:** 200+ services. Whatever you want to build, AWS has a service for it.
- **Mature:** Longest in the market; most documentation; most third-party integrations.
- **Pricing:** Aggressive discounts (reserved instances, spot instances). Most cost-optimizable if you know the levers.
- **Operator experience:** Most operators have AWS experience; easiest to hire for.

### Services You'll Use

| Service | Category | When |
|---------|----------|------|
| **EC2** | VMs | Need full OS control, legacy workloads |
| **ECS** | Container orchestration | Simpler than K8s, works for most workloads |
| **EKS** | Managed Kubernetes | Need Kubernetes but want AWS to manage control plane |
| **Lambda** | Serverless | Periodic jobs, webhooks, low-traffic APIs |
| **RDS** | Managed databases | Postgres, MySQL, Aurora (PostgreSQL-compatible) |
| **DynamoDB** | NoSQL | Document storage, high throughput, eventually consistent |
| **S3** | Object storage | Backups, user uploads, static assets, logs |
| **SNS/SQS** | Pub/sub, queues | Async communication, event delivery |
| **ALB/NLB** | Load balancers | Route HTTP traffic, extreme throughput |
| **CloudFront** | CDN | Cache at edge, serve globally |
| **Route53** | DNS + routing | Global load balancing, failover |
| **IAM** | Identity & Access | Control who can do what |

### Pricing Model

```
You pay for:
- Compute: EC2 (per hour or second), Lambda (per invocation)
- Storage: S3 (per GB stored + per request), EBS (per GB provisioned)
- Data transfer: Egress out of AWS (expensive; ingress free)
- Services: RDS, ALB, etc. (per hour or per request)

Cost tricks:
- Reserved instances: commit 1-3 years, get 40-60% discount
- Spot instances: up to 90% off, but cloud can reclaim anytime
- Data transfer within region: cheap; cross-region: 10× more
- Putting data on S3 Glacier: very cheap but slow to retrieve
```

**Example: A small API**

```
EC2 t3.micro:              $7/month
RDS db.t3.micro:          $25/month
ALB:                       $16/month
Data (10 GB/month):        $1/month
───────────────────
Total:                    ~$50/month

Same with reserved instances (1 year commitment):
EC2: $4/month
RDS: $12/month
ALB: $16/month
───────────────────
Total:                    ~$32/month
```

### Weaknesses

- **Complexity:** 200+ services = steep learning curve. Easy to make expensive mistakes.
- **Pricing:** Can be opaque. A data transfer you didn't know about costs $1000/month.
- **Setup:** More boilerplate than competitors (VPCs, subnets, security groups).

---

## GCP: The Data Platform

### Strengths

- **Data and ML:** Best-in-class data warehouse (BigQuery), ML services, analytics. If you're doing data science, GCP is hard to beat.
- **Kubernetes:** Invented Kubernetes. GKE (Google Kubernetes Engine) is the most mature managed K8s offering.
- **Global load balancing:** Built-in geographic load balancing (automatic failover across regions).
- **Pricing model:** Simpler than AWS (per-request model, automatic discounts, no commitment required).
- **Operator experience:** If your team knows Kubernetes, GCP is a natural fit.

### Services You'll Use

| Service | Category | When |
|---------|----------|------|
| **Compute Engine** | VMs | Full OS control, legacy workloads |
| **GKE** | Managed Kubernetes | Standard for stateless workloads |
| **Cloud Run** | Serverless containers | Simpler than Lambda, can run any container |
| **Cloud SQL** | Managed databases | Postgres, MySQL, SQL Server |
| **Firestore** | NoSQL document DB | Easier than Dynamodb, better for mobile/real-time |
| **BigTable** | Wide-column DB | Time-series data, very high throughput |
| **BigQuery** | Data warehouse | SQL analytics over petabytes (if it's data science) |
| **Cloud Storage** | Object storage | Similar to S3, slightly cheaper |
| **Cloud Load Balancer** | Global LB | Automatic geographic routing |
| **Cloud Pub/Sub** | Pub/sub | Publish-subscribe at scale |
| **Cloud Tasks** | Async task queue | Similar to SQS but simpler |

### Pricing Model

```
You pay for:
- Compute: Per second (more granular than AWS)
- Storage: Per GB (slightly cheaper than S3)
- Requests: Per million requests (BigQuery, Cloud Run, etc.)
- Data transfer: Ingress free; egress cheap (cheaper than AWS)

No reserved instances by default, but automatic 25-30% discount for sustained use.

Example: A small API on Cloud Run
Cold start: ~100ms, costs nothing until request arrives
Per request: ~$0.000002 (for 128MB, 100ms)
1M requests/month: ~$2
Data storage: ~$0.05/GB
───────────────────
Total: ~$10-50/month (depending on traffic)
```

**GCP is cheaper than AWS for:**
- APIs with unpredictable traffic (Cloud Run)
- Data analytics (BigQuery)
- Global load balancing (automatic)

**GCP is more expensive for:**
- Sustained high compute (AWS reserved instances cheaper)
- Cross-region data (AWS has more egress options)

### Weaknesses

- **Smaller ecosystem:** Fewer third-party tools integrate with GCP vs. AWS.
- **Billing surprises:** Easier to understand, but Global Load Balancer pricing can still surprise you.
- **Legacy workload support:** AWS has more support for Windows, legacy databases.

---

## Azure: The Enterprise Choice

### Strengths

- **Enterprise integration:** Best integrations with Windows, SQL Server, Active Directory, Office 365. If you're an enterprise with existing Microsoft infrastructure, Azure is the default.
- **Hybrid:** Easiest cloud for "hybrid cloud" (on-prem + cloud).
- **Developer tools:** Visual Studio integration, .NET support.
- **Pricing:** Competitive, especially for Windows workloads (AWS licenses are extra).

### Services You'll Use

| Service | Category | When |
|---------|----------|------|
| **Virtual Machines** | VMs | Windows, Linux, legacy apps |
| **AKS** | Managed Kubernetes | Standard for containers (similar to GKE/EKS) |
| **App Service** | PaaS | Web apps, APIs, easier than Lambda/Cloud Run |
| **Azure SQL** | Managed databases | Postgres, MySQL, SQL Server (MSSQL native) |
| **Cosmos DB** | NoSQL | Multi-region, multi-model database |
| **Blob Storage** | Object storage | Similar to S3 |
| **Azure DevOps** | CI/CD | Integrated with development tools |
| **App Gateway** | L7 load balancer | Similar to AWS ALB |
| **Service Bus** | Pub/sub, queues | Enterprise message broker |
| **Functions** | Serverless | Similar to Lambda |

### Pricing Model

```
You pay for:
- Compute: Per hour or second
- Storage: Per GB
- Requests: Depends on service

Reserved instances: Up to 72% discount for 3-year commitment (better than AWS).
Hybrid benefit: Bring your own Windows/SQL license, get discount.

Example: A Windows VM with SQL Server
VM (D2s):              $100/month
SQL Server license:    $100-200/month (or bring-your-own)
Storage (100GB):       $20/month
───────────────────
Total:                $220-320/month

With reserved instance (3-year):
VM:                   $40/month
───────────────────
Total:               ~$160-260/month
```

### Weaknesses

- **Smaller market share:** Fewer engineers know Azure. Hiring and support can be harder.
- **Learning curve:** Different naming conventions (e.g., "Resource Group" vs "VPC").
- **Open-source tools:** Not as many open-source tools integrate with Azure vs. AWS/GCP.

---

## Comparison Table: When to Use Each

| Decision | AWS | GCP | Azure |
|---|---|---|---|
| **No prior cloud experience** | AWS (largest ecosystem, most jobs) | GCP (simpler pricing, better for learning) | Azure (if enterprise Windows background) |
| **Building a data warehouse** | Redshift (expensive) | **BigQuery (best-in-class)** | Synapse (expensive) |
| **High-traffic REST API** | ALB + ECS | Cloud Run or GKE | App Service or AKS |
| **Kubernetes heavy** | EKS (mature but complex) | **GKE (invented it, best support)** | AKS (solid, less baggage) |
| **Real-time NoSQL** | DynamoDB | Firestore or BigTable | Cosmos DB |
| **Startup on a budget** | EC2 spot + reserved instances | Cloud Run + Firestore | (more expensive) |
| **Enterprise Microsoft shop** | (painful) | (painful) | **Azure (native)** |
| **Global app with regions** | Route53 + regional ALBs (manual) | Cloud LB (automatic) | Traffic Manager (manual) |
| **Existing AWS investment** | **Stay on AWS** | (expensive to migrate) | (expensive to migrate) |

---

## Real-World Trade-Off Questions

### Question 1: "Cost vs. Simplicity"

**Scenario:** Build a small API for 10k users.

**AWS approach:** EC2 t3.micro + RDS (complexity, but you can optimize).
```
Cost: $50/month (or $32/month reserved)
Effort: Manage security groups, VPC, etc.
```

**GCP approach:** Cloud Run + Firestore (managed, simpler).
```
Cost: $20-50/month (depends on traffic)
Effort: Deploy container, forget about infrastructure
```

**Decision:** If you have 1 engineer and 10k users, GCP. If you have 5 engineers and 1M users, AWS (more control).

### Question 2: "Multi-Cloud"

**Scenario:** Run on both AWS and GCP for redundancy.

**Cost:** 2× everything (compute, storage, network).  
**Complexity:** Your deployment tooling must support both. Kubernetes helps (use same K8s setup on EKS + GKE). But managed services differ (DynamoDB vs. Firestore).

**Decision:** Multi-cloud is almost never worth it unless you're a huge company with risk tolerance. One cloud + backups is cheaper and simpler.

### Question 3: "When to Migrate Clouds"

**Almost never.** Migration costs ~10% of the infrastructure cost, loses engineer time, and cloud switching costs are high (lock-in via managed services, knowledge transfer).

**Only when:**
- Cloud A shuts down (rare)
- Cloud B is vastly cheaper for your specific workload (data analytics on GCP)
- You're acquired and the buyer standardizes on a different cloud (expensive, do it once)

---

## Interview Questions

=== "Foundation"
    **Q: You're building a startup with unpredictable traffic. AWS or GCP?**
    
    "GCP Cloud Run. It scales to zero (you don't pay when traffic is zero), charges per request (you only pay for what you use), and the pricing is transparent. AWS Lambda has similar benefits, but Cloud Run lets you deploy any Docker container, which is more flexible. AWS is more cost-effective if you have sustained, predictable traffic."

=== "Senior"
    **Q: Your AWS bill is $50k/month. How would you optimize it?**
    
    "First, I'd break down the bill by service (CloudWatch shows this). Common culprits: data transfer (egress is expensive), unused reserved instances, over-provisioned RDS, or expensive DynamoDB queries. Then: (1) Reserved instances for predictable compute, (2) Spot instances for batch/non-critical workloads, (3) S3 Intelligent-Tiering for storage, (4) Fix inefficient queries (DynamoDB scans are expensive), (5) Right-size instances (CloudWatch metrics show real utilization). Also consider if a competitor service is cheaper (Redshift vs. BigQuery, DynamoDB vs. Firestore). I'd run AWS Cost Anomaly Detection to flag unexpected spikes."

=== "Staff"
    **Q: Design a global system across AWS and GCP. How do you avoid multi-cloud complexity?**
    
    "I'd avoid true multi-cloud and instead run on one cloud (AWS) with GCP for a specific workload (data warehouse with BigQuery). For the main service: EKS (Kubernetes) + ALB on AWS, with regular backups to GCS (Google Cloud Storage). This gives me the best of both (AWS's breadth, GCP's data tools) without the complexity of every service on both clouds. Kubernetes abstracts most of the infrastructure layer, so if I ever need to move, the containerized workloads are portable. I'd use Terraform for both, even though it requires maintaining two separate state files. The key is: pick one primary cloud for everything, and use another cloud only for specific high-leverage services."

---

## Key Takeaways

!!! success "Remember"
    1. **AWS:** Broadest service catalog, mature, complex. Use if you want maximum options.
    2. **GCP:** Best for data/ML, simplest pricing, best Kubernetes. Use if doing analytics or prefer simplicity.
    3. **Azure:** Best for Windows/enterprise. Use if you already have Microsoft stack.
    4. **Pick one cloud and stay.** Migration is expensive; switching costs are high.
    5. **Managed services cost more but save operator time.** RDS vs. self-managed is 3× cost but 10× less toil.
    6. **Data transfer is expensive.** Keep data close to compute.
    7. **Reserved instances save 40-60%.** Use for predictable workloads.
    8. **Serverless (Lambda/Cloud Run) is pay-per-request.** Use for unpredictable traffic.
    9. **Kubernetes is portable; managed services lock you in.** Choose based on team expertise.
    10. **Don't multi-cloud for redundancy.** Use backups and failover instead.

**Previous:** [Cloud](index.md) | **Next:** [Docker](docker.md)
