---
title: 'I Tried to Build the Most Profitable Privacy-Compliant Monster in Australia'
description: 'Most of the obvious loopholes died under scrutiny. What survived was a respectable company with a very long memory.'
date: 2026-09-06
tags: ['privacy', 'systems-thinking', 'policy', 'AI']
draft: false
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/privacy-compliant-monster/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/privacy-compliant-monster/video.mp4'
audioDuration: '23:32'
---

_I went looking for loopholes in Australia's proposed privacy reforms. Most of the obvious ones died under scrutiny. What survived was stranger: the law can regulate each use of your data while still struggling to see the power of the profile built from all of it._

**Read the full submission:** [PDF](/downloads/privacy-reform-2026-submission.pdf) · [Markdown](/downloads/privacy-reform-2026-submission.md). I submitted this response to the Attorney-General's Department consultation on 6 September 2026. This post concerns the 2026 exposure draft, not enacted law.

I expected to hate this Bill.

Not because I'd read it yet. Because I have spent enough time around large systems, government IT and commercial incentives to know that “modernising privacy law” can mean almost anything once fifty pages of definitions, exceptions and cross-references get involved.

So I did what any normal person does: I turned an Attorney-General's Department consultation into an adversarial research programme.

The question was:

**If I had a lot of money, millions of customers, excellent lawyers and absolutely no intention of breaking the law, how much informational power could I accumulate under it?**

We called the exercise Moloch.

The fictional company sold groceries, electricity and subscriptions. It had an app, a loyalty programme and an interest in what customers might buy next. Ordinary commercial motives, given an extremely generous engineering budget.

Moloch did not lie to users. It did not hide consent boxes, create sham subsidiaries, obstruct access requests or assume the regulator was asleep. Its services had to be real. Its compliance had to survive the strongest reading we could make of the proposed law.

Then we tried to pull it apart.

That last step matters. These were constructed scenarios, not observations about an actual company or guarantees about what a court would decide. The exercise was useful precisely because an exciting theory could fail.

Most did.

The Bill really does strengthen privacy. Its proposed fair-and-reasonable test applies across collection, use and disclosure, subject to specified exceptions. Consent does not magically make objectively unfair handling fair. The language on derived sensitive information and sensitive proxies catches more than a database column labelled “religion”. De-identification depends on what an entity can actually reconnect. Trading personal information gets a new consent gate within the rule's scope.

Those improvements killed several of our favourite horrors.

What survived was a more interesting story:

**Australia is building a stronger general privacy rule while moving several hard boundaries inside a balancing test that companies themselves apply first.**

## A balancing test is not the same thing as a boundary

Think of replacing several circuit breakers with one very sophisticated breaker.

The new device can recognise dangers the old ones missed. But you have also removed independent ways of stopping the circuit. You need to know what the new device measures, when it is bypassed, and what evidence exists that somebody configured it properly.

That is roughly the design problem I ended up seeing around Australian Privacy Principle 3: APP 3, for the rest of this piece. It is being asked to carry a lot of weight.

Take purpose limitation.

You give an electricity retailer information to bill you for electricity. Later, the company wants to use that information to develop a household profile for an unrelated subscription business.

Current law has a separate question about using information for a secondary purpose. Consent and statutory exceptions can permit it; an expected, related use can qualify too. The original purpose is a legal boundary with specified ways through.

The draft repeals APP 6, which contains that rule. One factor in the replacement fairness assessment asks whether the handling relates to the entity's functions or activities.

Those are different reference points. Electricity billing is why the information arrived. Selling subscriptions is something the company also does.

**APP 3 might still prohibit the reuse.** Reasonable expectations, alternatives, choice and harm still matter. “This is our business model” is not a winning legal argument. The new test may even prohibit handling that current law permits with consent.

But a factor that can be weighed alongside others does not preserve an independent condition.

For a person challenging the reuse, that means losing a distinct ground of challenge and having to contest the overall fairness assessment instead. You cannot rely on that purpose boundary alone.

Companies already make the first operational decision under privacy law. The change is how much of that decision becomes an overall judgment, and which separate grounds remain available to challenge it.

