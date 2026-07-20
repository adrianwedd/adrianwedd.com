---
title: 'The Gorgon Protocol'
description: 'Facial recognition fails unevenly, and hardest on the people it was never built for. That failure is a vulnerability you can put on your face.'
date: 2026-07-25
tags: ['surveillance', 'biopolitics', 'adversarial', 'autonomy', 'ai']
series: 'The Ungovernable Body: Essays'
seriesOrder: 3
---

A camera on a light pole does not see your face. It measures gradients.

That distinction is the whole argument. A face recogniser looks for places where light intensity changes in a predictable way: the eye socket darker than the cheek, the sharp edge at the eyebrow, the shadow under the nose, the strong line of the jaw against the background. From those it drops landmark points — the common scheme uses sixty-eight of them — and from the distances between those points it builds a vector. The vector is you. Everything after that is arithmetic.

So the question of how to be unreadable is not a question about hiding. It is a question about what happens to the arithmetic when the gradients lie.

## The system already fails, and it fails on a schedule

You do not have to invent the attack. It has been sitting in the government's own test data for years.

Recognition systems have measurably different error rates across demographics. They are most accurate on middle-aged white men, which is the group best represented in the images they were trained on. They get worse on women. They get worse on dark skin. And they get worse — considerably worse — on the elderly, because the elderly face is full of things the model treats as noise: wrinkles, which are curvilinear discontinuities cutting through landmark zones; loss of subcutaneous fat, which moves the landmarks themselves; skin that scatters light unevenly instead of smoothly.

For fifteen years this has been discussed as a fairness problem. The system fails on your grandmother, therefore we must fix the system so it succeeds on your grandmother. Collect more images of old women. Broaden the training set. Make the machine better at seeing the people it currently misses.

I want to be careful here, because that argument is not stupid and it is not made in bad faith. When recognition is used to unlock your phone or clear you through an airport, being invisible to it is a real harm. But look at what "fix it" means as a programme. It means completing the database. It means that the last populations still opaque to biometric governance get made legible, in the name of including them.

The highest measured error rates belong to dark-skinned women — around a third of attempts in the studies that made this famous, against under one per cent for white men. Age compounds it separately: the over-seventies fail to enrol at significantly elevated rates, for reasons of texture and structure rather than representation. An older woman sits where two of those failure modes meet. That is not only her deficit. It is also, right now, her cover.

## Ugliness as an excess of information

The Greeks put Medusa's severed head on shields, doors and city walls. The **Gorgoneion** — bulging eyes, tusks, protruding tongue — was not decoration. It was a security device. Apotropaic magic: an image so unbearable to look at that it turned the hostile gaze back on itself and stopped whoever carried it at the threshold.

The myth's mechanism is worth taking seriously as engineering. To look at the Gorgon is to be turned to stone: to stop being a subject and become an object, fixed, inert, filed away. That is a precise description of what the camera does to you. It takes something fluid and living and freezes it into a static record on a server. The gaze objectifies, and now the gaze is automated and there are thousands of it.

So put the head back on the shield. Present the machine with a face it cannot resolve into a vector, and the capture fails at the door.

The practical form of this is not a balaclava. It is makeup. Not the sleek geometric camouflage of the early anti-surveillance work — that was designed against a generation of detectors that has since been superseded, it reads as avant-garde fashion, and it has been absorbed by the fashion industry that it was meant to embarrass. Worse, it is loud. It announces that you are hiding something, which in a physical confrontation is the exact opposite of what you want.

What works instead is organic rather than geometric. Asymmetry, because faces are near-symmetrical and the model assumes it. Texture, because latex and stippling and simulated pigmentation turn smooth skin into high-frequency chaos, which breaks the liveness checks that look for the way light scatters through living tissue. Blocked-out eyebrows painted back on an inch higher, a technique borrowed straight from drag, because the eye-to-brow distance is a load-bearing measurement. False creases drawn across the landmark zones, so that the regression trees estimating where a mouth ought to be split the difference and land nowhere.

The reasoning is that this reads to a machine as noise, or as a mask, or as nothing at all — and that in a busy public system tuned to discard low-confidence detections rather than burn compute on them, being classified as a probable spoof is functionally the same as not being there.

That is a hypothesis, and it should be held as one. It follows from how the landmark detectors and liveness checks are documented to work, but it has not been tested against a deployed system, and nobody should walk into one assuming it holds.

The result reads to a human as an old woman who has done her makeup badly.

## Why the disguise has to be shameful

That last line is the part that matters, and it is why this is not just a trick.

Every glamorous evasion gets recuperated. Anything that looks cool becomes a look, becomes a product, becomes a signal, becomes — because signals are data — another classification the system can make about you. The subculture face paint that genuinely wrecks jawline detection also tells the watcher exactly which subculture you belong to. You have defeated individual identification and handed over group identification instead.

The hag face cannot be recuperated, because nobody wants it. It is not sold. It is not aspirational. It confers no status. It is what the culture has agreed is the thing a woman must spend money and labour her whole life to avoid becoming.

And that is precisely why it works twice over. It defeats the algorithm at the level of gradients, and it defeats the market at the level of desire. A surveillance economy is built to predict your behaviour so it can sell you something, and its most reliable product line is the promise that you will not age. It has nothing to sell a witch. The woman who has visibly stopped competing is a bad consumer, a low-value target, not worth the storage.

The refusal to optimise your appearance is a refusal of the aesthetic labour the economy demands. Doing it on purpose, as a twenty-year-old, is theft — you take the opacity that the culture inflicts on old women as punishment and wear it as armour.

There is a legal edge to it too, and it is sharper than it looks. Covering your face at a protest is illegal in a lot of places. Cosmetics are not. It is very hard to write a law against bad contouring. The defence is that you are wearing makeup, badly, in a style you like, and the state is left having to adjudicate ugliness — a category the law is not equipped to hold. It is deniability built out of a thing no one wants to be seen defending.

## What this is actually for

I want to be honest about the register. This is theory doing what theory does: taking a measured technical failure, an ancient piece of protective magic and a fashion tradition of the grotesque, and arguing they are the same manoeuvre. I am not claiming a field-tested evasion kit with a tested success rate against every deployed system. Specific techniques degrade fast; models get retrained; anything that works this year is a training example next year.

The durable claim is narrower and, I think, harder to argue with. Encryption protects your data after you have generated it. This protects you before you become data. And the strategy for doing that is not to be better represented in the machine's picture of the world. It is to be worse.

Stop asking to be seen properly. Take the failure mode and put it on your face.

The full chapter — the landmark mechanics, the specific protocols, the fashion theory and the sources behind all of it — is at [the research archive for The Ungovernable Body](https://ungovernable-body.wedd.au/research/).
