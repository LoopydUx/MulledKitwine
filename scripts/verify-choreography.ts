/**
 * Checks the story choreography without a browser:  npm run verify:story
 * (Node 22.18+ runs TypeScript directly; choreography.ts has no imports.)
 *
 * The scene state is a pure function of progress, so sequencing, reversibility
 * and the recipe's safety order can be asserted exactly.
 */
import { CHAPTER_RANGES, computeState, DIM, SPICES, T, type StoryState } from '../src/scene/choreography.ts';

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const STEPS = 4000;
const at = (p: number): StoryState => computeState(1, p);
const samples: { p: number; s: StoryState }[] = [];
for (let i = 0; i <= STEPS; i++) samples.push({ p: i / STEPS, s: at(i / STEPS) });
const first = (test: (s: StoryState) => boolean): number => samples.find((x) => test(x.s))?.p ?? Infinity;
const last = (test: (s: StoryState) => boolean): number => [...samples].reverse().find((x) => test(x.s))?.p ?? -Infinity;
const fmt = (n: number): string => n.toFixed(3);

/* 1. deterministic and direction-independent */
{
  const forward = samples.map((x) => JSON.stringify(x.s));
  let same = true;
  for (let i = STEPS; i >= 0; i--) if (JSON.stringify(at(i / STEPS)) !== forward[i]) same = false;
  check('scrubbing backward reproduces every forward state', same);
  // jumping around must not leave anything behind either
  const order = [0.93, 0.1, 0.75, 0.3, 0.99, 0.02, 0.6, 0.44];
  check(
    'chapter jumps in any order reproduce the same states',
    order.every((p) => JSON.stringify(at(p)) === JSON.stringify(computeState(1, p))),
  );
  check('hero framing at intro 0 equals replayed state', JSON.stringify(computeState(0, 0)) === JSON.stringify(computeState(0, 0)));
}

/* 2. chapter one: closed box, lid opens, cork leaves before anything pours */
{
  check('box starts closed', at(0).lid === 0 && at(0).boxVisible);
  const lidOpen = first((s) => s.lid > 1.5);
  check('lid opens inside chapter one', lidOpen < CHAPTER_RANGES[0][1], `open by ${fmt(lidOpen)}`);
  const uncorked = first((s) => !s.corkInBottle);
  const pourStart = first((s) => s.streams.wine.on);
  check('bottle is uncorked before the wine pours', uncorked < pourStart, `uncork ${fmt(uncorked)} < pour ${fmt(pourStart)}`);
}

/* 3. chapter two: the whole bottle goes into the pan */
{
  const pourStart = first((s) => s.streams.wine.on);
  const pourEnd = last((s) => s.streams.wine.on);
  check('wine pours inside chapter two', pourStart >= CHAPTER_RANGES[1][0] && pourEnd <= CHAPTER_RANGES[1][1], `${fmt(pourStart)}..${fmt(pourEnd)}`);
  check('bottle is full before and empty after', at(0.19).bottleFill > 0.99 && at(0.34).bottleFill < 0.01);
  check('pan is empty before and filled after', !at(0.2).panHasWine && at(0.34).panHasWine && at(0.34).panSurfaceY > at(0.25).panSurfaceY);
  let monotonic = true;
  for (let i = 1; i < samples.length; i++) {
    const { p, s } = samples[i];
    if (p > 0.2 && p < 0.34 && s.bottleFill > samples[i - 1].s.bottleFill + 1e-9) monotonic = false;
  }
  check('bottle level only falls while pouring', monotonic);
}

/* 4. chapter three: every ingredient ends up in the pan */
{
  const s = at(0.499);
  const pan = s.pan.pos;
  const inPan = s.spices.every((sp) => sp.visible && Math.hypot(sp.pos[0] - pan[0], sp.pos[2] - pan[2]) < DIM.pan.ri && sp.pos[1] < pan[1] + DIM.pan.h);
  check(`all ${SPICES.length} pieces are inside the pan by the end of chapter three`, inPan);
  const kinds = new Set(SPICES.map((d) => d.kind));
  check('five ingredient kinds are present', kinds.size === 5, [...kinds].join(', '));
  check('nothing is in the pan before chapter three', at(0.35).spices.every((sp) => !sp.visible || Math.hypot(sp.pos[0] - at(0.35).pan.pos[0], sp.pos[2] - at(0.35).pan.pos[2]) > DIM.pan.ri));
}

/* 5. chapter four: low heat, light steam, never a boil */
{
  const heatOn = first((s) => s.heat > 0.05);
  check('heat comes on only in chapter four', heatOn >= CHAPTER_RANGES[3][0] && heatOn < CHAPTER_RANGES[3][1], fmt(heatOn));
  const maxSimmer = Math.max(...samples.map((x) => x.s.simmer));
  const maxHeat = Math.max(...samples.map((x) => x.s.heat));
  check('surface stays at a gentle simmer (no boil)', maxSimmer <= 1 && maxHeat <= 1, `simmer max ${maxSimmer.toFixed(2)}, heat max ${maxHeat.toFixed(2)}`);
  check('steam is present while heating', at(0.6).panSteam > 0.2);
}

