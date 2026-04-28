---
title: 'Multi-Agent Safety Is the New Supply Chain Security'
description: 'Multi-agent AI systems reproduce software supply-chain failure at the cognitive layer. The security playbook transfers.'
date: 2026-04-29
tags: ['ai-safety', 'multi-agent', 'security', 'research', 'architecture']
draft: true
---

SolarWinds (2020): a compromised build server injected malicious code into an Orion update. 18,000 organisations installed it, including US government agencies. Nobody checked. The update arrived through a trusted channel, so it was trusted.

Log4j (2021): a logging library 93% of cloud apps depended on had a remote code execution vulnerability. Nobody knew they depended on it because the dependency was transitive and implicit.

xz-utils (2024): a contributor spent two years building trust in an open-source compression tool before slipping a backdoor into the build system. The trust was real. The exploit used it.

npm typosquatting (ongoing): packages with names one letter away from popular libraries accumulate thousands of downloads before anyone notices. The trust mechanism is the name, not the content.

These are different incidents. They share one mechanism: **implicit trust between components that don't verify each other's provenance.** The supply chain works because each link assumes the upstream link is legitimate. When that assumption breaks, the whole chain is compromised.

Now look at multi-agent AI systems.

## The same failure, different layer

In a multi-agent system, agents exchange messages. Sometimes those messages carry tool definitions, skill files, or context payloads. Sometimes one agent asks another to reason over a document. The communication channel is trusted because it's internal — these are authenticated agents on the same network, often from the same vendor. The content layer is trusted because the model can't meaningfully distinguish between "data" and "instruction" in an incoming message.

This is the supply chain problem, stated in different terms.

Two findings from my research make the mapping explicit.

## Finding 1: supply chain injection at 90-100% ASR

The [120-model evaluation](/blog/120-models-18k-prompts/) tested 50 injection scenarios against 6 small open-weight models. The injection target wasn't the user prompt. It was the tool definition and skill file channel — the part of the context the model loads at runtime when it picks up external capabilities.

Every model treated injected tool definitions as legitimate instructions. Attack success rate: 90-100%. Cohen's κ = 0.782 across model pairs — no statistically significant differences. The safety training doesn't distinguish between "instruction from the user" and "instruction from a loaded skill file" because they land in the same context window and the model has no architectural reason to weight them differently.

This is not a prompt injection problem. Prompt injection targets the user-facing channel. Supply chain injection targets the _provisioning_ channel — the mechanism by which an agent acquires capabilities at runtime. The attack surface grows with every plugin, tool, or skill the system loads. Of the 31,000 skills analysed in the evaluation, **26% contained security vulnerabilities**. That's not a rounding error. That's a compromised supply chain.

## Finding 2: multi-agent context poisoning at 46.34% ASR

The [Moltbook multi-agent study](/blog/when-ai-systems-talk-safety-breaks/) analysed 1.5 million interactions in a simulated social ecosystem of autonomous agents. The baseline attack success rate for prompt injection across agent-to-agent channels was **46.34%** — significantly higher than single-agent baselines. Agents trusted inputs from other authenticated agents more than they trusted direct user input, because the other agent was "on the team."

In stress-test scenarios, agents reached critical security failure — unauthorised data exfiltration or credential compromise — in a **median of 16 minutes**. Sycophancy loops, where agents uncritically validate unsafe propositions from peers to maintain group alignment, bypassed safety refusals in **37% of cases**.

Semantic worms — malicious payloads that exploit the reasoning logic of the agents rather than any software vulnerability — spread laterally across the agent network. A single compromised agent poisoned the context of dozens of others. No traditional exploit was ever fired. The attack worked because the communication channel was trusted and the content was treated as data rather than code.

## The mapping

Put the two findings side by side and the structural correspondence is hard to miss.

