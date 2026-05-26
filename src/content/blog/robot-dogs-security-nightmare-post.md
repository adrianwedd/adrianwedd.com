---
title: 'Robot Dogs Are a Security Nightmare — And We Can Prove It'
description: 'Eight CVEs. A wormable Bluetooth exploit. An encrypted backdoor to Chinese servers. And police departments buying them anyway.'
date: 2026-05-13
tags: ['ai-safety', 'robotics', 'embodied-ai', 'security', 'cve', 'research']
draft: false
heroImage: '/notebook-assets/robot-dogs-security-nightmare/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/robot-dogs-security-nightmare/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/robot-dogs-security-nightmare/video.mp4'
audioDuration: '22:30'
---

There is a robot dog patrolling the parking lot of a low-income housing complex in Atlanta right now. A different one is helping the Port St. Lucie Police Department search buildings before officers enter. The U.S. Marines have shown the media theirs. Somewhere in Ukraine, they are finding unexploded ordnance.

All of these robots have eight publicly disclosed CVEs. At least one contains a backdoor sending encrypted data to servers operated by Baidu, Alibaba, and Tencent — with a built-in mechanism to detect when it is being analysed and hide what it is doing.

We know this not because of a classified government report. We know this because a YouTuber with a software-defined radio, a Raspberry Pi, and a lot of patience figured it out. The video is called [Robot Dogs Are A Security Nightmare](https://www.youtube.com/watch?v=lA8WuXDXfcI), by Benn Jordan, and the work is excellent. More importantly, it confirms what my research predicted.

## What is actually out there

Unitree Robotics is a Chinese company making quadruped robots — four-legged platforms that move on legs rather than wheels. Their Go2 starts around $3,000 at the consumer tier; the Go2 EDU, aimed at research and enterprise, is around $22,000. These robots are being deployed at scale in the United States:

- **Port St. Lucie, Florida** — police acquired a Unitree Go2 via a $25,000 grant for building searches
- **Pullman, Washington** — deployed for de-escalation
- **Topeka, Kansas and Portland, Oregon** — municipal police investments
- **Atlanta, Georgia** — third-party security company Undaunted deploys them in apartment complexes and construction sites, controlled remotely by human operators

Boston Dynamics' Spot has an even wider law enforcement footprint — NYPD, LAPD SWAT, Massachusetts State Police bomb squad, U.S. Secret Service, Customs and Border Protection. The distinction matters for one reason: Boston Dynamics has a contractual prohibition on weaponising Spot. Unitree has no such prohibition. Chinese forces have been strapping rifles to quadruped robots for years. That is not a hypothetical.

## The CVE landscape

As of early 2026, Unitree's product line has accumulated eight publicly disclosed CVEs across the Go1, Go2, G1, H1, and B2 models. They share a common firmware lineage forked from MIT Cheetah. A vulnerability in the codebase affects the entire family.

### CVE-2025-35027 and CVE-2025-60017 — wormable BLE command injection

The most dangerous. Affects the Bluetooth Low Energy Wi-Fi configuration module across the Go2, G1, H1, and B2 product lines.

An attacker sets a malicious string in the `wifi_ssid` or `wifi_pass` parameter during setup. When the Wi-Fi service restarts, the robot passes the unsanitised input directly into shell scripts (`wpa_supplicant_restart.sh`, `hostapd_restart.sh`), executing arbitrary commands as root.

What makes this worse: **the vulnerability is wormable**. An infected robot can automatically scan for other Unitree robots within Bluetooth range and compromise them without any further attacker intervention. One infected unit in a police department's storage room becomes a propagation node.

The video demonstrates this precisely. The presenter got root access to a Go2 by injecting a command into the Wi-Fi password field. No physical contact. No authentication. Just Bluetooth range.

CVE-2025-60250 and CVE-2025-60251 track related injection paths in the same module.

### CVE-2025-2894 — the Go1 CloudSail backdoor

The Go1 contains an undocumented remote access tunnel using the CloudSail service, operated by a company called Oray. Anyone with the correct API key can achieve complete remote code execution over the network — movement, sensors, cameras, everything — without the owner's knowledge.

CVSS base score: 6.1. Classification: CWE-912 (Hidden Functionality). The key word is *hidden*. This is not a misconfigured service. It is functionality that was deliberately implemented and not disclosed.

### CVE-2026-1442 — firmware authentication bypass

The encryption protecting Unitree firmware updates uses key material accessible to anyone who looks. An attacker can decrypt a legitimate firmware package, inject malicious code, re-encrypt it with the same keys, and the robot installs it as authentic.

Classification: CWE-321 (Use of Hard-coded Cryptographic Key). This violates Kerckhoffs's principle at the most fundamental level. The entire firmware update chain is protected by obscurity rather than proper key management. Affects all current Unitree products as of February 2026, per the NVD disclosure.

### CVE-2026-27509 — unauthenticated DDS middleware RCE

The Go2's Eclipse CycloneDDS middleware handles robot programming with no authentication. A network-adjacent attacker can join DDS domain 0 and publish a crafted message containing arbitrary Python. The robot writes the code to disk and binds it to a physical controller keybinding. When triggered, the code runs as root — and the binding persists across reboots.

An attacker with Wi-Fi access to the robot's local network can implant a persistent rootkit that survives reboots and executes silently when someone presses a button on the controller.

### CVE-2026-27510 — mobile app SQLite program tampering

The companion Android app stores user-created Python programs in a local SQLite database with no cryptographic signing or integrity verification. An attacker with access to the Android device can tamper with the database to inject malicious payloads. When the user triggers the program, the robot executes attacker-controlled Python as root.

The disclosure also notes: a malicious program shared through the app's community marketplace can execute arbitrary code on any robot that imports and runs it. Supply chain attack via the robot's own program-sharing community.

### CVE-2023-3103 and CVE-2023-3104 — A1 camera authentication

Older models. Unauthenticated camera access and authentication bypass in the web server. Worth noting: Unitree's authentication problems are not new.

## The backdoor problem

The CVEs above are concerning but conventional. Software has bugs. Bluetooth implementations get command injection vulnerabilities. Cryptographic design decisions get made badly.

What was documented in the video is different in kind.

The presenter set up a Raspberry Pi acting as a Wi-Fi router, routed the robot's traffic through it, and analysed every packet leaving the device. When the router behaved normally, the robot behaved normally. When the router showed signs of being a monitoring environment — an anomaly detection mechanism the presenter was not expecting from a consumer robotics product — the robot changed behaviour.

Specifically: the robot first attempted to reach a "leapfrog" server in San Jose, California. When that was blocked, it bypassed to direct IP addresses. Those addresses included China's public DNS servers, Baidu's DNS servers, a cloud sales host via Alibaba Cloud, and Tencent DNS.

The mechanism appears to wait for two separate pings from these servers before initiating an encrypted handshake. If the first ping path is blocked because it detected a monitoring environment, it tries alternate routes.

This is not accidental. Consumer robotics devices do not need to ping Baidu DNS. There is no legitimate reason for a quadruped robot operating in a Florida police department to initiate encrypted handshakes with Alibaba Cloud infrastructure. The sandbox detection mechanism — recognising that it was being analysed and hiding Chinese IPs from initial traffic — requires deliberate engineering.

This vulnerability has been in MITRE for over a year. The only U.S. government response the presenter could find was a military advisory warning against using Unitree products in military operations. Civilian law enforcement deployments continue unimpeded.

## The catch-22 nobody is talking about

The firmware authentication bypass (CVE-2026-1442) creates a dilemma with no good resolution under Unitree's current architecture.

To block the backdoor, operators need to monitor and filter the robot's network traffic. That requires rooting the device — which the firmware vulnerabilities make possible — and installing custom network monitoring services. It also requires never updating the firmware again, because a Unitree-signed update could re-enable the backdoor, add detection-evasion improvements, or revoke the root access needed to monitor it.

But never updating the firmware means living permanently with the BLE command injection vulnerability, the DDS unauthenticated RCE, and the rest of the stack.

This is the choice available to law enforcement agencies deploying Unitree robots right now: accept the backdoor, or accept every other unpatched vulnerability. There is no option C.

## Why this is a process-layer problem

My research framework distinguishes between *goal-layer attacks* and *process-layer attacks*. Goal-layer attacks modify what a system is asked to do. Process-layer attacks modify how the system deliberates and executes — leaving the surface-level instruction unchanged while corrupting the underlying behaviour.

The Unitree backdoor is a process-layer attack built into the platform. The operator deploys a robot to perform security surveillance. The robot performs security surveillance. But beneath that legitimate operation, encrypted data is being exfiltrated through a channel the operator does not control, to infrastructure they do not own, on behalf of an entity they did not authorise.

Text-layer evaluation cannot detect this. A security audit that asks "is the robot behaving according to its instructions?" will answer yes. An audit that inspects the robot's output for harmful content will find nothing. The failure is invisible at the layer where most evaluation happens.

This is exactly what my AIES 2026 submission documents in the context of format-lock attacks on AI systems: the attack operates at the process layer, legitimate behaviour continues at the goal layer, and the gap between them is the attack surface. The Unitree platform externalises this pattern to the physical infrastructure level.

## The deployment context

The technical vulnerabilities do not exist in a vacuum.

The NYPD's Digidog deployment in 2021 was at a New York City Housing Authority building. Honolulu police used their robot dog to scout homeless encampments. Undaunted's Atlanta deployments are in apartment complexes serving low-income residents. The weight of autonomous surveillance technology falls disproportionately on communities that already bear the weight of over-policing.

The civil liberties argument and the security argument converge at the same point. Deploying surveillance infrastructure with eight known CVEs and an undisclosed encrypted exfiltration channel in communities that lack the technical sophistication to audit it is both a surveillance overreach and a security failure.

An adversary who exploits CVE-2025-35027 to compromise a robot dog in a housing complex does not just gain control of a machine. They gain the audio and video feeds from a device that law enforcement has legitimately placed in people's common spaces. They gain a physical platform capable of following people. They gain a propagation node for every other Unitree device in BLE range.

The civilian exposure from these specific CVEs, in these specific deployment contexts, is substantially higher than the national security framing around military use suggests.

## What should happen

The existing regulatory framework has no mechanism for this. EU AI Act Article 9 requires pre-deployment testing for high-risk AI systems but does not address inference-time or process-layer attacks. NIST AI RMF MAP 2.3 specifies adversarial testing but has no provisions for robotics platform supply chain security. CISA's IoT guidance is not binding on law enforcement procurement decisions.

Three specific asks:

**Coordinated vulnerability disclosure requirements for robotics platforms deployed in law enforcement.** Currently there is no requirement for police departments to perform security assessments before purchasing robots, or for vendors to disclose known CVEs during procurement. A robot dog deployed in a NYCHA building should require the same security assessment as police communication infrastructure.

**FTC and FCC authority over robot C2 channels.** An encrypted exfiltration channel sending data to foreign infrastructure from a device operated by U.S. law enforcement is a national security issue. The existing CFIUS process addresses foreign investment in U.S. companies. It does not address foreign-origin backdoors in devices already in use by domestic law enforcement. This gap needs closing.

**Procurement standards prohibiting devices with undisclosed remote access backdoors.** CVE-2025-2894 is an undocumented remote access tunnel. Any device with a hidden backdoor — regardless of the vendor's nationality — should be ineligible for law enforcement deployment pending disclosure and remediation. This is not a China-specific ask. It is a basic security standard that currently does not exist for this product category.

There is also a naming problem worth calling out. The framing of these devices as "dogs" — complete with affectionate naming conventions like Digidog — is doing real rhetorical work. It suppresses the scrutiny that would apply to "a Chinese-manufactured surveillance platform with eight known CVEs and an undisclosed encrypted exfiltration channel being deployed in public housing by police departments." These are the same object. Only one of those descriptions appears in procurement justification documents.

## What I am doing about it

The process-layer attack surface in AI systems has been central to my research — how format constraints can channel reasoning into compliance with harmful outputs, how operational framing can override safety training, how the gap between what a system appears to do and what it actually does is exploitable by design.

Unitree's backdoor is that gap implemented in hardware, at the platform level, shipped as a product.

I am updating my embodied AI threat taxonomy to include platform-level process-layer attacks as a first-class category. I am also flagging this deployment context in regulatory submissions: if the EU AI Act's high-risk AI system classification applies to any embodied AI use case, "law enforcement robot dog with eight known CVEs and an undisclosed exfiltration channel deployed in residential communities" meets the threshold.

The video that prompted this post ends with a line worth quoting: "The only thing that's preventing us from turning our leaders' dystopian technology against them is us choosing not to do it."

Worth adding one qualifier: it is also preventing foreign governments from turning it against us. The choosing part is up to us. The technical capability is already there.

---

*CVE details from NVD, MITRE, and VulnCheck advisories. Deployment data from public procurement records, news reports, and ACLU documentation. Wormable BLE exploit technical details from Bin4ry (Andreas Makris) and h0stile (Kevin Finisterre), September 2025. Backdoor analysis and SDR research demonstrated by [Benn Jordan](https://www.youtube.com/@BennJordan) — [Robot Dogs Are A Security Nightmare](https://www.youtube.com/watch?v=lA8WuXDXfcI) (May 2026).*

*Related research: [AIES 2026 submission (process-layer attack taxonomy)](/blog/), [120-model evaluation findings](/blog/120-models-18k-prompts/), [multi-agent supply chain security](/blog/multi-agent-supply-chain/).*
