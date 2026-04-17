---
title: 'Home Assistant Obsidian'
description: 'Obsidian inside Home Assistant — your knowledge base and your smart home on the same box, same backup, same UI.'
tags: ['homelab', 'home-assistant', 'docker', 'python']
repo: 'https://github.com/adrianwedd/home-assistant-obsidian'
status: 'active'
featured: false
date: 2024-06-01
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/home-assistant-obsidian/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/home-assistant-obsidian/video.mp4'
heroImage: '/notebook-assets/home-assistant-obsidian/infographic.webp'
---

I keep two systems running at home that shape how I think: Obsidian for knowledge, Home Assistant for the physical environment. They existed on separate machines, with separate maintenance windows, separate failure modes. The obvious question was why.

This add-on puts Obsidian inside a Docker container with seamless Home Assistant Ingress integration. Auto-backup. Multi-architecture support across AMD64, ARM64, and ARMv7. One-touch installation from the add-on marketplace. The result is a knowledge management system that lives alongside your smart home infrastructure—same box, same UI, same backup schedule.

The design constraint was security: no privileged containers, no elevated permissions, no attack surface expansion to get a note-taking app running on your home network. Idle resource usage sits at 350–450MB RAM and under five percent CPU—light enough that it disappears into the background of a Raspberry Pi.

Two systems that shape how you think should live in the same place.
