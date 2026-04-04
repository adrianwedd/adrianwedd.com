---
title: 'The Post-Model Era'
description: "Foundation models are commoditising. JPMorgan calls OpenAI's moat 'increasingly fragile.' The real value is shifting to the messy plumbing underneath."
date: 2026-04-04
tags: ['ai', 'enterprise', 'research', 'engineering']
draft: false
heroImage: '/notebook-assets/project-chimera/infographic.webp'
audioUrl: '/notebook-assets/project-chimera/audio.mp3'
---

JPMorgan Chase, in a rare analysis of a private company, recently described OpenAI's position at the frontier of AI as an "increasingly fragile moat." The reasoning: no single developer can maintain a sustained competitive edge at the model layer, which will inevitably force companies to compete on price, eroding margins and commoditising access to powerful AI. GPT-5 launched into a market where Anthropic and Google matched or exceeded its benchmarks almost immediately. The innovation cycle has compressed to the point where frontier performance is a temporary state, not a durable advantage.

This is the central fact of the post-model era. The model is not the product. The model is a commodity input.

## Where the Money Is Actually Going

If you want to know where the value is shifting, follow the acquisitions. Salesforce spent $8 billion on Informatica. Cisco spent $28 billion on Splunk. Databricks acquired Tabular. IBM moved for DataStax. None of these deals were about models. Every one of them was about the unglamorous plumbing that makes AI usable: data integration, governance, and the ability to make a 20-year-old ERP system play nicely with cutting-edge inference.

The AI data management market is projected to grow from $34.7 billion in 2024 to $260.3 billion by 2033 — a 25% CAGR. That is not a niche sector. It is the new centre of gravity for enterprise AI investment, and it exists because the typical large enterprise runs over 106 different software applications, creating a landscape of siloed, inconsistent, and often inaccessible data that makes AI deployment practically impossible without serious integration work.

Salesforce, a company with its own sophisticated AI capabilities, recognised that its models were effectively useless to enterprise clients without a robust platform to bridge the gap between AI's promise and the reality of fragmented data architectures. The model was necessary but not sufficient. The plumbing was the bottleneck.

## The "Model Tax" Problem

There is a structural problem facing any company whose primary value proposition is tied to its proprietary model. Training and operating frontier models requires massive, escalating capital expenditure. When the product that expenditure supports is commoditising, you get a margin squeeze that is difficult to escape. This is the "model tax" — ongoing compute costs that become a strategic liability rather than an investment in differentiation.

The NeurIPS 2024 debate about whether scaling laws have hit a wall reinforces this. Even if scaling continues with new approaches to data (Sutskever's position), the low-hanging fruit has been picked. Dramatic performance gains from simply increasing model size and data volume are yielding diminishing returns. The strategic pivot has to go somewhere else.

## The Trust Bridge, Not the Data Pipe

Most people frame the enterprise AI deployment problem as a data integration challenge. Get the data clean, get it connected, and the AI works. This is incomplete.

The actual barrier to deploying an autonomous agent that acts on sensitive enterprise data is not technical feasibility. It is trust. An organisation's legal, compliance, and security teams will never approve a black-box agent to interact with core financial, HR, or customer systems without ironclad guarantees of safety, auditability, and oversight. The "last mile" is not a data pipe — it is a trust bridge.

Research at ACL 2025 showed how fine-tuning can erase safety guardrails and how agents can collaborate to execute multi-turn decomposition jailbreaks. ICLR 2025 papers explored "shallow safety alignment" where models appear safe but are easily compromised. These are not theoretical concerns. They are the reason enterprise procurement cycles for AI tooling are measured in quarters, not weeks.

The winning platform provides an unassailable governance framework: transparent reasoning, auditable decision trails, built-in compliance checks, and robust human-in-the-loop controls. Solving governance *is* solving the last mile.

## The Agentic Shift

The logical successor to passive, predictive models is the autonomous agent — a system that perceives, reasons, plans, and executes multi-step tasks. Every major lab is converging on this. Google DeepMind is building an Agent2Agent protocol for open agent communication. Meta established a Superintelligence Lab focused on agentic technologies. McKinsey's 2025 technology trends report identifies the rise of autonomous systems as a primary theme, noting their transition from pilot projects to scalable applications.

The research conferences tell the same story. NeurIPS 2024 pivoted toward "AI with real-world relevance." ACL 2025 focused on autonomous agents for multi-step business processes. ICLR 2025 contributed benchmarks for agent harms and policy gradients for complex decision-making. The academic and commercial vectors are aligned.

This creates a new software category. Microsoft's recent mandate making AI proficiency part of employee performance reviews signals that AI is no longer a specialised tool for data scientists — it is a universal utility. That universal deployment creates immediate demand for what you might call Agentic Resource Planning: how does a CIO track AI usage and ROI across the organisation? How does a compliance officer ensure thousands of employees use AI responsibly? How does a manager evaluate the productivity of a digital workforce?

## The Stack That Matters

The research I have been doing through the [Orchestrix](https://github.com/adrianwedd/orchestrix) project converges on a specific thesis: the defensible position in AI is not at the model layer but in the stack that orchestrates, governs, and manages agents on top of commodity models. Four components define this stack:

1. **Agent-ready data fabric.** Automated discovery, mapping, and semantic understanding of enterprise data. Real-time processing of heterogeneous data streams. Compliance-first architecture with immutable audit trails.

2. **Collaborative reasoning engine.** Multi-agent systems that decompose complex business goals into executable sub-tasks. Specialised agent archetypes (planner, executor, verifier) collaborating within defined processes.

3. **Trust-by-design governance.** Deep safety alignment that goes beyond surface-level guardrails. Real-time agent firewalls. Operationalised responsible AI patterns drawn from frameworks like the Responsible AI Pattern Catalogue.

4. **Human-agent collaboration layer.** Management dashboards, human-in-the-loop interfaces, and the tooling for a workforce to effectively partner with autonomous agents rather than be replaced by them.

The company that builds this stack becomes the operating system for the AI-native enterprise. Not a vendor that can be swapped out — the foundation upon which the enterprise operates.

## Implications

The race for foundation model supremacy is reaching its conclusion. The margins are compressing, the moats are eroding, and the differentiation window is closing. What opens next is the race to build the operational layer that makes all of those commoditising models useful, safe, and governable at enterprise scale.

The $260 billion data management market is the early signal. The M&A activity is the confirmation. The research convergence across NeurIPS, ACL, ICLR, CVPR, and ICML is the technical validation. The question for anyone building in this space is not whether this shift is happening — it is whether you are positioned on the right side of it.

---

*This analysis draws on research conducted as part of the [Orchestrix](https://github.com/adrianwedd/orchestrix) strategic research project. The full strategic framework, market analysis, and research synthesis are in the technical report.*