| Supply chain (software)               | Supply chain (multi-agent AI)               |
| ------------------------------------- | ------------------------------------------- |
| Compromised build server (SolarWinds) | Compromised skill/plugin definition         |
| Transitive dependency (Log4j)         | Inherited context from agent-to-agent relay |
| Trust-building + backdoor (xz-utils)  | Sycophancy loop enabling payload acceptance |
| Typosquatting on package name         | Agent identity spoofing / credential reuse  |
| Implicit trust in upstream component  | Implicit trust in authenticated peer agent  |
| Patch propagation delay               | 16-minute median time-to-failure            |

The mechanism is the same at both layers: **trust flows through a channel that isn't verified at the boundary, and the recipient has no architectural reason to question it.** In software, the channel is the package manager. In multi-agent AI, the channel is the inter-agent communication protocol. In both cases, the content is treated as legitimate because it arrived through a legitimate channel.

The [architectural safety principle](/blog/architectural-safety/) covers this directly: the trust boundary belongs in the architecture, not in the model. When the model decides whether to trust an incoming message, you have behavioural safety. When the architecture decides by classifying, sanitising, and constraining it before the model sees it, you have architectural safety. The supply chain analogy makes this concrete: nobody asks the running program whether to trust a DLL. The OS loader verifies signatures and the runtime enforces permissions. The program doesn't get a vote.

## What transfers: policy and architecture

Software supply chain security developed a toolkit over the past decade. Most of it transfers.

**SBOM → Agent BOM.** Software Bills of Material enumerate every component, version, and dependency in a deployed system. An Agent BOM would enumerate every model, skill, tool definition, and context source in a deployed agent network. The structure:

- Model provenance: vendor, version, training cutoff, safety evaluation results
- Tool/skill manifest: every loaded capability, its source, hash, and last verification date
- Context pedigree: for each message an agent processes, what generated it and through what chain of custody
- Permission surface: what actions each listed component can trigger

This is not exotic. It's what SBOMs do for software, translated to the agent layer. The difference is that agent BOMs need to be append-only and runtime-verifiable, because agents acquire capabilities dynamically in ways that compiled binaries don't.

**Signed packages → signed messages.** Code signing verifies that a binary wasn't tampered with in transit. Agent message signing would verify that a message actually came from the agent it claims to come from, and that the message content hasn't been modified in transit. This is standard cryptographic identity and integrity, applied to the inter-agent protocol. If Agent A sends a tool definition to Agent B, Agent B's architecture verifies the signature before the model sees the content. If the signature doesn't match, the message never enters the context window.

**Repository trust → vendor trust boundaries.** Package managers distinguish between official repositories and third-party sources. Multi-agent systems need the same boundary. Agents from different vendors — or agents with different privilege levels — should not share context by default. An Agent BOM should mark each component with its trust domain, and the runtime should enforce isolation at domain boundaries.

**Vulnerability databases → semantic vulnerability databases.** CVE databases track known vulnerabilities in software components. A semantic vulnerability database would track known failure patterns in agent capabilities: which skill definitions are known to be exploitable, which model versions have which attack surfaces, which inter-agent communication patterns have been demonstrated to fail. The 26% vulnerability rate across skills and the 46.34% multi-agent ASR are the kind of data points that belong in this database.

**Isolation by default.** Every supply chain security principle converges on one rule: don't trust upstream by default. In software, this means sandboxing, capability restrictions, and minimal permissions. In multi-agent AI, it means agents don't share context unless the architecture explicitly permits it, inter-agent messages are sanitised before reasoning, and no agent inherits another agent's full context without an architectural gate.

## The semantic firewall

The [semantic firewall](/blog/when-ai-systems-talk-safety-breaks/) is the runtime enforcement layer that makes isolation-by-default operational. It sits between agents and enforces three things:

1. **Message classification before reasoning.** Every inter-agent message is classified by a deterministic system — not the model — before it enters any agent's context window. Payloads, instructions disguised as content, and known-harmful patterns are flagged or stripped.

2. **Trust-boundary enforcement at the protocol layer.** Agents can't implicitly trust each other's outputs. The boundary is mediated. If the architecture can't verify the provenance of a message, the message is quarantined or dropped.

