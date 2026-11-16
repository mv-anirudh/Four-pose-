---
name: four-poses-design
description: Design review and polish loop for the Four Poses photo booth app. Use for any request to restyle, review, polish or "make unique" the UI. Adapts Anshu Chimala's "How to turn your AI into a world-class designer" (Lenny's Newsletter) to this project. Discover, define with a screenshot-only critic, then deliver by removal.
---

# Four Poses design

The fixed identity lives in CLAUDE.md (enamel green, curtain red, lamp amber, ivory plate; Bungee, Bricolage Grotesque, Caveat, Special Elite). Never leave it. Uniqueness comes from details only a 1960s photo booth has, not from new colours or fonts.

## 1. Discover

- Write the brief before touching code: the single job of the screen being changed, and 3 to 5 booth-world references it should borrow from (coin slot, instruction plate, delivery chute, lit sign, curtain, enamel seams, chrome trim, flash, price card, strip paper and its date stamp).
- When there is no clear direction, generate several high-level ideas with little detail, pick one, and say what you rejected and why.
- For variety, take a seed string from the shell (`openssl rand -hex 16` or `node -e "console.log(crypto.randomUUID())"`) and use it to choose between the candidate references. The string never appears in the UI.

## 2. Define: critic loop

The implementer can't judge its own work. Use a separate critic that sees screenshots only.

1. Start the dev server and capture screenshots. On Windows, use headless Edge (`msedge --headless=new --window-size=1440,1000 --screenshot=...`) with a desktop size and a 500px phone size. Headless Edge won't go narrower than 500px. Save the screenshots to the scratchpad.
2. Spawn a fresh critic subagent (largest model) and give it only the screenshot paths and the critic prompt below. Don't share code, history or the target score.
3. Apply the feedback, take new screenshots, and send them to a new critic with the same prompt.
4. Stop at a score of 9 or above, or after 2 rounds. Check convergence before spending more.

Critic prompt (keep identical across rounds):

> You are a design critic at a top product studio. Look at these screenshots of a web app. Name the aesthetic it is going for in one line. Imagine how the best studio in the world would execute exactly that aesthetic. List the biggest gaps between that and these screenshots, ranked, each with a concrete fix (what to change, where, and to what). Consider composition and fine detail. Penalise patterns that look AI-generated or overdone (gratuitous gradients, glows, everything in cards, emoji as decoration, uniform rounded corners, generic form sidebars). Be specific and opinionated. End with a score out of 10.

## 3. Deliver: subtract

- Most polish is removal. For each element, ask whether it earns its place. Remove containers, glows, gradients, borders and helper text that don't carry information.
- Keep one bold element (the lit sign). Everything else stays quiet.
- Prefer native controls over custom ones unless the booth metaphor needs the custom one.
- Respect CLAUDE.md: sentence-case copy, `prefers-reduced-motion`, no network calls with photos, strict TypeScript, tokens in `:root`.
- Finish with `npm run typecheck` and `npm run build`.

## Not used here

The article also suggests image and video generation through an external API. That needs a paid key and would add network calls, so only do it if the user supplies a key. Store it in a gitignored `.env.agents` and never ship it.