There is also a small, very concrete drafting problem here. The consultation paper says sensitive information collected because it is strictly necessary to deliver requested goods or services can subsequently be used or disclosed only for that delivery. The clauses state a collection condition. They do not enact that subsequent-purpose restriction.

Sometimes the amendment really can begin with: please put the promised sentence into the law.

## Sometimes the big fairness test disappears

This was the provision that made me stop scrolling.

APP 3.3 switches off the fair-and-reasonable requirement for specified handling: where Australian law or a court or tribunal order requires or authorises it; where a permitted general situation applies; and, for organisations, where a permitted health situation applies.

All seven considerations in the fairness assessment then lose their independent operation under that assessment. That includes using less information and treating a child's best interests as a primary consideration.

**A child's best interests are a primary consideration right up until the fairness requirement to which that consideration belongs no longer applies.**

That is a statement about this provision, not about every law protecting children. Lawfulness remains required. Other privacy duties and sectoral protections can still operate. The exception gateways have substantive conditions of their own, including necessity and reasonable-belief requirements where specified.

The Department has a strong answer: emergencies, suspected wrongdoing and legally compelled handling should not wait for a second, general balancing exercise. An enabling law may already have settled the question.

I agree. But there can still be choices about how much information to take, how to obtain it, and what avoidable intrusion to impose. Current law separately requires fair collection means even alongside sensitive-collection exceptions. The replacement does not preserve that independent requirement here.

The question is what safeguards should remain wherever they are compatible with the exception. Protecting somebody from a serious threat need not mean ignoring every discretionary choice made along the way.

## The law sees acts better than accumulated power

Here is the part that stayed with me after the clause comparisons.

A company knows where to deliver your shopping. It knows what you bought. You browse its app, use another service, return next month. Each interaction has a purpose and can be assessed.

Then time does its work:

**Location + purchases + browsing + device behaviour + years.**

What started as separate records becomes the capacity to recognise routines, predict preferences and decide which offers to put in front of you.

That capacity is the asset.

The obvious objection is correct: APP 3 can already address combination risks. Adding an apparently ordinary data point to a revealing profile can create harm arising from that act. The fairness test is not legally blind to the rest of the database.

Nor is holding information unregulated. Security, retention, access and the proposed platform erasure right all matter. Moloch could not simply declare a permanent need to keep everything.

The narrower problem is that no fairness factor expressly asks about the nature, volume and range of what the company already holds, or how the next act changes its ability to analyse, predict or influence you.

That leaves accumulation as something a person or regulator may have to argue into the assessment, rather than something the Act expressly requires the entity to confront.

If the Department's answer is that accumulated holdings already matter, good. Put that in the list. It should be easy to identify the missing analysis when a compliance file discusses the next purchase and says nothing about the profile behind it.

Models add another layer.

A company uses personal information to learn patterns across a population. That training use remains regulated. The resulting model, depending on its contents and context, may no longer itself be personal information. Later, the company applies the model using information about an identifiable customer. That use is regulated again.

**The file is regulated. The next use is regulated. The capability created between them is much harder to point at.**

Calling something a model does not settle its legal status. A model that identifies people, or contains information that relates to reasonably identifiable people, cannot escape through a filename. Nor does a model acquire permanent immunity because its training was lawful.

But a genuinely non-identifying population model is a different object from a personal record. Destroying your record need not destroy a general rule learned from many people's records. The learned capability can survive even after the individual's record is gone.

I do not think the answer is to declare every statistical model personal information. I want the assessment of a proposed use to confront what the system can do with the information, given everything else it has learned and holds.

There is a smaller example of this mismatch in marketing.

Suppose you opt out. The draft's communications rule reaches personalised advertisements on the company's own site, including targeting you as a member of a class. We tested that supposed escape and it failed.

But your purchase history could still be used to help construct an audience for other people, or measure a campaign, without sending you a message. Those uses remain subject to APP 3. The communications opt-out does not itself settle them.

Current law has a qualified right to stop use or disclosure facilitating other organisations' direct marketing. The replacement does not repeat it. Extending an objection to marketing use, including related profiling, would give the person a control over that machinery too.

