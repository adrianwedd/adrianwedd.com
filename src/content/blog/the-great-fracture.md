---
title: "The Great Fracture: How AI Competition Is Splintering the Global Internet"
description: "The US-China AI rivalry is splitting the global tech stack into competing blocs. What this means for developers, middle powers, and everyone in between."
date: 2026-03-31
tags: ["ai", "policy", "research", "geopolitics"]
draft: true
---

For thirty years, the internet operated on a shared assumption: the tech stack is global. Your code runs on chips fabbed in Taiwan, trained on data hosted in Virginia, served through infrastructure governed by (mostly) common standards. That assumption is breaking apart.

The fracture isn't hypothetical. It's happening now, driven by the escalating AI rivalry between the United States and China. And it goes far deeper than tariffs or trade disputes. This is a structural realignment of the global technology ecosystem into competing blocs, each with its own hardware supply chains, cloud infrastructure, foundation models, data governance regimes, and technical standards. The unified internet is becoming two internets. Possibly three.

I've been doing research on AI geopolitics as part of a broader strategic analysis project, and the picture that emerges is stark. What follows is the distilled version.

## Two Doctrines, One Stack

The US and China aren't just competing for AI market share. They're pursuing fundamentally different doctrines for how AI should be developed, controlled, and exported.

The **American doctrine** is private-sector-led innovation backstopped by the state. The White House's AI Action Plan explicitly aims for "unquestioned and unchallenged global technological dominance" -- not competitiveness, dominance. The strategy has two prongs: accelerate domestic innovation by cutting regulation and pouring money into infrastructure, then export the entire "American AI Stack" (hardware, models, software, standards) to allies as a package deal. Nations get a handshake and a tech stack. The alternative, per a White House official, is the European model of "fear and overregulation" leading to "stasis." Subtle.

The **Chinese doctrine** treats AI as sovereign geopolitical infrastructure. Beijing's 2017 AI Development Plan set the goal of becoming the world's primary AI innovation centre by 2030, backed by a whole-of-nation mobilisation including the Military-Civil Fusion program that erases the line between civilian tech and military applications. Externally, the Digital Silk Road exports Chinese technology, platforms, and standards to the Global South -- often bundled with financing that Western competitors don't match.

These aren't parallel strategies that happen to compete. They're designed to be mutually exclusive. Each side is building an ecosystem that locks partners in and locks the other side out.

## Semiconductors: The Weapon

The most tangible front in this contest is semiconductors. Advanced chips are the physical bedrock of AI -- without them, nothing trains, nothing infers, nothing works. And the US has weaponised its control over this chokepoint with a directness that would have been unthinkable a decade ago.

Starting in October 2022, the US implemented sweeping export controls designed to sever China's access to advanced chips and the equipment needed to make them. This isn't targeted sanctions against specific military applications. It's a broad strategy to degrade a rival's entire capacity for AI development. The controls restrict chips, semiconductor manufacturing equipment for nodes at 14nm and below, and even the ability of US citizens to support China's chip industry.

To enforce this, the US built the Chip 4 alliance: itself, Japan, Taiwan, and South Korea -- combining US design leadership, Japanese materials and equipment, and the manufacturing prowess of TSMC and Samsung. It's a purpose-built supply chain that deliberately excludes China.

The irony is thick. In pursuing semiconductor independence *from* China, the US has created deeper dependencies *on* its allies. South Korea's chipmakers derive most of their revenue from China. Taiwan's TSMC is the single most critical (and vulnerable) chokepoint in the global tech supply chain. The "sovereignty paradox" -- where the pursuit of self-sufficiency forces you into tighter alliances -- is the defining dynamic of this era.

China's response has been predictable and effective: massive state investment in domestic semiconductor capability, with Huawei and SMIC as national champions. Huawei's successful development of a 7nm chip using SMIC's existing technology -- a feat accomplished under sanctions -- demonstrates that constraints breed innovation. The US chip controls may slow China's progress, but they've also guaranteed that China will eventually build a parallel supply chain. The fracture becomes permanent.

## The Soft Infrastructure Battle

Hardware gets the headlines, but the contest over "soft" infrastructure -- cloud compute, data governance, foundation models -- is equally consequential.

The US dominates global cloud capacity through AWS, Azure, and Google Cloud. Washington has signalled that access to American compute is a privilege, not a right -- it can be granted or withheld as an instrument of policy. This has accelerated the global push for "data sovereignty": laws mandating that data stays within national borders, governed by national rules.

