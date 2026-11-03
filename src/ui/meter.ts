// Draws the two meters as sliders between two words, and the feeling curve.
// Animates through the meter history one point at a time so the up-then-down
// shape is visible.

import { markWord, meterMarks, type MeterState } from "../logic/meter";

const STEP_MS = 160;

export interface MeterView {
  render(m: MeterState): void;
  /** The words at each end of the two sliders: [[painful, easy], [pull, its opposite]]. */
  setLabels(labels: [[string, string], [string, string]]): void;
}

export function createMeterView(root: HTMLElement, reducedMotion: boolean): MeterView {
  const feelDot = root.querySelector<HTMLElement>(".dot.feeling")!;
  const pullDot = root.querySelector<HTMLElement>(".dot.pull")!;
  const bars = [...root.querySelectorAll<HTMLElement>(".bar")];
  const line = root.querySelector<SVGPolylineElement>(".curve-line")!;
  let labels: [[string, string], [string, string]] = [["Feeling bad", "Feeling good"], ["Want to hide", "Be with people"]];

  let shown = 0; // how many history points are drawn
  let timer: number | undefined;
  let latest: MeterState | null = null;

  function drawCurve(points: number[]) {
    const n = Math.max(points.length - 1, 1);
    // Higher on the curve is easier, matching the right-hand end of the feeling slider.
    line.setAttribute(
      "points",
      points.map((v, i) => `${((i / n) * 200).toFixed(1)},${(2 + (v / 100) * 56).toFixed(1)}`).join(" "),
    );
  }

  function describe(feeling: number, pull: number) {
    const say = (pos: number, [l, r]: [string, string]) => `${markWord(pos)}, between ${l} and ${r}`;
    bars[0]?.setAttribute("aria-label", say(feeling, labels[0]));
    bars[1]?.setAttribute("aria-label", say(pull, labels[1]));
  }

  function frame() {
    if (!latest) return;
    const h = latest.history;
    // A shorter history means the meter was reset (new game).
    if (shown > h.length) shown = 0;
    shown = reducedMotion ? h.length : Math.min(h.length, shown + 1);
    const current = shown === h.length ? latest.distress : h[shown - 1];
    const marks = meterMarks(current, latest.urge);
    feelDot.style.left = `${marks.feeling}%`;
    pullDot.style.left = `${marks.pull}%`;
    describe(marks.feeling, marks.pull);
    drawCurve(h.slice(0, shown));
    timer = shown < h.length ? window.setTimeout(frame, STEP_MS) : undefined;
  }

  return {
    render(m) {
      latest = m;
      if (timer === undefined) frame();
    },
    setLabels(next) {
      labels = next;
      bars.forEach((bar, i) => {
        const ends = bar.querySelectorAll<HTMLElement>(".ends span");
        ends[0].textContent = next[i][0];
        ends[1].textContent = next[i][1];
      });
      if (latest) describe(meterMarks(latest.distress, latest.urge).feeling, meterMarks(latest.distress, latest.urge).pull);
    },
  };
}
