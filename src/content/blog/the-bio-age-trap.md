---
title: 'The Bio-Age Trap'
description: 'Insurers are swapping your birthday for a biological age score. The markers it reads are gendered, so menopause gets priced as accelerated decay.'
date: 2026-07-22T12:00:00+10:00
autopublish: true
heroImage: '/notebook-assets/the-bio-age-trap/infographic.webp'
tags: ['biopolitics', 'insurance', 'algorithms', 'surveillance', 'ethics']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-bio-age-trap/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-bio-age-trap/video.mp4'
audioDuration: '21:25'
series: 'The Ungovernable Body: Essays'
seriesOrder: 2
relatedProject: 'ungovernable-body'
---

Your birth date has one great virtue as a number: nobody can argue with it. It is fixed, it is on a document, and it is the same for everyone born on the same day. For two centuries the insurance industry built its entire mathematics on that fact. Chronological age was a bad proxy for health and everyone knew it — a fifty-year-old smoker and a fifty-year-old marathon runner are not the same risk — but it was verifiable, immutable, and defensible in court.

That is now being replaced. Not by better medicine, but by a number the industry likes better: **biological age**. A score, computed from your body, that claims to say how old you _really_ are.

The pitch is meritocratic. Stop pricing people by crude demographic buckets. Measure the actual rate of decay. Reward the runner, charge the smoker, and while you're at it, drop the explicitly gendered pricing that regulators keep making noise about. One firm selling selfie-based underwriting says its technology avoids "unfair pricing practices like rating based on gender."

That claim is the trap. Removing the gender field from the form does not remove gender from the model. It just moves it somewhere nobody has to answer for.

## What the clocks actually measure

There are two families of these systems and both are already commercial.

The first reads your cells. Epigenetic clocks measure DNA methylation — chemical tags that accumulate on the genome over a lifetime — and the good ones predict mortality better than a birth date does. Reinsurers, the companies that set the terms primary insurers have to live by, are institutionalising them. When a Tier 1 reinsurer prefers a biological age model, everyone downstream adopts it to get favourable rates. This does not spread by consumer demand. It spreads by supply chain.

The second reads your face. Facial analytics firms estimate age, life expectancy, sometimes BMI, from a photograph — landmarks, wrinkle depth, skin texture, especially the skin at the corners of the eyes. It is frictionless, needs no blood draw, and scales to millions. From the insurer's side it is close to free. That is why it will win.

Both families share a design assumption that does not survive contact with actual human bodies: that ageing is one process, running at one kind of speed, that can be measured on one universal scale.

## Menopause as algorithmic accelerant

Here is the mechanism, stated plainly.

Oestrogen protects DNA integrity and damps inflammation. When ovarian production stops, that protection goes with it, and the markers these clocks are built on move sharply. Time since menopause is associated with accelerated epigenetic ageing. The clocks that measure the _pace_ of ageing — biological years accrued per calendar year — show the menopausal transition as a period of heightened velocity. The clocks tuned to inflammation flag post-menopausal women as inflamed in the absence of any disease.

So a normative hormonal event, experienced by half the population, registers in the model as decay running fast.

Now put that into an underwriting pipeline. The score arrives as a single number. It does not carry a reason. The algorithm has no way to distinguish ageing caused by smoking — behavioural, chosen, legitimately insurable — from ageing caused by ovarian cessation, which nobody chose and nobody can undo. Both come out the same end of the pipe as "decaying faster."

It gets worse at the edges. A woman who reaches menopause at 42 will, at 50, read as biologically older than a woman who reached it at 50, purely from the extra years of hormone deprivation. Under chronological underwriting those two women are identical: both fifty. Under bio-age underwriting one of them pays more for an event she had no say in.

And several of the underlying markers were calibrated on male physiology in the first place. Sex hormone binding globulin rises steadily with age in men, which makes it a tidy predictor; in women it is flat or falling. Feed it to a model as a universal feature — often precisely to avoid stratifying by sex, because stratifying by sex looks like bias — and you have built a system that miscalculates every woman it touches. The model learns linear decline because that is what male ageing mostly looks like. Female ageing is phasic. The model reads the phase change as pathology.

