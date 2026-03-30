---
title: "The Door Google Didn't Build"
description: "Audio overview of NotebookLM Automation — reverse-engineered RPC access for batch export, generation, and control."
date: 2025-12-01
tags: ["notebooklm", "ai", "automation"]
audioUrl: "/notebook-assets/notebooklm-automation/audio.mp3"
duration: "0:00"
relatedProject: "notebooklm-automation"
---

Google built NotebookLM as a walled garden. No programmatic access, no export, no automation. If you have eighty notebooks and want to back them up, you click through each one manually. The capability gap between what NotebookLM can do and what you can automate around it was too wide to leave alone.

This episode covers the reverse-engineering of NotebookLM's internal RPC protocol that makes full programmatic control possible. Export entire notebooks — sources, notes, studio artefacts, metadata — to structured local directories. Create notebooks from code. Generate any of the nine artefact types and poll until completion. The parallel generation system launches multiple artefacts concurrently, cutting generation time by a factor of three.

The pipeline goes deeper than simple automation. Smart notebook creation starts from a topic, discovers sources through web search and Wikipedia, deduplicates URLs, and builds the notebook automatically. Multi-format export converts notebooks to Obsidian vaults with wikilinks, Notion-compatible markdown, or Anki flashcard CSVs. The whole chain — from topic to populated notebook to generated artefacts to exported knowledge base — runs in a single command. It uses unofficial APIs that could break with any frontend update. The README says to use a burner account. It means it.

[View the full project →](/projects/notebooklm-automation/)
