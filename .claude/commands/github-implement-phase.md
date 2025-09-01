---
description: Fetch all GitHub issues for a given phase, and then implement, lint, test, and commit them one by one.
argument-hint: milestone [milestone]
---

Complete all of the work in the given milestone. Use the below todo list as a starting point for achieving this goal.

*explore*: read the relevant project files, including our overall plan in PLAN.md and the initial product requirements document in the PDF. fetch the open github issues from the repo for this milestone: '$ARGUMENTS'. If the given milestone doesn't include the word 'Phase', such as with '8.3', then prepend 'Phase ' to the milestone, so it is in the form 'Phase 8.3'. Use the gh commands as defined in CLAUDE.md. to access GitHub issues.
*plan*: make a step by step plan for each issue in this milestone. 
*code*: implement each of the issues in this phase, based on the plan and according to the product requirements. Review the issues to determine the correct order of execution. If some issues will depend on a fix or solution for others, then work on the precursor tasks first. If the correct order is unclear, work on them in order of simplest to most complex, or in order of lowest to highest issue ID.
*test*: run lint and tests and fix issues. try to fix up to 5 errors at a time before re-running the test. if you are unable to fix a test error after several attempts, skip that test case and try to fix the others. use .skip() when possible to skip tests, rather than commenting out the test code. Tell me which test cases or test suites you skipped.
*test run*: run the app yourself and check for any errors that are output from the app. If there are runtime errors, fix them before proceeding. Use the command defined in CLAUDE.md to run the app.
*human verification*: ask me to run the app myself and test it after each issue is resolved. if I say it isn't working, debug and fix the problem using the error info I provide, following the same *code*, *test*, and *test run* steps as needed. ask me to test the app again after fixing the problem. proceed to the steps below once you have resolved all issues and I confirm that all issues are resolved.
*close issues*: if I have confirmed everything is working successfully, update the status to closed for the GitHub issues that were just implemented. Use the gh commands as defined in CLAUDE.md to close the issues. Include a brief note in the issue closure comment about what was done to resolve the issue.
*commit*: commit the changes to the local git repo. include a comment that lists all of the changes that were made. if you fixed all of the issues for a milestone, then mention in the commit message which phase of work in our plan was completed. Also mention if any failing unit tests were skipped.
