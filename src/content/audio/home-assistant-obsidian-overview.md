---
title: 'Two Systems That Shape How You Think, One Box'
description: 'Audio overview of Home Assistant Obsidian — your knowledge base and smart home on the same machine.'
date: 2024-06-01
tags: ['notebooklm', 'homelab', 'home-assistant', 'docker']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/home-assistant-obsidian/audio.mp3'
duration: '15:06'
relatedProject: 'home-assistant-obsidian'
---

Obsidian for knowledge. Home Assistant for the physical environment. Two systems that shape how you think, running on separate machines with separate maintenance windows and separate failure modes. The obvious question was why.

This episode covers a Home Assistant add-on that puts Obsidian inside a Docker container with seamless Ingress integration. Auto-backup, multi-architecture support across AMD64, ARM64, and ARMv7, one-touch installation from the add-on marketplace. The result is a knowledge management system that lives alongside your smart home infrastructure — same box, same UI, same backup schedule.

The design constraint was security: no privileged containers, no elevated permissions, no attack surface expansion to get a note-taking app running on your home network. Idle resource usage sits at 350-450MB RAM and under five percent CPU — light enough to disappear into the background of a Raspberry Pi. Sometimes the best integration is simply putting two things that belong together in the same place.

[View the full project →](/projects/home-assistant-obsidian/)
