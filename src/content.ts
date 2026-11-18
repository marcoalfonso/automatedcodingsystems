// All page copy lives here so it can be edited without touching components.

export const CONTACT_EMAIL = 'hello@automatedcodingsystems.com'

export const navLinks = [
  { href: '#services', label: 'Services' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#showcase', label: 'Showcase' },
  { href: '#clients', label: 'Clients' },
]

// Companies from marcolavielle.com/software. Rendered as text wordmarks
// until official logo files are added (see README).
export const clients = [
  'Qantas',
  'IAG',
  'Telstra Purple',
  'Service NSW',
  'Digital Transformation Agency',
  'ING',
  'Fairfax Media',
  'Lawpath',
]

export interface ServicePillar {
  id: string
  tag: string
  title: string
  summary: string
  items: { name: string; detail: string }[]
}

export const servicePillars: ServicePillar[] = [
  {
    id: 'implementation',
    tag: 'Build',
    title: 'AI implementation',
    summary:
      "AI features built into the software you already run. Your engineers work alongside us, so they can maintain it once we've gone.",
    items: [
      {
        name: 'Discovery and roadmap',
        detail:
          "We look at where AI would actually save time or money in your workflows, and tell you where it wouldn't.",
      },
      {
        name: 'Knowledge systems and RAG',
        detail:
          'Search and assistants that answer from your own documents and show where each answer came from.',
      },
      {
        name: 'Agents and workflow automation',
        detail:
          'Agents that handle multi-step tasks, with a person approving the steps that matter.',
      },
      {
        name: 'MCP and enterprise integration',
        detail:
          'MCP servers that let models work with your CMS, CRM and internal APIs.',
      },
      {
        name: 'AI-assisted engineering',
        detail:
          'Coding agents set up to work with your repositories, code review and CI.',
      },
    ],
  },
  {
    id: 'security',
    tag: 'Secure',
    title: 'AI cyber security',
    summary:
      'We review and test AI systems the way an attacker would, then work with your team on the fixes.',
    items: [
      {
        name: 'AI security audit',
        detail:
          'A review of models, prompts, data flows and integrations, mapped to the OWASP Top 10 for LLM Applications.',
      },
      {
        name: 'LLM red teaming',
        detail:
          'We try prompt injection, jailbreaks and data exfiltration against your running system.',
      },
      {
        name: 'Threat modelling',
        detail:
          'Working out trust boundaries and abuse cases for agents and tools before they get built.',
      },
      {
        name: 'Secure architecture review',
        detail:
          'Tool permissions, secrets handling, tenant isolation and audit logging.',
      },
      {
        name: 'Guardrails and monitoring',
        detail:
          'Input and output filtering, plus alerts when someone starts probing the system.',
      },
    ],
  },
]

export const capabilities = [
  {
    name: 'Retrieval-augmented generation',
    short: 'RAG',
    detail:
      'The model answers from your content rather than from memory. Most of the work is in ingestion, chunking and search quality, and in testing against questions your users actually ask.',
  },
  {
    name: 'Model Context Protocol',
    short: 'MCP',
    detail:
      'An open protocol for connecting models to tools and data. Write one MCP server for a system and any compatible model or agent can use it.',
  },
  {
    name: 'Agentic workflows',
    short: 'Agents',
    detail:
      'A model that plans, calls tools and checks its results. We give each one a defined job, limited permissions and a budget.',
  },
  {
    name: 'Evaluation',
    short: 'Evals',
    detail:
      'Automated tests for model behaviour. Prompt and model changes are run against them before they go to production.',
  },
  {
    name: 'Guardrails',
    short: 'Guardrails',
    detail:
      'Checks on what goes into the model and what comes out, such as injection filtering, PII handling and schema validation.',
  },
  {
    name: 'Human in the loop',
    short: 'HITL',
    detail:
      'Approval steps wherever a person needs to make the call. The automation handles the routine work around them.',
  },
  {
    name: 'Observability',
    short: 'Tracing',
    detail:
      'Tracing every model and tool call, so you can see cost, latency and output quality over time.',
  },
  {
    name: 'Model selection and routing',
    short: 'Routing',
    detail:
      "Smaller, cheaper models where they're good enough and larger ones where they aren't, without tying you to one vendor.",
  },
]

export const aemPipeline = [
  {
    step: 'Brief',
    detail: 'A marketer writes a campaign brief.',
  },
  {
    step: 'Retrieve',
    detail: 'Brand guidelines, product data and past campaigns are pulled in with retrieval.',
  },
  {
    step: 'Generate',
    detail: 'An agent drafts copy, variants and metadata for each locale.',
  },
  {
    step: 'Author',
    detail:
      'It creates the pages, content fragments and DAM assets through an AEM MCP server.',
  },
  {
    step: 'Check',
    detail: 'Every page goes through accessibility, brand and legal checks.',
  },
  {
    step: 'Publish',
    detail: 'An editor signs off and the AEM workflow publishes it.',
  },
]

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

export const auditFindings: {
  id: string
  severity: Severity
  title: string
  category: string
}[] = [
  {
    id: 'ACS-01',
    severity: 'Critical',
    title: 'Indirect prompt injection through retrieved documents',
    category: 'LLM01 Prompt Injection',
  },
  {
    id: 'ACS-02',
    severity: 'High',
    title: 'Agent tool token grants write access beyond its task',
    category: 'LLM06 Excessive Agency',
  },
  {
    id: 'ACS-03',
    severity: 'High',
    title: 'Customer PII stored in plain text prompt traces',
    category: 'LLM02 Sensitive Information Disclosure',
  },
  {
    id: 'ACS-04',
    severity: 'Medium',
    title: 'Model output rendered as HTML without sanitisation',
    category: 'LLM05 Improper Output Handling',
  },
  {
    id: 'ACS-05',
    severity: 'Medium',
    title: 'No per-user rate or spend limit on the chat endpoint',
    category: 'LLM10 Unbounded Consumption',
  },
  {
    id: 'ACS-06',
    severity: 'Low',
    title: 'System prompt recoverable through crafted queries',
    category: 'LLM07 System Prompt Leakage',
  },
]

export const processSteps = [
  {
    title: 'Scoping',
    detail:
      'We sit with the people who do the work today, look at the data and the risks, and write up a plan with a fixed scope.',
  },
  {
    title: 'First version',
    detail:
      'A working version on real data within a few weeks. Evals go in at the start so we can measure quality as we go.',
  },
  {
    title: 'Handover',
    detail:
      "Security review, monitoring and documentation, then your team takes it over. We're still around while they get comfortable with it.",
  },
]

export const interests = [
  'AI implementation',
  'AI cyber security',
  'Both',
  'Not sure yet',
]