“Don't send me the ad” and “don't use me to build the audience” are different requests.

## Public does not mean you chose to publish it

The draft creates an exception to sensitive-information collection consent where the information is collected from a publicly available document.

That category does not tell you who put it there.

A relative posts about your diagnosis. A public document records sensitive history you had no meaningful choice about exposing. An abusive former partner publishes intimate information about you.

These are examples of involuntary exposure, not claims that collecting any particular example would be lawful. The point is that the consent exception itself does not distinguish them from your own deliberate publication.

**Availability and consent are not synonyms.**

This exception does **not** switch off APP 3 fairness. That distinction matters: public-source sensitive collection still has to pass the general test unless some separate exception applies. Our attempt to turn it into permission for indiscriminate sensitive-data scraping did not survive.

Nevertheless, an independent consent gate has been removed on the basis of availability alone.

Public registers, journalism, research and scrutiny of public conduct need workable routes. Those are reasons to preserve justified public-interest exceptions. They do not make every involuntary disclosure equivalent to choosing publication.

There is an unresolved question about sensitive information derived from public material, too. The timing rules for intended and incidental derivation interact awkwardly with the public-document exception. I asked for clarification rather than building the argument on the most alarming interpretation.

We had already killed enough attractive theories to recognise another candidate.

## What happened to Moloch?

Moloch lost more battles than it won.

It could not simply call linkable data anonymous. Keeping the keys that reconnect it to customers was a particularly bad basis for that argument.

It could not assume consent cured unfair handling. Its personalised onsite ads were still marketing communications. Its processor arrangements did not give its own independent purposes the protection of somebody else's instructions.

The cross-sector enrichment theories narrowed. The public-source inference strategy failed our hostile reading. The new duty to identify held personal information substantially undercut the access-refusal strategy, although it does not guarantee access in every case.

Moloch was not most powerful where the Bill was weakest. It was most powerful where perfectly lawful acts compounded into capability.

The monster that survived looked like a respectable first-party company with a very long memory.

Even that sentence needs its limit: this was a model of defensible accumulation, not proof that every large profile is fair or that the Bill makes previously unlawful accumulation lawful. Several of its proposed uses had already been thrown out.

The surviving concern was the distance between assessing the next act and expressly assessing the power of the system that performs it.

That is less cinematic than a giant loophole. It is also a much better reason to amend a Bill.

## Six things I asked for

I ended up making six requests because the Bill's central idea deserves supporting machinery that works:

1. **Keep an enforceable purpose boundary.** Preserve independent purpose and necessity conditions alongside fairness, and enact the paper's promised limit for requested-service sensitive collection.
2. **Keep compatible safeguards inside exceptions.** Preserve fair collection means, minimisation and children's interests wherever compatible with the exception, with records for consequential ongoing reliance.
3. **Make high-risk judgments leave evidence.** Require proportionate written assessments before defined high-risk operations, and reassessment after material changes. Existing governance duties matter; they do not expressly supply that requirement. Investigators should not have to reconstruct reasoning that nobody recorded.
4. **Name the accumulated profile.** Add a factor addressing existing holdings and the change in predictive or influencing capacity. Clarify contextual relatedness when class information is applied to an identifiable person, without declaring every model personal information.
5. **Let people object to marketing use.** Restore the facilitation control, extend the objection to related profiling and audience construction, and retain a separate consent gate for sensitive marketing uses.
6. **Distinguish publication from exposure.** Confine the public-source consent exception to deliberate self-publication, preserve justified public-interest routes, and resolve the derivation question.

The [full submission PDF](/downloads/privacy-reform-2026-submission.pdf) gives the provisions, qualifications and drafting requests. It contains considerably fewer fictional monsters and considerably more subsection numbers.

Flexible law is useful because technology changes. But flexibility moves power toward whoever gets to exercise the judgment first.

If that is the design, the judgment needs boundaries, records, and an obligation to look at the informational power already accumulated, not just the next apparently harmless data point.

That was the thing I didn't understand when I started reading this Bill.

It is also, I think, the thing Parliament most needs to get right.
