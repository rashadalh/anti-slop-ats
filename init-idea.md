Goal: Detect if a job application was filled out by an auto apply system
Some examples:
https://tsenta.com/
https://aiapply.co/ 
JobCopilot
LoopCV
LazyApply
Sonara
Massive, AIApply, Tsenta, FastApply, Resumly, ApplyFly, OpenRole, Appliqu, JobHire.AI, Fapply, Ace, AutoApplier, AutoApplyMax, Simplify, Teal, Huntr, Jobright, Jobscan, Careerflow


Inputs (what can we use to detect it?)
IP (fingerprint)
Cadence jumping between parts of the app
Em dash, AI’isms on questions answered
Speed (overall time spent)
Buzzword heavy application
Presence of placeholder texts left behind

Outputs:
1 if A.I. apply, 0 if human apply.
Can we return a confidence score (probability) to build our classifier?
Natural language reasoning


Open Questions
How does this integrate with the website and ATS
What is the best (most common) ATS we should integrate with (or do we need to at all for the demo?)
Do we care about a human manually filling out, but using A.I. to help think thru answers? (decision)
Can we integrate jev?
https://typesafe.ai/blog/introducing-system-one-models-and-jev
https://huggingface.co/convaiinnovations/laya