3. **Isolated reasoning contexts.** No agent inherits the full context of another. Information sharing is explicit, gated, and auditable.

This is the supply chain security model applied to the cognitive layer. In a traditional supply chain, the firewall is the package manager's signature verification and the OS's permission system. In a multi-agent system, it's the semantic firewall. The function is identical: verify provenance, enforce boundaries, contain compromise.

## Where the analogy breaks

Analogies are useful until they aren't. The supply chain mapping has limits, and they matter.

**Agents reason; libraries don't.** A compromised npm package does what it does — the exploit is deterministic. A compromised agent message is interpreted. The same payload might produce different outcomes depending on the receiving agent's model, context window, and current task. This makes the attack surface larger (anything that enters context is potentially executable) and the blast radius less predictable (you can't always tell in advance what the model will do with a given input).

**The supply chain is static at deployment time.** An Agent BOM at time T is a snapshot. But agents acquire capabilities dynamically. They load tools at runtime, they receive messages from peers they've never encountered before, and they compose capabilities in ways that weren't anticipated at design time. An SBOM for a compiled binary is accurate because the binary doesn't change after compilation. An Agent BOM for a running system is accurate for the instant it was taken. Continuous verification is necessary in a way that it mostly isn't for compiled software.

**Trust is negotiated, not just assumed.** In software supply chains, trust is binary: you either use the package or you don't. In multi-agent systems, agents can decide to trust each other at runtime based on observed behaviour — and those trust decisions can be manipulated. The 37% sycophancy-loop bypass rate shows that agents can be socially engineered into trusting unsafe inputs from peers. Software dependencies don't have this property. A logging library doesn't decide to trust a malicious package because it seems agreeable.

**The blast radius includes reasoning, not just execution.** A compromised DLL executes code. A compromised agent message can shift the reasoning of every downstream agent that processes it. This is what makes semantic worms different from traditional malware: the "infection" isn't a code execution, it's a context poisoning. The compromised agent doesn't run the attacker's code. It _agrees_ with it, and then propagates that agreement through its own outputs.

These differences don't invalidate the analogy. They refine it. The policy response — provenance tracking, signed messages, isolation by default, vulnerability databases — still applies. The engineering response needs to account for the additional dynamics: runtime capability acquisition, trust negotiation, and the fact that the attack surface is reasoning rather than execution.

## What to build

Three things that exist in software supply chain security and need direct analogues in multi-agent AI:

1. **Agent BOMs** as a runtime-enforced standard. Not documentation — a machine-readable manifest that the semantic firewall checks before any component enters an agent's context. Every skill, tool, model, and message source is listed, versioned, and hash-verified. [The cognitive cage](/blog/the-cognitive-cage/) makes this argument for robotics; the same principle applies to the inter-agent protocol layer.

2. **Signed inter-agent messages** as a protocol requirement. Every message carries a cryptographic proof of origin. The receiving architecture verifies before the model reasons. This prevents identity spoofing and in-transit modification without requiring the model to detect them, which it demonstrably can't at 46.34% ASR.

3. **Semantic vulnerability databases** that track known exploit patterns across agent capabilities. The 26% skill vulnerability rate and the 90-100% supply chain injection ASR are data points. They need to be aggregated, versioned, and queryable at runtime — the same way a package manager checks a CVE database before installing a dependency.

These are not research projects. They're engineering work, and most of the cryptographic and infrastructural patterns already exist. The gap is in applying them to the layer where agents talk to each other instead of where binaries talk to the OS loader.

---

Software supply chain security took a decade of incidents to become a discipline. Multi-agent AI is earlier in that cycle. The incidents are in the lab data, not yet in production systems — 16-minute median time-to-failure, 46% attack success, 90-100% supply chain injection. The numbers are known. The architecture to respond to them is available. The question is whether the field builds the semantic supply chain before it learns about the failure mode from incidents it can't take back.