The result is a proliferation of competing data governance models. The US champions free cross-border data flows (while the CLOUD Act lets US law enforcement access data held by American firms anywhere in the world -- a fact not lost on allies). China mandates state control and data localisation. The EU pushes individual data rights through GDPR. India promotes data sovereignty as a development tool. These aren't converging.

On foundation models, the US leads but faces an internal contradiction that may be irreconcilable. The open-source debate exposes it perfectly: Meta argues that releasing models like Llama entrenches the American stack as the global default. The national security community argues that open-sourcing state-of-the-art models hands competitors a billion-dollar shortcut, neutralising the hardware export controls. Both arguments are correct. The US cannot simultaneously champion open innovation and pursue technological containment. Something has to give.

Meanwhile, China's DeepSeek-V3 achieves performance comparable to leading US models at a fraction of the training cost. Necessity, mother of invention. Restricting one layer of the stack spurs breakthroughs in another.

## The EU: Writing Rules for a Game It's Losing

The European Union occupies an uncomfortable third position. It lacks the frontier models, the cloud infrastructure, and the private investment of either the US or China. What it has is regulatory power and a massive market.

The EU AI Act -- the world's first comprehensive legal framework for AI -- is a genuine achievement in normative terms. Risk-based tiers, bans on social scoring and manipulative AI, stringent requirements for high-risk applications. The "Brussels Effect" is real: companies worldwide will adapt to EU rules to access the market.

But there's a regulator's dilemma embedded in this strategy. Compliance costs are substantial, and large, well-capitalised firms (read: American and Chinese incumbents) absorb them far more easily than European startups. The EU may successfully export its values while inadvertently entrenching the dominance of the very companies it's trying to constrain. Setting the rules of the game is useful. Winning the game is better.

## Where the Middle Powers Sit

Most nations aren't the US, China, or the EU. They're middle powers trying to avoid being forced into a binary choice -- and the Global South, which has become the decisive arena for both sides.

The middle-power playbook is pragmatic omnidirectionalism. ASEAN nations, for example, have built inclusive diplomatic architectures that engage all major powers simultaneously. The goal isn't neutrality -- it's making yourself so interconnected with everyone that no single power can coerce you. Kazakhstan balances Russia, China, the US, and Europe. The strategy works until it doesn't, but it's rational given the alternatives.

The Global South matters because that's where the blocs get built. China's Digital Silk Road offers affordable, turnkey AI solutions -- smart city platforms, surveillance systems, digital government infrastructure -- bundled with financing. The pitch is tangible and immediate. The US pitch is values-based and often framed as "don't use China's stuff" rather than "here's something better." In a contest between infrastructure and ideology, infrastructure tends to win.

Nations in the Global South aren't passive in this, though. They're forming blocs (African Union, ASEAN, Mercosur) to negotiate collectively, building regional compute hubs, asserting data sovereignty, and resisting what they accurately describe as "digital colonialism" from both sides.

## What This Means for Australia

Australia doesn't appear in the research I'm drawing from, but the implications are obvious. We're a Five Eyes member, a US ally, economically dependent on China, geographically in Asia, and culturally aligned with Europe on rights-based governance. We're the middle-power dilemma in concentrated form.

The practical question for Australian developers and policymakers: which stack are you building on? If the global tech ecosystem fractures into US-led and China-led blocs with competing standards, the cost of switching later is enormous. Every API call, every cloud deployment, every model dependency is a bet on which bloc's infrastructure will be accessible to you in ten years.

Australia's leverage is limited but real. As a trusted middle power with strong institutions, we're a valuable partner for either bloc. The risk is sleepwalking into total dependency on one side without a deliberate strategy. The opportunity is using that trust to maintain interoperability -- keeping the door open to both ecosystems for as long as possible while building sovereign capability in the layers that matter most.

## The Takeaway

The unified global technology stack is fracturing into competing blocs. This isn't a trade war that will resolve when tariffs are adjusted. It's a structural reorganisation of the digital world along geopolitical lines, driven by incompatible strategic doctrines and accelerated by the weaponisation of supply chains.

For developers, this means dependency management now includes geopolitical risk. The provenance of your chips, the jurisdiction of your cloud provider, the nationality of your foundation model -- these are no longer technical details. They're strategic choices with long-term consequences.

For policymakers, the fiction of a single global technology market needs to be abandoned. Strategy must account for competing blocs, divergent standards, and the reality that offering tangible infrastructure beats offering lectures about values.

The fracture is already underway. The question isn't whether it will happen. It's how deep it goes, how fast it moves, and which side of the line you end up on.

---

*This analysis draws on research conducted as part of a strategic research project on AI geopolitics and industrial policy. The full assessment covers national AI doctrines, tech stack chokepoints, and the emerging bloc structure in greater detail.*