/* 6. chapter five: heat OFF, then the mini bottle, then the rest */
{
  const heatOff = last((s) => s.heat > 0.02);
  const spiritStart = first((s) => s.streams.amber.on);
  const spiritEnd = last((s) => s.streams.amber.on);
  check('heat is fully off before the mini bottle pours', heatOff < spiritStart, `heat off ${fmt(heatOff)} < pour ${fmt(spiritStart)}`);
  check('mini bottle pours inside chapter five', spiritStart >= CHAPTER_RANGES[4][0] && spiritEnd <= CHAPTER_RANGES[4][1], `${fmt(spiritStart)}..${fmt(spiritEnd)}`);
  check('mini bottle is full before and empty after', at(0.72).miniFill > 0.99 && at(0.8).miniFill < 0.01);
  check('heat stays off for the rest of the story', samples.every((x) => x.p < heatOff + 1e-9 || x.s.heat <= 0.02));
  const strainStart = first((s) => s.streams.strain.on);
  check('rest cue finishes before straining starts', T.rest[1] <= strainStart && spiritEnd < T.rest[0] + 0.02, `rest ends ${fmt(T.rest[1])} < strain ${fmt(strainStart)}`);
}

/* 7. chapter six: strain through the sieve, solids stay behind */
{
  const strainStart = first((s) => s.streams.strain.on);
  const strainEnd = last((s) => s.streams.strain.on);
  check('straining happens inside chapter six', strainStart >= CHAPTER_RANGES[5][0] && strainEnd <= 1, `${fmt(strainStart)}..${fmt(strainEnd)}`);
  const mid = at((strainStart + strainEnd) / 2);
  const overGlass = Math.hypot(mid.sieve.pos[0] - mid.glass.pos[0], mid.sieve.pos[2] - mid.glass.pos[2]) < 0.1 && mid.sieve.pos[1] > mid.glass.pos[1] + DIM.glass.h;
  check('sieve sits above the glass while straining', overGlass && mid.glassVisible);
  check('filtered stream runs below the sieve while straining', mid.streams.filter.on && mid.streams.filter.start[1] < mid.sieve.pos[1] + 0.01);
  check('glass is empty before and filled after', at(0.89).glassFill < 0.01 && at(0.96).glassFill > 0.95);

  const after = at(0.95);
  let caught = 0;
  let escaped = 0;
  SPICES.forEach((d, i) => {
    const sp = after.spices[i];
    if (!sp.visible) return;
    const inSieve = Math.hypot(sp.pos[0] - after.sieve.pos[0], sp.pos[2] - after.sieve.pos[2]) < DIM.sieve.r && Math.abs(sp.pos[1] - after.sieve.pos[1]) < DIM.sieve.depth + 0.1;
    const inGlass = Math.hypot(sp.pos[0] - after.glass.pos[0], sp.pos[2] - after.glass.pos[2]) < 0.45 && sp.pos[1] < after.glass.pos[1] + DIM.glass.h && sp.pos[1] > after.glass.pos[1] + 0.9;
    if (d.sieve && inSieve) caught++;
    if (inGlass) escaped++;
  });
  check('solids are retained by the sieve', caught >= 3, `${caught} pieces resting in the sieve`);
  check('no solids reach the glass', escaped === 0);
  const end = at(1);
  const glassClear = end.spices.every((sp) => !sp.visible || Math.hypot(sp.pos[0] - end.glass.pos[0], sp.pos[2] - end.glass.pos[2]) > 0.6);
  check('finished glass is free of whole spices', glassClear && end.glassFill > 0.95 && end.glassSteam > 0.2);
}

/* 8. continuity: objects may move quickly, but nothing teleports */
{
  const points = (s: StoryState): number[][] => [
    s.bottleMouth,
    s.bottle.pos,
    s.miniMouth,
    s.cap.pos,
    s.pan.pos,
    s.glass.pos,
    s.sieve.pos,
    s.box.pos,
    s.booklet.pos,
    s.corkscrew.pos,
    s.orangeBag.pos,
    s.cinnamonBag.pos,
    s.station,
    s.spoon.tip,
    s.camera.target,
    ...s.spices.map((sp) => sp.pos),
  ];
  const dist = (a: number[], b: number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const SUB = 16;
  let jumps = 0;
  let worst = '';
  for (let i = 1; i < samples.length; i++) {
    const a = points(samples[i - 1].s);
    const b = points(samples[i].s);
    for (let k = 0; k < a.length; k++) {
      const d = dist(a[k], b[k]);
      if (d < 0.03) continue;
      // A continuous move splits into small sub-steps; a teleport keeps its full size in one of them.
      let prev = a[k];
      let largest = 0;
      for (let j = 1; j <= SUB; j++) {
        const next = points(at(samples[i - 1].p + (j / SUB) * (1 / STEPS)))[k];
        largest = Math.max(largest, dist(prev, next));
        prev = next;
      }
      if (largest > d * 0.5) {
        jumps++;
        worst = `point ${k} moves ${d.toFixed(3)} at p=${fmt(samples[i].p)}`;
      }
    }
  }
  check('no object teleports between neighbouring scroll positions', jumps === 0, worst);
}

console.log(failures === 0 ? '\nAll choreography checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
