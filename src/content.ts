// All page copy lives here so it can be edited without touching components.

export const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#showcase", label: "Showcase" },
  { href: "#clients", label: "Clients" },
];

// Companies from marcolavielle.com/software. Rendered as text wordmarks
// until official logo files are added (see README).
export const clients = [
  "Qantas",
  "IAG",
  "Telstra Purple",
  "Service NSW",
  "Digital Transformation Agency",
  "ING",
  "Fairfax Media",
];

export interface ServicePillar {
  id: string;
  tag: string;
  title: string;
  summary: string;
  items: { name: string; detail: string }[];
}

export const servicePillars: ServicePillar[] = [
  {
    id: "implementation",
    tag: "Build",
    title: "AI implementation",
    summary:
      "We design, build and ship AI systems inside the stack you already run, and leave your team able to own them.",
    items: [
      {
        name: "Discovery and roadmap",
        detail:
          "Find the workflows where AI pays for itself, and rule out the ones where it will not.",
      },
      {
        name: "Knowledge systems and RAG",
        detail: "Assistants and search grounded in your own documents.",
      },
      {
        name: "Agents and workflow automation",
        detail: "Multi-step work handed to agents, with approval gates.",
      },
      {
        name: "MCP and enterprise integration",
        detail:
          "Model Context Protocol servers that connect models to your CMS, CRM and internal APIs.",
      },
      {
        name: "AI-assisted engineering",
        detail:
          "Coding agents set up for your repositories, review process and delivery pipeline.",
      },
    ],
  },
  {
    id: "security",
    tag: "Secure",
    title: "AI cyber security",
    summary:
      "We attack systems the way an adversary would, then help you close what we find before someone else finds it.",
    items: [
      {
        name: "AI security audit",
        detail:
          "A structured review of models, prompts, data flows and integrations, mapped to the OWASP Top 10 for LLM Applications.",
      },
      {
        name: "LLM red teaming",
        detail:
          "Prompt injection, jailbreaks and data exfiltration attempts against your live system.",
      },
      {
        name: "Threat modelling",
        detail:
          "Trust boundaries and abuse cases for agents and tools, worked out before you build.",
      },
      {
        name: "Secure architecture review",
        detail:
          "Least-privilege tool access, secrets handling, tenant isolation and audit logging.",
      },
      {
        name: "Guardrails and monitoring",
        detail:
          "Input and output controls with detection, so abuse shows up in an alert.",
      },
    ],
  },
];

export const capabilities = [
  {
    name: "Retrieval-augmented generation",
    short: "RAG",
    detail:
      "Answers grounded in your content: ingestion, chunking, hybrid search, reranking and citations, tested against real questions from your users.",
  },
  {
    name: "Model Context Protocol",
    short: "MCP",
    detail:
      "A standard way to give models tools. We build MCP servers for the systems you run, so one integration serves every model and agent.",
  },
  {
    name: "Agentic workflows",
    short: "Agents",
    detail:
      "Agents that plan, call tools and check their own work, scoped to a clear job and bounded by permissions and budgets.",
  },
  {
    name: "Evaluation",
    short: "Evals",
    detail:
      "Test suites for AI behaviour. Every prompt or model change is measured against known cases before it reaches production.",
  },
  {
    name: "Guardrails",
    short: "Guardrails",
    detail:
      "Validation on what goes into a model and what comes out: injection filtering, PII handling, schema checks and policy rules.",
  },
  {
    name: "Human in the loop",
    short: "HITL",
    detail:
      "Approval steps placed where judgement matters, so automation handles the volume and people keep the decisions.",
  },
  {
    name: "Observability",
    short: "Tracing",
    detail:
      "Traces for every model call and tool use, with cost, latency and quality tracked from day one.",
  },
  {
    name: "Model selection and routing",
    short: "Routing",
    detail:
      "The right model for each task. Small and fast where that is enough, frontier models where it is not, with no lock-in.",
  },
];

export const aemPipeline = [
  {
    step: "Brief",
    detail: "A marketer submits a campaign brief in plain language.",
  },
  {
    step: "Retrieve",
    detail: "RAG pulls brand guidelines, product data and past campaigns.",
  },
  {
    step: "Generate",
    detail: "An agent drafts copy, variants and metadata per locale.",
  },
  {
    step: "Author",
    detail:
      "Through an AEM MCP server it creates pages, content fragments and DAM assets.",
  },
  {
    step: "Check",
    detail:
      "Automated accessibility, brand and legal checks run on every page.",
  },
  {
    step: "Publish",
    detail: "An editor approves once. AEM workflow handles replication.",
  },
];

export type Severity = "Critical" | "High" | "Medium" | "Low";

export const auditFindings: {
  id: string;
  severity: Severity;
  title: string;
  category: string;
}[] = [
  {
    id: "ACS-01",
    severity: "Critical",
    title: "Indirect prompt injection through retrieved documents",
    category: "LLM01 Prompt Injection",
  },
  {
    id: "ACS-02",
    severity: "High",
    title: "Admin API reachable without authentication on a staging host",
    category: "A01 Broken Access Control",
  },
  {
    id: "ACS-03",
    severity: "High",
    title: "Agent tool token grants write access beyond its task",
    category: "LLM06 Excessive Agency",
  },
  {
    id: "ACS-04",
    severity: "Medium",
    title: "Customer PII stored in plain text prompt traces",
    category: "LLM02 Sensitive Information Disclosure",
  },
  {
    id: "ACS-05",
    severity: "Medium",
    title: "Dependency with a published CVE still in the production build",
    category: "A06 Vulnerable and Outdated Components",
  },
  {
    id: "ACS-06",
    severity: "Low",
    title: "Session cookie missing Secure and HttpOnly flags",
    category: "A05 Security Misconfiguration",
  },
];

export const processSteps = [
  {
    title: "Understand",
    detail:
      "We map the workflow, the data and the risks with the people who do the work.",
  },
  {
    title: "Ship a thin slice",
    detail:
      "A working version on real data, with evals in place so quality is measured.",
  },
  {
    title: "Harden and hand over",
    detail: "Security review and monitoring.",
  },
];

// Options for "I heard about Automated Coding Systems from …" in the contact form.
export const referralSources = [
  "a colleague",
  "LinkedIn",
  "search or an AI assistant",
  "a previous project",
  "a talk or event",
  "somewhere else",
];