## The same problem, on the surface

Facial analysis fails the same way and more visibly.

Skin elasticity is a headline biomarker for these systems, and oestrogen drives collagen production. Menopause triggers a steep, non-linear collagen loss — roughly a third of it in the first five years. Morphometric studies of facial ageing find male and female faces following a common trajectory until about fifty, at which point the female trajectory turns sharply: soft tissue descent, jawline change, deepening folds.

A model trained to recognise gradual wrinkle accumulation, presented with a cliff, does not conclude "hormonal transition." It concludes acceleration. Age estimation models are measurably less accurate on female faces than male ones, and the specific feature they lean on hardest — crow's feet — punishes thinner skin.

Two people, both 55, both in equivalent cardiovascular health, stand in front of the scanner. His skin, kept thick by testosterone, scores him at 54. Hers, after the collagen drop, scores her at 59. If that number sets a life insurance premium, she is paying a tax on oestrogen withdrawal. The selfie has converted a cosmetic marker of reproductive ageing into a prediction of imminent death.

## Where the data comes from, and where it goes

None of this works without a supply of intimate longitudinal data, and that supply already exists. Cycle-tracking and fertility apps hold hundreds of millions of records of symptoms, cycle length, sexual activity, the onset of perimenopause. They are marketed as empowerment. Structurally they are extraction engines. One of the largest settled with the US regulator after being caught sharing sensitive health data with advertising platforms despite explicit privacy promises. Another, owned by a diagnostics giant, sells insight to employers and insurers as risk management. Brokers have been sued for selling location data that tracks women to reproductive health clinics.

The industry's answer is that all of it is de-identified. That is a legal position, not a technical one. Longitudinal reproductive data joined to location and purchasing history re-identifies trivially.

And the destination is no longer only insurance. Lenders scoring people with thin credit files are hungry for alternative data, and there is a real correlation between health and financial stability. It is a very short step from there to ingesting a resilience score as a proxy for reliability. Picture a 52-year-old applying for a business loan against a model that has bought a wellness index reading accelerated ageing and poor heart rate variability, and prices in a health shock within a decade. She gets a worse rate. Menopause has reduced her access to capital.

## Why the law does not catch it

Because bio-age sits in a gap that existing statutes were not drawn to cover. It is not chronological age, which is protected. It is often not diagnostic medicine, which is regulated. It is "wellness."

The US genetic non-discrimination statute has a hole in it long before you get to the technology: it governs health insurance and employment, and does not reach life, disability or long-term-care cover at all — which is precisely the underwriting this is used for. Even where it does apply, scholars argue epigenetic clocks likely fall outside it, since they read chemical modification of gene regulation rather than the genetic tests the statute defines. Facial analytics and wearable data are not genetic at all. Europe's AI Act classifies insurance pricing systems as high risk, which means paperwork and risk management, not prohibition — and its ban on biometric categorisation explicitly carves out age and gender. Meanwhile, if an insurer can show that bio-age genuinely predicts mortality in aggregate, and it does, then disparate impact on women may be defended as actuarially justified. The law has no working distinction between pricing risk accurately and penalising biology.

Nobody in this chain is a villain. That is the point. Each step is locally reasonable and the aggregate is a discrimination engine with no author.

## What refusing looks like

Privacy framing — hide the data — is not enough, because the data will be inferred from your face anyway. The useful positions are sharper.

Contest the calibration. A bio-age score that does not normalise for years since menopause is not a health measurement; it is a proxy for sex wearing a lab coat. Demand the gender-disaggregated error rates that none of these vendors publish. This is the facial-recognition accountability fight again, moved to underwriting.

And decline the wellness bribe. The premium discounts offered for streaming your vitals are not a discount. They are training data for the model that will eventually classify ordinary female ageing as uninsurable. The only winning move is not to feed the clock.

Bio-age is not a fact of nature. It is a construct, built by identifiable firms, for identifiable reasons. Constructs can be contested.

This is a compressed version of an argument I make at length, with the sources and the actuarial detail intact, in the research corpus behind _The Ungovernable Body_.

[Read the full chapter →](https://ungovernable-body.wedd.au/research/1-1-the-bio-age-trap-the/)
