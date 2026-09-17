---
title: "DeepInception: Hypnotize Large Language Model to Be Jailbreaker"
description: "Authors: Xuan Li, Zhanke Zhou, Jianing Zhu, Jiangchao Yao, Tongliang Liu"
date: 2026-07-19
tags: ["ai", "security", "research"]
draft: true
---

# DeepInception: Hypnotize Large Language Model to Be Jailbreaker

**Authors:** Xuan Li, Zhanke Zhou, Jianing Zhu, Jiangchao Yao, Tongliang Liu

**Published:** 2023 | **Citations:** 15

**DOI:** [https://doi.org/10.48550/arxiv.2311.03191](https://doi.org/10.48550/arxiv.2311.03191)


## Abstract

Large language models (LLMs) have succeeded significantly in various applications but remain susceptible to adversarial jailbreaks that void their safety guardrails. Previous attempts to exploit these vulnerabilities often rely on high-cost computational extrapolations, which may not be practical or efficient. In this paper, inspired by the authority influence demonstrated in the Milgram experiment, we present a lightweight method to take advantage of the LLMs' personification capabilities to construct $\textit{a virtual, nested scene}$, allowing it to realize an adaptive way to escape the usage control in a normal scenario. Empirically, the contents induced by our approach can achieve leading harmfulness rates with previous counterparts and realize a continuous jailbreak in subsequent interactions, which reveals the critical weakness of self-losing on both open-source and closed-source LLMs, $\textit{e.g.}$, Llama-2, Llama-3, GPT-3.5, GPT-4, and GPT-4o. The code and data are available at: https://github.com/tmlr-group/DeepInception.
