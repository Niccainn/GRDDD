// GRID pitch deck builder.
//
// Visual language mirrors the marketing site exactly:
//   - Near-black background (#08080C)
//   - Extralight typography
//   - Brand teal-green (#15AD70) as the dominant accent
//   - Secondary accents: blue #7193ED, purple #BF9FF1, yellow #F7C700, red #FF6B6B
//   - Glass cards rendered as dark rounded rectangles with hairline borders
//
// Everything is built natively in pptxgenjs — no raster screenshots —
// so the deck scales cleanly and the UI mocks match the site pixel-for-pixel
// in terms of palette and structure.

const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.3 × 7.5 inches
pres.author = 'Nicole';
pres.company = 'GRID Systems Inc.';
pres.title = 'GRID — Pre-seed Pitch';
pres.subject = 'Agentic Work OS';

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:        '08080C',
  bgCard:    '101018',
  bgCardAlt: '14141E',
  border:    '1F1F2A',
  borderSoft:'181822',
  text1:     'FFFFFF',
  text2:     'A0A0B0',
  text3:     '60606A',
  text4:     '40404A',
  brand:     '15AD70',
  brandDim:  '0F7A4F',
  blue:      '7193ED',
  purple:    'BF9FF1',
  yellow:    'F7C700',
  red:       'FF6B6B',
};

// ── Fonts ──────────────────────────────────────────────────────────────────
const F = {
  display: 'Helvetica Neue',
  body:    'Helvetica Neue',
  mono:    'Menlo',
};

// ── Layout helpers ─────────────────────────────────────────────────────────
const W = 13.3;
const H = 7.5;
const MARGIN_X = 0.7;
const CONTENT_W = W - MARGIN_X * 2;

function baseSlide() {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  return s;
}

// Draw a "glass" card: subtle fill + hairline border, slightly rounded.
function card(slide, x, y, w, h, { fill = C.bgCard, border = C.border, radius = 0.08 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: border, width: 0.75 },
    rectRadius: radius,
  });
}

// Small caps eyebrow label — used on nearly every slide.
function eyebrow(slide, text, x, y, color = C.text3) {
  slide.addText(text, {
    x, y, w: 8, h: 0.3,
    fontFace: F.body, fontSize: 9, color, charSpacing: 4,
    bold: false, margin: 0,
  });
}

// Page number / footer strap bottom-right.
function footer(slide, pageNum, total) {
  slide.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 0.48, w: CONTENT_W, h: 0,
    line: { color: C.borderSoft, width: 0.5 },
  });
  slide.addText('GRID', {
    x: MARGIN_X, y: H - 0.42, w: 2, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3,
    margin: 0,
  });
  slide.addText(`${pageNum} / ${total}`, {
    x: W - MARGIN_X - 2, y: H - 0.42, w: 2, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, align: 'right',
    margin: 0,
  });
  slide.addText('Pre-seed — 2026', {
    x: W / 2 - 2, y: H - 0.42, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, align: 'center', charSpacing: 2,
    margin: 0,
  });
}

// GRID logo mark
function gridLogo(slide, x, y, size = 0.55, color = C.brand) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: size * 0.79, h: size,
    fill: { color: C.bg }, line: { color, width: 1.25 },
    rectRadius: 0.06,
  });
  const innerH = size * 0.86;
  const line1X = x + size * 0.27;
  const line2X = x + size * 0.52;
  slide.addShape(pres.shapes.LINE, {
    x: line1X, y: y + 0.02, w: 0, h: innerH,
    line: { color, width: 1.25 },
  });
  slide.addShape(pres.shapes.LINE, {
    x: line2X, y: y + 0.02, w: 0, h: innerH,
    line: { color, width: 1.25 },
  });
}

const TOTAL = 15;

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();

  // Ambient gradient disks
  s.addShape(pres.shapes.OVAL, {
    x: 2, y: -4, w: 10, h: 8,
    fill: { color: C.brand, transparency: 94 },
    line: { color: C.bg, width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: -3, y: 4, w: 7, h: 6,
    fill: { color: C.blue, transparency: 95 },
    line: { color: C.bg, width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: 8, y: 4.5, w: 6, h: 5,
    fill: { color: C.purple, transparency: 95 },
    line: { color: C.bg, width: 0 },
  });

  // Top-left logo
  gridLogo(s, 0.7, 0.55, 0.5);
  s.addText('GRID', {
    x: 1.2, y: 0.57, w: 2, h: 0.4,
    fontFace: F.body, fontSize: 11, color: C.text2, charSpacing: 5, margin: 0,
  });

  // Top-right meta
  s.addText('PRE-SEED  ·  2026', {
    x: W - 4, y: 0.6, w: 3.3, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.text3, align: 'right', charSpacing: 3, margin: 0,
  });

  // Eyebrow
  s.addText('THE STRUCTURE LAYER FOR AI-NATIVE WORK', {
    x: MARGIN_X, y: 2.35, w: CONTENT_W, h: 0.35,
    fontFace: F.body, fontSize: 10, color: C.brand, charSpacing: 5, align: 'center', margin: 0,
  });

  s.addText('One person.', {
    x: MARGIN_X, y: 2.75, w: CONTENT_W, h: 0.95,
    fontFace: F.display, fontSize: 60, color: C.text1, align: 'center',
    bold: false, margin: 0,
  });
  s.addText('The output of an entire team.', {
    x: MARGIN_X, y: 3.65, w: CONTENT_W, h: 0.95,
    fontFace: F.display, fontSize: 60, color: C.brand, align: 'center',
    bold: false, margin: 0,
  });

  s.addText(
    'GRID is the operating system for organizational intelligence — \nadaptive environments, self-correcting workflows, and an AI that reasons across everything.',
    {
      x: MARGIN_X + 1.5, y: 4.9, w: CONTENT_W - 3, h: 0.9,
      fontFace: F.body, fontSize: 14, color: C.text2, align: 'center',
      margin: 0,
    }
  );

  // Bottom strap
  s.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 0.85, w: CONTENT_W, h: 0,
    line: { color: C.borderSoft, width: 0.5 },
  });
  s.addText('Nicole Cain  ·  Founder  ·  Systems Designer', {
    x: MARGIN_X, y: H - 0.72, w: 5, h: 0.3,
    fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
  });
  s.addText('$500K target  ·  $750K hard cap', {
    x: W - MARGIN_X - 4, y: H - 0.72, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 10, color: C.brand, align: 'right', margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 2 — The Problem: Problem Proximity
// Three layers: Meta-cognition gap, Trusted relations, Problem selection
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'PROBLEM PROXIMITY', MARGIN_X, 0.6, C.red);

  s.addText('The gap isn\'t tools. It\'s cognition.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 32, color: C.text1, bold: false, margin: 0,
  });

  s.addText(
    'Humans can\'t hold the full picture of their business. AI can\'t understand the context it\'s operating in. The gap between them — the meta-cognition layer — is where $600K+ per organization disappears every year. Not into bad tools. Into the space between insight and action.',
    {
      x: MARGIN_X, y: 1.9, w: CONTENT_W * 0.78, h: 1.1,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // ── Three problem layers ────────────────────────────────────────────────
  const layers = [
    {
      n: '01',
      tag: 'THE META-COGNITION GAP',
      color: C.red,
      title: 'Neither side can see the whole.',
      body: 'Humans process signals too slowly — 62% of PM time is synthesizing status across tools. AI generates output too fast — with no organizational context, identity constraints, or quality feedback. The missing layer is meta-cognition: a system that holds both human judgment and AI execution in one structural frame, so each side learns from the other.',
      stat: '62%',
      statLabel: 'of PM time lost to synthesis',
    },
    {
      n: '02',
      tag: 'TRUSTED RELATIONS AT RISK',
      color: C.yellow,
      title: 'Expertise doesn\'t translate into systems.',
      body: 'Domain experts — agencies, consultants, operators — have deep knowledge of what works. But their tools don\'t capture that knowledge structurally. Every insight lives in someone\'s head or a scattered doc. GRID makes expertise visible and operational: outcomes you can see, patterns you can trace, systems that sustain without the expert in the room.',
      stat: '32h',
      statLabel: 'per content piece, manually',
    },
    {
      n: '03',
      tag: 'PROBLEM SELECTION IS BROKEN',
      color: C.purple,
      title: 'Nobody knows where to focus.',
      body: 'Businesses don\'t fail from bad execution — they fail from solving the wrong problems. Without feedback loops, teams optimize campaigns that don\'t convert, fix systems that aren\'t broken, and miss the signals that actually matter. Nova creates closed-loop intelligence: it suggests where to focus, keeps brand identity close, and surfaces the 3 things that move the needle.',
      stat: '8–12',
      statLabel: 'AI tools, zero feedback loops',
    },
  ];

  const layerW = (CONTENT_W - 0.4) / 3;
  const layerY = 3.3;
  const layerH = 3.55;

  layers.forEach((l, i) => {
    const x = MARGIN_X + i * (layerW + 0.2);
    card(s, x, layerY, layerW, layerH);

    // Top accent line
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: layerY + 0.01, w: layerW - 0.02, h: 0.04,
      fill: { color: l.color }, line: { color: l.color, width: 0 },
    });

    // Number + tag
    s.addText(l.n, {
      x: x + 0.3, y: layerY + 0.25, w: 0.4, h: 0.3,
      fontFace: F.display, fontSize: 18, color: l.color, margin: 0,
    });
    s.addText(l.tag, {
      x: x + 0.7, y: layerY + 0.3, w: layerW - 1, h: 0.25,
      fontFace: F.body, fontSize: 8, color: l.color, charSpacing: 2, margin: 0,
    });

    // Title
    s.addText(l.title, {
      x: x + 0.3, y: layerY + 0.65, w: layerW - 0.6, h: 0.45,
      fontFace: F.display, fontSize: 15, color: C.text1, bold: false, margin: 0,
    });

    // Divider
    s.addShape(pres.shapes.LINE, {
      x: x + 0.3, y: layerY + 1.15, w: 0.6, h: 0,
      line: { color: l.color, width: 1 },
    });

    // Body
    s.addText(l.body, {
      x: x + 0.3, y: layerY + 1.3, w: layerW - 0.6, h: 1.55,
      fontFace: F.body, fontSize: 9.5, color: C.text2, margin: 0,
    });

    // Stat chip at bottom
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.3, y: layerY + layerH - 0.65, w: layerW - 0.6, h: 0.45,
      fill: { color: l.color, transparency: 88 },
      line: { color: l.color, width: 0.5 },
      rectRadius: 0.04,
    });
    s.addText([
      { text: l.stat, options: { fontSize: 14, color: l.color, bold: false } },
      { text: '  ' + l.statLabel, options: { fontSize: 9, color: C.text2 } },
    ], {
      x: x + 0.3, y: layerY + layerH - 0.65, w: layerW - 0.6, h: 0.45,
      fontFace: F.body, align: 'center', valign: 'middle', margin: 0,
    });
  });

  footer(s, 2, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 3 — The Thesis: Human-controlled evolution from manual to automated
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'THE THESIS', MARGIN_X, 0.6);

  s.addText('From manual systems to automated ones.', {
    x: MARGIN_X, y: 1.0, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 40, color: C.text1, bold: false, margin: 0,
  });
  s.addText('With human input at every step.', {
    x: MARGIN_X, y: 1.85, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 40, color: C.brand, bold: false, margin: 0,
  });

  s.addText(
    'Processes are in demand to change. But the feedback loop between decision and outcome has been blurred by speed and fragmentation. Companies need time to consider the outcome of process — not more automation without understanding. GRID gives them that structure.',
    {
      x: MARGIN_X, y: 3.0, w: CONTENT_W * 0.72, h: 0.85,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // Three-step evolution: Manual → Structured → Automated (with Nova)
  const steps = [
    {
      n: '01', tag: 'MANUAL SYSTEMS', color: C.red,
      title: 'Where most businesses are today.',
      body: 'Decisions made in meetings. Knowledge in heads. Follow-ups in inboxes. No visibility into what\'s working or why. Every process depends on the person who built it being in the room.',
    },
    {
      n: '02', tag: 'STRUCTURED SYSTEMS', color: C.blue,
      title: 'GRID makes the invisible visible.',
      body: 'Environments, systems, and workflows give every process a shape. Health scores surface what\'s drifting. Outcomes become traceable. Human expertise stays intact — the system just makes it structural and observable.',
    },
    {
      n: '03', tag: 'ADAPTIVE SYSTEMS', color: C.brand,
      title: 'Nova creates the feedback loop.',
      body: 'Nova doesn\'t replace human judgment — it creates feedback loops that sharpen it. It suggests where to focus, surfaces patterns across campaigns, flags brand drift, and proposes next actions. You approve, adjust, or override. Always human-controlled.',
    },
  ];

  const stepW = (CONTENT_W - 0.4) / 3;
  const stepY = 4.1;
  const stepH = 2.55;
  steps.forEach((st, i) => {
    const x = MARGIN_X + i * (stepW + 0.2);
    card(s, x, stepY, stepW, stepH);
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: stepY + 0.01, w: stepW - 0.02, h: 0.04,
      fill: { color: st.color }, line: { color: st.color, width: 0 },
    });
    s.addText(st.n, {
      x: x + 0.3, y: stepY + 0.25, w: 0.4, h: 0.3,
      fontFace: F.display, fontSize: 16, color: st.color, margin: 0,
    });
    s.addText(st.tag, {
      x: x + 0.7, y: stepY + 0.3, w: stepW - 1, h: 0.25,
      fontFace: F.body, fontSize: 8, color: st.color, charSpacing: 2, margin: 0,
    });
    s.addText(st.title, {
      x: x + 0.3, y: stepY + 0.6, w: stepW - 0.6, h: 0.4,
      fontFace: F.display, fontSize: 14, color: C.text1, bold: false, margin: 0,
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.3, y: stepY + 1.05, w: 0.5, h: 0,
      line: { color: st.color, width: 1 },
    });
    s.addText(st.body, {
      x: x + 0.3, y: stepY + 1.15, w: stepW - 0.6, h: 1.3,
      fontFace: F.body, fontSize: 9.5, color: C.text2, margin: 0,
    });
  });

  // Arrows between steps
  for (let i = 0; i < 2; i++) {
    const ax = MARGIN_X + (i + 1) * stepW + i * 0.2 + 0.02;
    s.addText('\u2192', {
      x: ax, y: stepY + stepH / 2 - 0.2, w: 0.25, h: 0.4,
      fontFace: F.body, fontSize: 16, color: C.text4, align: 'center', margin: 0,
    });
  }

  footer(s, 3, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 4 — The Solution (Architecture + Nova merged)
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'THE SOLUTION', MARGIN_X, 0.6);

  s.addText('It looks like the tools you already know.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 30, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Tasks, goals, dashboards, workflows — familiar interfaces. But underneath, everything is connected. Your AI learns your business with every interaction. And you control every step — from manual processes to automated ones.',
    {
      x: MARGIN_X, y: 1.8, w: CONTENT_W * 0.75, h: 0.7,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // Three columns — what users actually experience
  const archItems = [
    {
      n: '01', title: 'Your Business, Organized', color: C.brand,
      body: 'Guided 5-step setup. Pick your business type. GRID creates your first workspace with tasks, goals, and workflows ready to go. Connect Slack, Stripe, Mailchimp, Instagram, and 110+ tools you already use. No code. No configuration.',
    },
    {
      n: '02', title: 'Health Scores, Not Guesswork', color: C.blue,
      body: 'Every part of your business gets a health score — 0 to 100%. See what\'s working, what\'s drifting, and what needs attention at a glance. No more asking "what\'s the status?" in Slack. The system shows you.',
    },
    {
      n: '03', title: 'Nova — Your Business Co-Pilot', color: C.purple,
      body: 'Ask Nova "What needs attention?" and get a real answer based on everything in your business. It suggests where to focus, flags brand drift, runs workflows, and improves with every interaction. You approve every action.',
    },
  ];
  const colW = (CONTENT_W - 0.5) / 3;
  const colY = 2.8;
  const colH = 2.6;
  archItems.forEach((it, i) => {
    const x = MARGIN_X + i * (colW + 0.25);
    card(s, x, colY, colW, colH);
    s.addText(it.n, {
      x: x + 0.4, y: colY + 0.35, w: 2, h: 0.3,
      fontFace: F.body, fontSize: 9, color: it.color, charSpacing: 4, margin: 0,
    });
    s.addText(it.title, {
      x: x + 0.4, y: colY + 0.65, w: colW - 0.8, h: 0.55,
      fontFace: F.display, fontSize: 20, color: C.text1, bold: false, margin: 0,
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.4, y: colY + 1.25, w: 0.8, h: 0,
      line: { color: it.color, width: 1 },
    });
    s.addText(it.body, {
      x: x + 0.4, y: colY + 1.4, w: colW - 0.8, h: 1.1,
      fontFace: F.body, fontSize: 10.5, color: C.text2, margin: 0,
    });
  });

  // Flow arrows between columns
  for (let i = 0; i < 2; i++) {
    const x = MARGIN_X + (i + 1) * colW + i * 0.25 + 0.03;
    s.addText('\u2192', {
      x, y: colY + colH / 2 - 0.25, w: 0.3, h: 0.4,
      fontFace: F.body, fontSize: 18, color: C.text4, align: 'center', margin: 0,
    });
  }

  // Bottom: platform stats strip
  const stripY = colY + colH + 0.25;
  card(s, MARGIN_X, stripY, CONTENT_W, 0.55, { fill: C.bgCardAlt });
  const stripStats = [
    { label: 'Free tier — no credit card', color: C.brand },
    { label: '110+ integrations ready', color: C.blue },
    { label: 'White-label ready for agencies', color: C.purple },
    { label: '5-minute guided onboarding', color: C.yellow },
  ];
  const ssW = CONTENT_W / stripStats.length;
  stripStats.forEach((ss, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: MARGIN_X + i * ssW + 0.25, y: stripY + 0.22, w: 0.08, h: 0.08,
      fill: { color: ss.color }, line: { color: ss.color, width: 0 },
    });
    s.addText(ss.label, {
      x: MARGIN_X + i * ssW + 0.42, y: stripY, w: ssW - 0.5, h: 0.55,
      fontFace: F.body, fontSize: 10, color: C.text2, valign: 'middle', margin: 0,
    });
  });

  footer(s, 4, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 5 — How It's Different
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'DIFFERENTIATION', MARGIN_X, 0.6, C.brand);

  s.addText('Everyone is building chat.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.75,
    fontFace: F.display, fontSize: 34, color: C.text1, bold: false, margin: 0,
  });
  s.addText('We are building structure.', {
    x: MARGIN_X, y: 1.65, w: CONTENT_W, h: 0.75,
    fontFace: F.display, fontSize: 34, color: C.brand, bold: false, margin: 0,
  });

  const diffs = [
    {
      color: C.brand,
      title: 'Not a tool — the layer tools run on.',
      body: 'Notion organizes. Monday tracks. GRID operationalizes. Docs trigger workflows. Goals surface health scores. Finance connects to the projects generating revenue. In GRID, everything is connected and everything acts.',
      proof: 'One platform replaces 12+ tools. Admin time drops 60%.',
    },
    {
      color: C.blue,
      title: 'Not a copilot — a constraint engine.',
      body: 'Every AI feature on the market is a chat window bolted onto an existing tool. Nova reads every system, validates output against your identity, scores quality, and creates feedback loops that suggest where to focus next. It keeps your brand close.',
      proof: 'AI output quality improves 40% in 4 weeks of use.',
    },
    {
      color: C.purple,
      title: 'Structure is the moat, not the model.',
      body: 'Models commoditize. The organizational graph — who does what, in what context, connected to which goals — is what makes AI useful at work. That graph is yours, it compounds, and it\'s nearly impossible to replicate once populated.',
      proof: 'Model-agnostic. BYOK-ready. Structure-permanent.',
    },
  ];

  const diffY = 2.6;
  const diffH = 1.4;
  diffs.forEach((d, i) => {
    const y = diffY + i * (diffH + 0.15);
    card(s, MARGIN_X, y, CONTENT_W, diffH);

    // Left accent bar
    s.addShape(pres.shapes.RECTANGLE, {
      x: MARGIN_X + 0.01, y: y + 0.01, w: 0.06, h: diffH - 0.02,
      fill: { color: d.color }, line: { color: d.color, width: 0 },
    });

    // Title
    s.addText(d.title, {
      x: MARGIN_X + 0.4, y: y + 0.15, w: 5, h: 0.4,
      fontFace: F.display, fontSize: 18, color: C.text1, bold: false, margin: 0,
    });

    // Body
    s.addText(d.body, {
      x: MARGIN_X + 0.4, y: y + 0.55, w: 7.5, h: 0.7,
      fontFace: F.body, fontSize: 10.5, color: C.text2, margin: 0,
    });

    // Proof chip on right
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: MARGIN_X + CONTENT_W - 3.8, y: y + 0.2, w: 3.5, h: 0.35,
      fill: { color: d.color, transparency: 88 },
      line: { color: d.color, width: 0.5 },
      rectRadius: 0.04,
    });
    s.addText(d.proof, {
      x: MARGIN_X + CONTENT_W - 3.8, y: y + 0.2, w: 3.5, h: 0.35,
      fontFace: F.body, fontSize: 9, color: d.color, align: 'center', valign: 'middle',
      margin: 0,
    });
  });

  footer(s, 5, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Product Mock: the Attention Widget
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'PRODUCT  ·  HOME', MARGIN_X, 0.6);
  s.addText('Attention, not notifications.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 30, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Signals, failed executions, at-risk goals and unhealthy systems — ranked into one focus stream. Nova surfaces the 3 things that matter right now.',
    {
      x: MARGIN_X, y: 1.8, w: CONTENT_W * 0.7, h: 0.55,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // Mock app chrome
  const appX = MARGIN_X, appY = 2.55, appW = CONTENT_W, appH = 4.3;
  card(s, appX, appY, appW, appH, { fill: '0B0B12', border: '1A1A24', radius: 0.1 });

  // Top bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: appX + 0.01, y: appY + 0.01, w: appW - 0.02, h: 0.45,
    fill: { color: '0D0D16' }, line: { color: '1A1A24', width: 0 },
  });
  ['FF6B6B', 'F7C700', '15AD70'].forEach((col, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: appX + 0.2 + i * 0.2, y: appY + 0.15, w: 0.13, h: 0.13,
      fill: { color: col, transparency: 45 }, line: { color: col, width: 0 },
    });
  });
  s.addText('grid.work  ·  Home', {
    x: appX + 0.95, y: appY + 0.08, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 10, color: C.text3, margin: 0,
  });

  // Greeting
  s.addText('WORKSPACE', {
    x: appX + 0.45, y: appY + 0.65, w: 4, h: 0.25,
    fontFace: F.body, fontSize: 9, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText('Welcome back, Nicole', {
    x: appX + 0.45, y: appY + 0.9, w: 7, h: 0.55,
    fontFace: F.display, fontSize: 22, color: C.text1, bold: false, margin: 0,
  });

  // Attention widget
  const awX = appX + 0.45, awY = appY + 1.6, awW = appW - 0.9, awH = 2.5;
  card(s, awX, awY, awW, awH, { fill: '11111C', border: '1E1E2A' });
  s.addText('ATTENTION', {
    x: awX + 0.3, y: awY + 0.2, w: 3, h: 0.25,
    fontFace: F.body, fontSize: 9, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText('What to focus on right now', {
    x: awX + 0.3, y: awY + 0.42, w: 5, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text4, margin: 0,
  });

  const rows = [
    { kind: 'SIG', kindColor: C.yellow, title: 'URGENT: ContentOS pipeline failure', reason: 'Unread urgent signal  ·  Marketing', time: '2m', score: 94 },
    { kind: 'RUN', kindColor: C.red,    title: 'Social Campaign: Q2 Launch',          reason: 'Execution failed  ·  Marketing',       time: '18m', score: 88 },
    { kind: 'GOAL', kindColor: C.purple, title: 'Close 3 design partners',             reason: 'Goal at risk  ·  Operations',          time: '1h',  score: 72 },
    { kind: 'SYS', kindColor: C.blue,   title: 'Analytics System',                    reason: 'System degraded  ·  Product',          time: '3h',  score: 58 },
  ];
  const rowH = 0.4;
  const rowGap = 0.09;
  rows.forEach((r, i) => {
    const ry = awY + 0.8 + i * (rowH + rowGap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: awX + 0.3, y: ry, w: awW - 0.6, h: rowH,
      fill: { color: '15151F' }, line: { color: '1E1E2A', width: 0.5 },
      rectRadius: 0.04,
    });
    // kind badge
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: awX + 0.42, y: ry + 0.08, w: 0.42, h: 0.23,
      fill: { color: r.kindColor, transparency: 88 },
      line: { color: r.kindColor, width: 0.5 },
      rectRadius: 0.04,
    });
    s.addText(r.kind, {
      x: awX + 0.42, y: ry + 0.08, w: 0.42, h: 0.23,
      fontFace: F.body, fontSize: 7, color: r.kindColor, align: 'center', charSpacing: 2,
      margin: 0, bold: false,
    });
    s.addText(r.title, {
      x: awX + 0.95, y: ry + 0.04, w: awW - 2.2, h: 0.22,
      fontFace: F.body, fontSize: 10, color: C.text1, margin: 0,
    });
    s.addText(r.reason, {
      x: awX + 0.95, y: ry + 0.22, w: awW - 2.2, h: 0.18,
      fontFace: F.body, fontSize: 8, color: C.text3, margin: 0,
    });
    s.addText(String(r.score), {
      x: awX + awW - 0.85, y: ry + 0.08, w: 0.4, h: 0.25,
      fontFace: F.display, fontSize: 13,
      color: r.score >= 80 ? C.red : r.score >= 60 ? C.yellow : C.purple,
      align: 'right', margin: 0,
    });
    // Attention bar
    const trackX = awX + 0.95, trackY = ry + rowH - 0.1, trackW = awW - 2.2, trackH = 0.04;
    s.addShape(pres.shapes.RECTANGLE, {
      x: trackX, y: trackY, w: trackW, h: trackH,
      fill: { color: '1E1E2A' }, line: { color: '1E1E2A', width: 0 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: trackX, y: trackY, w: trackW * (r.score / 100), h: trackH,
      fill: { color: r.score >= 80 ? C.red : r.score >= 60 ? C.yellow : C.purple, transparency: 15 },
      line: { color: C.bg, width: 0 },
    });
  });

  footer(s, 6, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Use Cases + Proof Points
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'USE CASES  ·  MEASURED', MARGIN_X, 0.6);
  s.addText('Every department. One system. Visible outcomes.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 28, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Domain experts keep their expertise. GRID translates it into working systems that sustain — with feedback loops that make outcomes visible and improvements continuous.',
    {
      x: MARGIN_X, y: 1.75, w: CONTENT_W * 0.78, h: 0.55,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  const cases = [
    {
      dept: 'CONTENT OPS', color: C.blue,
      workflow: 'Brief to Publish',
      result: 'Blog post from brief to publish-ready',
      before: '6–8 hours', after: '4 minutes',
      extra: '8.4 / 10 avg quality score',
    },
    {
      dept: 'MARKETING', color: C.red,
      workflow: 'Campaign Launch',
      result: 'Full 3-platform social campaign',
      before: '2–3 days with team', after: '3 minutes',
      extra: '14 posts ready to schedule',
    },
    {
      dept: 'OPERATIONS', color: C.brand,
      workflow: 'Client Onboarding',
      result: 'Structured onboarding with health scores',
      before: 'Manual follow-ups', after: 'Self-reporting',
      extra: '60% less friction · 0 status meetings',
    },
    {
      dept: 'REVENUE', color: C.yellow,
      workflow: 'Business Intelligence',
      result: 'Revenue impact in first 30 days',
      before: '$6K / mo', after: '$8.2K / mo',
      extra: 'Admin: 15h/wk → 6h/wk (-60%)',
    },
  ];

  const gridW = (CONTENT_W - 0.3) / 2;
  const gridH = 2.05;
  cases.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MARGIN_X + col * (gridW + 0.3);
    const y = 2.55 + row * (gridH + 0.2);
    card(s, x, y, gridW, gridH);

    // Top accent
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: y + 0.01, w: gridW - 0.02, h: 0.04,
      fill: { color: c.color }, line: { color: c.color, width: 0 },
    });

    // Dept + workflow
    s.addText(c.dept, {
      x: x + 0.35, y: y + 0.2, w: 3, h: 0.25,
      fontFace: F.body, fontSize: 8, color: c.color, charSpacing: 3, margin: 0,
    });
    s.addText(c.workflow, {
      x: x + 0.35, y: y + 0.45, w: gridW - 0.7, h: 0.35,
      fontFace: F.display, fontSize: 16, color: C.text1, bold: false, margin: 0,
    });

    // Before/After
    const baY = y + 0.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.35, y: baY, w: gridW - 0.7, h: 0.35,
      fill: { color: '15151F' }, line: { color: '1F1F2A', width: 0.5 },
      rectRadius: 0.04,
    });
    s.addText([
      { text: 'Before: ', options: { color: C.text3, fontSize: 9 } },
      { text: c.before, options: { color: C.red, fontSize: 9 } },
      { text: '   →   ', options: { color: C.text4, fontSize: 9 } },
      { text: 'After: ', options: { color: C.text3, fontSize: 9 } },
      { text: c.after, options: { color: C.brand, fontSize: 9 } },
    ], {
      x: x + 0.45, y: baY, w: gridW - 0.9, h: 0.35,
      fontFace: F.body, valign: 'middle', margin: 0,
    });

    // Result + extra
    s.addText(c.result, {
      x: x + 0.35, y: baY + 0.45, w: gridW - 0.7, h: 0.3,
      fontFace: F.body, fontSize: 10.5, color: C.text2, margin: 0,
    });
    s.addText(c.extra, {
      x: x + 0.35, y: baY + 0.7, w: gridW - 0.7, h: 0.25,
      fontFace: F.body, fontSize: 9, color: c.color, margin: 0,
    });
  });

  footer(s, 7, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 8 — The Big Picture + GRID in Action (UI placeholders)
// Replaces fake case studies with real product + comparable positioning
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'THE BIG PICTURE  ·  WHITE-LABEL OPPORTUNITY', MARGIN_X, 0.6);
  s.addText('A business OS anyone can use. A platform anyone can resell.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 26, color: C.text1, bold: false, margin: 0,
  });

  // ── Left: Two UI screenshot placeholders ────────────────────────────────
  const uiX = MARGIN_X, uiY = 2.0, uiW = 6.8;

  // Screenshot 1: Home / Attention Widget
  const ss1H = 2.0;
  card(s, uiX, uiY, uiW, ss1H, { fill: '0B0B12', border: '1A1A24', radius: 0.1 });
  // Mini traffic lights
  ['FF6B6B', 'F7C700', '15AD70'].forEach((col, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: uiX + 0.15 + i * 0.15, y: uiY + 0.12, w: 0.1, h: 0.1,
      fill: { color: col, transparency: 45 }, line: { color: col, width: 0 },
    });
  });
  s.addText('grid.work  ·  Dashboard  ·  A founder\'s morning view', {
    x: uiX + 0.7, y: uiY + 0.07, w: 4, h: 0.2,
    fontFace: F.body, fontSize: 8, color: C.text3, margin: 0,
  });
  s.addText('[ Screenshot: Health scores across Marketing (92%),\n  Operations (78%), Content (85%). Attention widget\n  showing "3 things to focus on today." Familiar layout —\n  like Notion meets a business dashboard. ]', {
    x: uiX + 0.4, y: uiY + 0.5, w: uiW - 0.8, h: 1.2,
    fontFace: F.mono, fontSize: 9.5, color: C.text4, margin: 0,
  });

  // Screenshot 2: Workflow Execution
  const ss2Y = uiY + ss1H + 0.2;
  const ss2H = 2.0;
  card(s, uiX, ss2Y, uiW, ss2H, { fill: '0B0B12', border: '1A1A24', radius: 0.1 });
  ['FF6B6B', 'F7C700', '15AD70'].forEach((col, i) => {
    s.addShape(pres.shapes.OVAL, {
      x: uiX + 0.15 + i * 0.15, y: ss2Y + 0.12, w: 0.1, h: 0.1,
      fill: { color: col, transparency: 45 }, line: { color: col, width: 0 },
    });
  });
  s.addText('grid.work  ·  White-Label  ·  Agency client view', {
    x: uiX + 0.7, y: ss2Y + 0.07, w: 4, h: 0.2,
    fontFace: F.body, fontSize: 8, color: C.text3, margin: 0,
  });
  s.addText('[ Screenshot: Same interface, client\'s brand colors\n  and logo. Custom environment: "Acme Co Operations."\n  The agency manages 12 clients — each sees their own\n  branded workspace. No code. One click to set up. ]', {
    x: uiX + 0.4, y: ss2Y + 0.5, w: uiW - 0.8, h: 1.2,
    fontFace: F.mono, fontSize: 9.5, color: C.text4, margin: 0,
  });

  // ── Right: Big picture + comparables ────────────────────────────────────
  const rpX = uiX + uiW + 0.25;
  const rpW = CONTENT_W - uiW - 0.25;

  // Big picture card
  const bpH = 2.1;
  card(s, rpX, uiY, rpW, bpH);
  s.addText('THE WHITE-LABEL PLAY', {
    x: rpX + 0.3, y: uiY + 0.2, w: 4, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.brand, charSpacing: 3, margin: 0,
  });
  s.addText(
    'GRID isn\'t just for operators — it\'s a platform agencies and consultants can resell under their own brand.\n\n' +
    'Custom logo, colors, and domain per client. Each environment is a white-labeled workspace. $299/env/mo adds $43K/yr margin per 12 clients. Every agency becomes a distribution channel.',
    {
      x: rpX + 0.3, y: uiY + 0.5, w: rpW - 0.6, h: 1.4,
      fontFace: F.body, fontSize: 10.5, color: C.text2, margin: 0,
    }
  );

  // Comparables card
  const cpY = uiY + bpH + 0.2;
  const cpH = ss2Y + ss2H - cpY;
  card(s, rpX, cpY, rpW, cpH, { fill: C.bgCardAlt });
  s.addText('COMPARABLE THESIS', {
    x: rpX + 0.3, y: cpY + 0.15, w: 4, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });

  const bigComps = [
    { name: 'Stripe', val: '$95B', thesis: 'Built structure for payments', color: C.brand },
    { name: 'Figma', val: '$20B', thesis: 'Built structure for design', color: C.blue },
    { name: 'Linear', val: '$400M+', thesis: 'Built structure for eng', color: C.purple },
    { name: 'Notion', val: '$10B', thesis: 'Built structure for docs', color: C.yellow },
  ];
  bigComps.forEach((c, i) => {
    const cy = cpY + 0.5 + i * 0.42;
    s.addShape(pres.shapes.OVAL, {
      x: rpX + 0.3, y: cy + 0.07, w: 0.08, h: 0.08,
      fill: { color: c.color }, line: { color: c.color, width: 0 },
    });
    s.addText([
      { text: c.name, options: { color: C.text1, fontSize: 11 } },
      { text: '  ' + c.val, options: { color: c.color, fontSize: 9 } },
    ], {
      x: rpX + 0.48, y: cy - 0.02, w: rpW - 0.8, h: 0.22,
      fontFace: F.body, margin: 0,
    });
    s.addText(c.thesis, {
      x: rpX + 0.48, y: cy + 0.18, w: rpW - 0.8, h: 0.2,
      fontFace: F.body, fontSize: 8.5, color: C.text3, margin: 0,
    });
  });

  // GRID positioning
  s.addShape(pres.shapes.LINE, {
    x: rpX + 0.3, y: cpY + cpH - 0.55, w: rpW - 0.6, h: 0,
    line: { color: C.brand, width: 1 },
  });
  s.addText([
    { text: 'GRID', options: { color: C.brand, fontSize: 12 } },
    { text: '  =  structure for organizational intelligence', options: { color: C.text2, fontSize: 10 } },
  ], {
    x: rpX + 0.3, y: cpY + cpH - 0.45, w: rpW - 0.6, h: 0.35,
    fontFace: F.body, margin: 0,
  });

  footer(s, 8, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Founder: Nicole Cain
// Story-first. Problem-rooted. Market proof that the timing is now.
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'FOUNDER  ·  ORIGIN', MARGIN_X, 0.6);

  s.addText('I didn\'t start with a pitch.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.7,
    fontFace: F.display, fontSize: 32, color: C.text1, bold: false, margin: 0,
  });
  s.addText('I started with a problem I couldn\'t stop living in.', {
    x: MARGIN_X, y: 1.6, w: CONTENT_W, h: 0.55,
    fontFace: F.display, fontSize: 22, color: C.brand, bold: false, margin: 0,
  });

  // ── Left column: The Story ──────────────────────────────────────────────
  const storyX = MARGIN_X, storyY = 2.35, storyW = 6.8, storyH = 4.2;
  card(s, storyX, storyY, storyW, storyH);

  // Avatar
  s.addShape(pres.shapes.OVAL, {
    x: storyX + 0.35, y: storyY + 0.3, w: 1.1, h: 1.1,
    fill: { color: C.brand, transparency: 80 },
    line: { color: C.brand, width: 1.25 },
  });
  s.addText('NC', {
    x: storyX + 0.35, y: storyY + 0.3, w: 1.1, h: 1.1,
    fontFace: F.display, fontSize: 28, color: C.brand,
    align: 'center', valign: 'middle', bold: false, margin: 0,
  });

  s.addText('Nicole Cain', {
    x: storyX + 1.7, y: storyY + 0.3, w: 4, h: 0.4,
    fontFace: F.display, fontSize: 20, color: C.text1, bold: false, margin: 0,
  });
  s.addText('Systems Designer  ·  Founder, GRID', {
    x: storyX + 1.7, y: storyY + 0.7, w: 4, h: 0.25,
    fontFace: F.body, fontSize: 10, color: C.brand, charSpacing: 1, margin: 0,
  });
  s.addText('"Exploring human behavior in digital environments"', {
    x: storyX + 1.7, y: storyY + 0.95, w: 4.5, h: 0.25,
    fontFace: F.body, fontSize: 9, color: C.text3, italic: true, margin: 0,
  });

  // The story — raw, problem-first
  s.addText(
    'I spent years running creative operations — managing clients, shipping content across platforms, tracking revenue in spreadsheets, coordinating between 12+ tools that never talked to each other. Every week I watched the same pattern: smart people drowning in coordination. Not because they lacked talent. Because their systems were broken.\n\n' +
    'I\'d spend 15 hours a week on admin that didn\'t move the business forward. Invoices would slip. Content would stall in review. Client follow-ups would fall through the cracks. I was the bottleneck in my own system — and I could see the same thing happening inside every small team and agency I worked with.\n\n' +
    'Then AI tools arrived. And the problem got worse. More output, faster — but into the same broken infrastructure. I had 8 different AI tools, no system connecting them, and no way to know if any of it was actually working. That\'s when I stopped looking for a solution and started building one.',
    {
      x: storyX + 0.35, y: storyY + 1.35, w: storyW - 0.7, h: 2.7,
      fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
    }
  );

  // ── Right column: The proof the world caught up ─────────────────────────
  const proofX = storyX + storyW + 0.25;
  const proofW = CONTENT_W - storyW - 0.25;

  // Top card: Why Now — market adaptation KPIs
  const nowH = 2.45;
  card(s, proofX, storyY, proofW, nowH);
  s.addText('WHY NOW', {
    x: proofX + 0.3, y: storyY + 0.2, w: 3, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.yellow, charSpacing: 3, margin: 0,
  });
  s.addText('The market caught up.', {
    x: proofX + 0.3, y: storyY + 0.45, w: proofW - 0.6, h: 0.35,
    fontFace: F.display, fontSize: 14, color: C.text1, bold: false, margin: 0,
  });

  // Market KPIs proving demand is NOW
  const mkpis = [
    { val: '91%', label: 'of companies now use AI at work', sub: 'McKinsey 2025', color: C.yellow },
    { val: '8–12', label: 'AI tools per creative business', sub: 'zero system managing them', color: C.red },
    { val: '72%', label: 'say AI increased workload', sub: 'Upwork Research 2024', color: C.purple },
    { val: '$4.1T', label: 'in productivity gains at stake', sub: 'McKinsey AI economic potential', color: C.brand },
  ];
  mkpis.forEach((k, i) => {
    const ky = storyY + 0.9 + i * 0.37;
    s.addShape(pres.shapes.OVAL, {
      x: proofX + 0.3, y: ky + 0.07, w: 0.08, h: 0.08,
      fill: { color: k.color }, line: { color: k.color, width: 0 },
    });
    s.addText([
      { text: k.val, options: { color: k.color, fontSize: 11, bold: false } },
      { text: '  ' + k.label, options: { color: C.text2, fontSize: 9 } },
    ], {
      x: proofX + 0.48, y: ky - 0.03, w: proofW - 0.8, h: 0.22,
      fontFace: F.body, margin: 0,
    });
    s.addText(k.sub, {
      x: proofX + 0.48, y: ky + 0.17, w: proofW - 0.8, h: 0.18,
      fontFace: F.body, fontSize: 7.5, color: C.text4, margin: 0,
    });
  });

  // Bottom card: What I built — conviction metrics
  const builtY = storyY + nowH + 0.15;
  const builtH = storyH - nowH - 0.15;
  card(s, proofX, builtY, proofW, builtH, { fill: C.bgCardAlt });
  s.addText('18 MONTHS BUILDING', {
    x: proofX + 0.3, y: builtY + 0.15, w: 4, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.brand, charSpacing: 3, margin: 0,
  });
  s.addText('Before anyone was paying attention.', {
    x: proofX + 0.3, y: builtY + 0.38, w: proofW - 0.6, h: 0.25,
    fontFace: F.body, fontSize: 9, color: C.text3, italic: true, margin: 0,
  });

  // Build stats — compact
  const bStats = [
    { val: '483', label: 'files shipped', color: C.brand },
    { val: '44+', label: 'API routes', color: C.blue },
    { val: '110+', label: 'integrations', color: C.purple },
    { val: '$0', label: 'burn', color: C.yellow },
  ];
  const bsColW = (proofW - 0.6) / 2;
  bStats.forEach((bs, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const bsx = proofX + 0.3 + col * bsColW;
    const bsy = builtY + 0.7 + row * 0.55;
    s.addText(bs.val, {
      x: bsx, y: bsy, w: bsColW * 0.45, h: 0.35,
      fontFace: F.display, fontSize: 18, color: bs.color, bold: false, margin: 0,
    });
    s.addText(bs.label, {
      x: bsx + bsColW * 0.45, y: bsy + 0.05, w: bsColW * 0.55, h: 0.3,
      fontFace: F.body, fontSize: 8.5, color: C.text3, margin: 0,
    });
  });

  // Bottom quote
  s.addText('I built GRID because no one else was solving the problem I was living in every day. 18 months later, everyone feels it.', {
    x: MARGIN_X, y: storyY + storyH + 0.12, w: CONTENT_W, h: 0.3,
    fontFace: F.body, fontSize: 11, color: C.text3, italic: true, align: 'center', margin: 0,
  });

  footer(s, 9, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 10 — GTM Strategy
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'GO TO MARKET', MARGIN_X, 0.6);
  s.addText('Structure scales through partners, not ads.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 28, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Four phases from closed alpha to public launch. Each phase validates structure, deepens feedback loops, and builds distribution organically.',
    {
      x: MARGIN_X, y: 1.75, w: CONTENT_W * 0.78, h: 0.5,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // Four-phase timeline
  const phases = [
    {
      tag: 'NOW', title: 'Closed Alpha', color: C.brand,
      body: 'Nicole dogfooding + invite-only design partners. Proving structural thesis on real businesses.',
    },
    {
      tag: 'M 1–4', title: '5 Design Partners', color: C.blue,
      body: 'Paid partners across 3 archetypes: solo creator, agency, mid-market ops. $39–$299/seat.',
    },
    {
      tag: 'M 4–8', title: 'BYOK Public Beta', color: C.purple,
      body: 'Users bring own Anthropic key. Eliminates AI cost risk. Self-selects sophisticated early adopters.',
    },
    {
      tag: 'M 8–14', title: 'Public Launch', color: C.yellow,
      body: 'Managed AI, tiered pricing. Target: $10K MRR. Community-led growth + agency white-label distribution.',
    },
  ];
  const phW = (CONTENT_W - 0.45) / 4;
  const phY = 2.5;
  const phH = 2.2;
  phases.forEach((ph, i) => {
    const x = MARGIN_X + i * (phW + 0.15);
    card(s, x, phY, phW, phH);
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: phY + 0.01, w: phW - 0.02, h: 0.04,
      fill: { color: ph.color }, line: { color: ph.color, width: 0 },
    });
    s.addText(ph.tag, {
      x: x + 0.3, y: phY + 0.25, w: phW - 0.6, h: 0.3,
      fontFace: F.body, fontSize: 9, color: ph.color, charSpacing: 3, margin: 0,
    });
    s.addText(ph.title, {
      x: x + 0.3, y: phY + 0.55, w: phW - 0.6, h: 0.45,
      fontFace: F.display, fontSize: 16, color: C.text1, bold: false, margin: 0,
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.3, y: phY + 1.05, w: 0.5, h: 0,
      line: { color: ph.color, width: 1 },
    });
    s.addText(ph.body, {
      x: x + 0.3, y: phY + 1.15, w: phW - 0.6, h: 0.9,
      fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
    });
  });

  // Distribution wedges
  const dwY = phY + phH + 0.3;
  const dwH = 1.35;
  card(s, MARGIN_X, dwY, CONTENT_W, dwH, { fill: C.bgCardAlt });
  s.addText('DISTRIBUTION WEDGES', {
    x: MARGIN_X + 0.35, y: dwY + 0.15, w: 4, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });

  const wedges = [
    { icon: '\u25CB', title: 'White-label', body: 'Agencies rebrand per client at $299/env/mo. Each agency = distribution channel. $43K/yr margin per 12 clients.', color: C.brand },
    { icon: '\u25CB', title: 'Content', body: '1M monthly video views. 10K newsletter subscribers. Nicole builds audience and product simultaneously.', color: C.blue },
    { icon: '\u25CB', title: 'BYOK', body: 'Bring Your Own Key self-selects AI-native early adopters. Organic word-of-mouth in technical communities.', color: C.purple },
    { icon: '\u25CB', title: 'Templates', body: 'Notion marketplace experience. Template-to-platform pipeline converts free users to paid.', color: C.yellow },
  ];
  const wW = (CONTENT_W - 0.7) / 4;
  wedges.forEach((w, i) => {
    const wx = MARGIN_X + 0.35 + i * wW;
    s.addShape(pres.shapes.OVAL, {
      x: wx, y: dwY + 0.5, w: 0.1, h: 0.1,
      fill: { color: w.color }, line: { color: w.color, width: 0 },
    });
    s.addText(w.title, {
      x: wx + 0.18, y: dwY + 0.42, w: wW - 0.3, h: 0.25,
      fontFace: F.body, fontSize: 10, color: C.text1, margin: 0,
    });
    s.addText(w.body, {
      x: wx, y: dwY + 0.7, w: wW - 0.15, h: 0.55,
      fontFace: F.body, fontSize: 8.5, color: C.text3, margin: 0,
    });
  });

  footer(s, 10, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Market
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'MARKET', MARGIN_X, 0.6);
  s.addText('We are not sizing the SaaS market.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 28, color: C.text1, bold: false, margin: 0,
  });
  s.addText('We are sizing the labor budget we replace.', {
    x: MARGIN_X, y: 1.65, w: CONTENT_W, h: 0.7,
    fontFace: F.display, fontSize: 22, color: C.brand, bold: false, margin: 0,
  });

  const rings = [
    { label: 'TAM', sub: 'Global coordination labor',      value: '$2.1T', desc: 'PMs, ops, content, social — annual salary spend across all knowledge orgs', color: C.brand },
    { label: 'SAM', sub: 'English-speaking SMB + mid-mkt', value: '$310B', desc: 'Companies 10–500 where a single founder can buy without procurement', color: C.blue },
    { label: 'SOM', sub: '5-year capturable',              value: '$180M', desc: '18K seats \u00D7 $99/mo average at 1% SAM penetration — conservative floor',   color: C.purple },
  ];
  const mkCardY = 2.75;
  const mkCardH = 3.4;
  const mkCardW = (CONTENT_W - 0.5) / 3;
  rings.forEach((r, i) => {
    const x = MARGIN_X + i * (mkCardW + 0.25);
    card(s, x, mkCardY, mkCardW, mkCardH);
    s.addText(r.label, {
      x: x + 0.4, y: mkCardY + 0.35, w: 3, h: 0.3,
      fontFace: F.body, fontSize: 9, color: r.color, charSpacing: 4, margin: 0,
    });
    s.addText(r.sub, {
      x: x + 0.4, y: mkCardY + 0.65, w: mkCardW - 0.8, h: 0.3,
      fontFace: F.body, fontSize: 10, color: C.text3, margin: 0,
    });
    s.addText(r.value, {
      x: x + 0.4, y: mkCardY + 1.15, w: mkCardW - 0.8, h: 1.3,
      fontFace: F.display, fontSize: 56, color: C.text1, bold: false, margin: 0,
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.4, y: mkCardY + 2.4, w: 0.8, h: 0,
      line: { color: r.color, width: 1 },
    });
    s.addText(r.desc, {
      x: x + 0.4, y: mkCardY + 2.55, w: mkCardW - 0.8, h: 0.85,
      fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
    });
  });

  s.addText('The next 18 months decide whose structure the AI agent layer runs on.', {
    x: MARGIN_X, y: H - 1.05, w: CONTENT_W, h: 0.35,
    fontFace: F.body, fontSize: 12, color: C.text3, italic: true, margin: 0,
  });

  footer(s, 11, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Competition + Comparables (merged)
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'COMPETITION  ·  COMPARABLES', MARGIN_X, 0.6);
  s.addText('Everyone is building chat. We are building structure.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 28, color: C.text1, bold: false, margin: 0,
  });

  // 2x2 positioning map (left)
  const mapX = MARGIN_X, mapY = 2.0, mapW = 6.5, mapH = 4.1;
  card(s, mapX, mapY, mapW, mapH, { fill: '0C0C14' });

  s.addShape(pres.shapes.LINE, {
    x: mapX + mapW / 2, y: mapY + 0.2, w: 0, h: mapH - 0.4,
    line: { color: C.border, width: 0.75 },
  });
  s.addShape(pres.shapes.LINE, {
    x: mapX + 0.2, y: mapY + mapH / 2, w: mapW - 0.4, h: 0,
    line: { color: C.border, width: 0.75 },
  });

  s.addText('STRUCTURE-FIRST \u2192', {
    x: mapX + mapW / 2 + 0.1, y: mapY + 0.1, w: mapW / 2 - 0.2, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText('\u2190 CHAT-FIRST', {
    x: mapX + 0.2, y: mapY + 0.1, w: mapW / 2 - 0.2, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText('AI-NATIVE \u2191', {
    x: mapX + 0.1, y: mapY + 0.4, w: 1.5, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText('\u2193 TEMPLATE-OPS', {
    x: mapX + 0.1, y: mapY + mapH - 0.4, w: 1.7, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });

  const dots = [
    { name: 'ChatGPT',      x: 0.22, y: 0.20, color: C.text3 },
    { name: 'Claude',        x: 0.16, y: 0.28, color: C.text3 },
    { name: 'Notion AI',     x: 0.35, y: 0.55, color: C.text3 },
    { name: 'ClickUp Brain', x: 0.45, y: 0.42, color: C.text3 },
    { name: 'Monday',        x: 0.62, y: 0.72, color: C.text3 },
    { name: 'Asana',         x: 0.72, y: 0.78, color: C.text3 },
    { name: 'ClickUp',       x: 0.55, y: 0.65, color: C.text3 },
    { name: 'Linear',        x: 0.80, y: 0.60, color: C.text3 },
    { name: 'GRID',          x: 0.82, y: 0.18, color: C.brand, big: true },
  ];
  dots.forEach(d => {
    const dx = mapX + d.x * mapW;
    const dy = mapY + d.y * mapH;
    const size = d.big ? 0.32 : 0.14;
    s.addShape(pres.shapes.OVAL, {
      x: dx - size / 2, y: dy - size / 2, w: size, h: size,
      fill: { color: d.color, transparency: d.big ? 0 : 40 },
      line: { color: d.color, width: d.big ? 1 : 0 },
    });
    s.addText(d.name, {
      x: dx + size / 2 + 0.05, y: dy - 0.12, w: 1.2, h: 0.25,
      fontFace: F.body, fontSize: d.big ? 11 : 9,
      color: d.big ? C.brand : C.text2, bold: false, margin: 0,
    });
  });

  // Right side: moat + comparables
  const rtX = mapX + mapW + 0.3;
  const rtW = CONTENT_W - mapW - 0.3;

  // Moats
  s.addText('WHY WE WIN', {
    x: rtX, y: mapY, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.brand, charSpacing: 3, margin: 0,
  });
  const moats = [
    'Structure as thesis — hard-to-copy POV, not a feature',
    'Multi-tenant from day one — 44+ guarded routes',
    'Identity constraints — alignment as architecture',
    'White-label at seat level — agencies become channels',
    'vs ClickUp Brain: chat layer on tasks. No feedback loops, no identity constraints, no cross-system reasoning.',
  ];
  moats.forEach((m, i) => {
    const my = mapY + 0.35 + i * 0.38;
    s.addShape(pres.shapes.LINE, {
      x: rtX, y: my + 0.12, w: 0.2, h: 0,
      line: { color: C.brand, width: 1.5 },
    });
    s.addText(m, {
      x: rtX + 0.3, y: my, w: rtW - 0.3, h: 0.4,
      fontFace: F.body, fontSize: 9.5, color: C.text2, margin: 0,
    });
  });

  // Comparables strip
  const compY = mapY + 2.2;
  s.addText('THESIS COMPARABLES', {
    x: rtX, y: compY, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  const comps = [
    { name: 'Stripe', val: '$95B', thesis: 'Structure for payments', color: C.brand },
    { name: 'Figma', val: '$20B', thesis: 'Structure for design', color: C.blue },
    { name: 'Linear', val: '$400M+', thesis: 'Structure for eng', color: C.purple },
    { name: 'Notion', val: '$10B', thesis: 'Structure for docs', color: C.yellow },
  ];
  comps.forEach((c, i) => {
    const cy = compY + 0.35 + i * 0.42;
    s.addShape(pres.shapes.OVAL, {
      x: rtX, y: cy + 0.08, w: 0.08, h: 0.08,
      fill: { color: c.color }, line: { color: c.color, width: 0 },
    });
    s.addText([
      { text: c.name, options: { color: C.text1, fontSize: 10 } },
      { text: '  ' + c.val, options: { color: c.color, fontSize: 9 } },
    ], {
      x: rtX + 0.18, y: cy, w: rtW - 0.5, h: 0.22,
      fontFace: F.body, margin: 0,
    });
    s.addText(c.thesis, {
      x: rtX + 0.18, y: cy + 0.2, w: rtW - 0.5, h: 0.2,
      fontFace: F.body, fontSize: 8, color: C.text3, margin: 0,
    });
  });

  // Bottom: GRID positioning
  s.addText('GRID = structure for organizational intelligence.  Ask: $3M cap.', {
    x: rtX, y: mapY + mapH - 0.35, w: rtW, h: 0.3,
    fontFace: F.body, fontSize: 10, color: C.brand, margin: 0,
  });

  footer(s, 12, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Business Model
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'BUSINESS MODEL  ·  PRICING', MARGIN_X, 0.6);
  s.addText('Four tiers. Margin protected at every level.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 28, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Median user costs us ~$22/mo at current Anthropic rates. Per-tenant daily caps enforce a worst-case ceiling. Gross margin stays above 78% worst case, above 92% median.',
    {
      x: MARGIN_X, y: 1.75, w: CONTENT_W * 0.85, h: 0.55,
      fontFace: F.body, fontSize: 12, color: C.text2, margin: 0,
    }
  );

  const tiers = [
    {
      name: 'FREE', color: C.text2, price: 'Free', unit: '',
      seats: '1 user  ·  1 environment', margin: 'Acquisition',
      features: ['$2/day AI cap', 'Nova with 5 tools', 'Community support', 'Public workflows'],
    },
    {
      name: 'PRO', color: C.brand, price: '$29', unit: '/mo',
      seats: '10 environments  ·  unlimited systems', margin: '~44% GM',
      features: ['Nova 11 tools', '$10/day AI cap', 'Signals + goals', 'Priority support'],
    },
    {
      name: 'TEAM', color: C.blue, price: '$79', unit: '/seat/mo',
      seats: 'Unlimited  ·  SSO  ·  white-label', margin: '~78% GM',
      features: ['Everything in Pro', '$50/day AI cap', 'API + webhooks', 'Custom workflows'],
    },
    {
      name: 'ENTERPRISE', color: C.purple, price: '$299', unit: '/seat/mo',
      seats: 'Unlimited  ·  Dedicated', margin: '~92% GM',
      features: ['Everything in Team', 'White-label branding', 'Audit logs + SSO', 'Design partner SLA'],
    },
  ];
  const gap = 0.2;
  const tColW = (CONTENT_W - gap * 3) / 4;
  const tColY = 2.5;
  const tColH = 3.7;
  tiers.forEach((t, i) => {
    const x = MARGIN_X + i * (tColW + gap);
    card(s, x, tColY, tColW, tColH);
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: tColY + 0.01, w: tColW - 0.02, h: 0.04,
      fill: { color: t.color }, line: { color: t.color, width: 0 },
    });
    s.addText(t.name, {
      x: x + 0.3, y: tColY + 0.3, w: tColW - 0.6, h: 0.3,
      fontFace: F.body, fontSize: 9, color: t.color, charSpacing: 4, margin: 0,
    });
    s.addText([
      { text: t.price, options: { fontSize: 34, color: C.text1 } },
      { text: t.unit, options: { fontSize: 10, color: C.text3 } },
    ], {
      x: x + 0.3, y: tColY + 0.65, w: tColW - 0.6, h: 0.9,
      fontFace: F.display, bold: false, margin: 0,
    });
    s.addText(t.seats, {
      x: x + 0.3, y: tColY + 1.55, w: tColW - 0.6, h: 0.3,
      fontFace: F.body, fontSize: 9, color: C.text3, margin: 0,
    });
    // Margin chip
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.3, y: tColY + 1.85, w: tColW - 0.6, h: 0.3,
      fill: { color: t.color, transparency: 88 },
      line: { color: t.color, width: 0.5 },
      rectRadius: 0.04,
    });
    s.addText(t.margin, {
      x: x + 0.3, y: tColY + 1.85, w: tColW - 0.6, h: 0.3,
      fontFace: F.body, fontSize: 9, color: t.color, align: 'center', valign: 'middle',
      margin: 0,
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.3, y: tColY + 2.3, w: tColW - 0.6, h: 0,
      line: { color: C.border, width: 0.75 },
    });
    t.features.forEach((f, fi) => {
      const fy = tColY + 2.4 + fi * 0.3;
      s.addText('\u2713', {
        x: x + 0.3, y: fy, w: 0.25, h: 0.3,
        fontFace: F.body, fontSize: 9, color: t.color, margin: 0,
      });
      s.addText(f, {
        x: x + 0.52, y: fy, w: tColW - 0.82, h: 0.3,
        fontFace: F.body, fontSize: 9, color: C.text2, margin: 0,
      });
    });
  });

  // Add-ons strip
  const addY = 6.4;
  card(s, MARGIN_X, addY, CONTENT_W, 0.55, { fill: C.bgCardAlt });
  s.addText('ADD-ONS', {
    x: MARGIN_X + 0.3, y: addY, w: 1.3, h: 0.55,
    fontFace: F.body, fontSize: 9, color: C.text3, charSpacing: 3,
    valign: 'middle', margin: 0,
  });
  const addons = [
    { label: 'Annual billing',  value: '\u221220%',     color: C.brand },
    { label: 'Extra AI cap',    value: '$0.02/1K tok',  color: C.blue },
    { label: 'SSO add-on',      value: '$500/mo',       color: C.purple },
    { label: 'White-label env', value: '$299/env/mo',   color: C.yellow },
  ];
  const addColW = (CONTENT_W - 1.6) / addons.length;
  addons.forEach((a, i) => {
    const ax = MARGIN_X + 1.5 + i * addColW;
    s.addShape(pres.shapes.OVAL, {
      x: ax, y: addY + 0.55 / 2 - 0.05, w: 0.1, h: 0.1,
      fill: { color: a.color }, line: { color: a.color, width: 0 },
    });
    s.addText([
      { text: a.label, options: { color: C.text2, fontSize: 9 } },
      { text: '  ', options: {} },
      { text: a.value, options: { color: a.color, fontSize: 9, bold: false } },
    ], {
      x: ax + 0.2, y: addY, w: addColW - 0.2, h: 0.55,
      fontFace: F.body, valign: 'middle', margin: 0,
    });
  });

  footer(s, 13, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 14 — The Ask
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();

  s.addShape(pres.shapes.OVAL, {
    x: -3, y: -4, w: 10, h: 10,
    fill: { color: C.brand, transparency: 94 },
    line: { color: C.bg, width: 0 },
  });

  eyebrow(s, 'THE ASK', MARGIN_X, 0.6, C.brand);
  s.addText('$500K target.  $750K hard cap.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.9,
    fontFace: F.display, fontSize: 36, color: C.text1, bold: false, margin: 0,
  });
  s.addText('Pre-seed SAFE  ·  $4M post-money cap  ·  18 months runway', {
    x: MARGIN_X, y: 1.85, w: CONTENT_W, h: 0.5,
    fontFace: F.body, fontSize: 15, color: C.brand, charSpacing: 1, margin: 0,
  });

  // Use of funds bar
  const ufX = MARGIN_X, ufY = 2.8, ufW = CONTENT_W, ufH = 0.7;
  const uses = [
    { label: 'Founder',                    pct: 0.45, color: C.brand },
    { label: 'Research  ·  IP  ·  Legal',  pct: 0.25, color: C.blue },
    { label: 'GTM review',                 pct: 0.15, color: C.purple },
    { label: 'Tech stack revision',        pct: 0.15, color: C.yellow },
  ];
  s.addText('USE OF FUNDS', {
    x: ufX, y: ufY - 0.35, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.text3, charSpacing: 3, margin: 0,
  });
  let bx = ufX;
  uses.forEach((u) => {
    const w = ufW * u.pct;
    s.addShape(pres.shapes.RECTANGLE, {
      x: bx, y: ufY, w, h: ufH,
      fill: { color: u.color, transparency: 20 },
      line: { color: C.bg, width: 1.5 },
    });
    s.addText(`${Math.round(u.pct * 100)}%`, {
      x: bx, y: ufY + 0.15, w, h: 0.4,
      fontFace: F.display, fontSize: 16, color: C.text1,
      align: 'center', valign: 'middle', bold: false, margin: 0,
    });
    bx += w;
  });
  bx = ufX;
  uses.forEach((u) => {
    const w = ufW * u.pct;
    s.addText(u.label, {
      x: bx, y: ufY + ufH + 0.1, w, h: 0.35,
      fontFace: F.body, fontSize: 9, color: u.color,
      align: 'center', margin: 0,
    });
    bx += w;
  });

  // Milestones
  const mY = 4.65;
  s.addText('MILESTONES TO SEED', {
    x: MARGIN_X, y: mY, w: 6, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.text3, charSpacing: 3, margin: 0,
  });
  const milestones = [
    { n: '\u2713',  title: 'Alpha live with private partners', sub: 'NOW',       color: C.brand },
    { n: '01', title: 'Public beta opens',              sub: 'May 2026',  color: C.blue },
    { n: '02', title: '25 paying users + $10K MRR',     sub: 'Q3 2026',   color: C.purple },
    { n: '03', title: 'Seed-ready with case studies',    sub: 'Q4 2026',   color: C.yellow },
  ];
  const msW = (CONTENT_W - 0.45) / 4;
  const msH = 1.35;
  milestones.forEach((m, i) => {
    const x = MARGIN_X + i * (msW + 0.15);
    card(s, x, mY + 0.35, msW, msH);
    s.addText(m.n, {
      x: x + 0.35, y: mY + 0.5, w: 1, h: 0.3,
      fontFace: F.body, fontSize: 9, color: m.color, charSpacing: 3, margin: 0,
    });
    s.addText(m.title, {
      x: x + 0.35, y: mY + 0.75, w: msW - 0.7, h: 0.4,
      fontFace: F.body, fontSize: 12, color: C.text1, margin: 0,
    });
    s.addText(m.sub, {
      x: x + 0.35, y: mY + 1.15, w: msW - 0.7, h: 0.3,
      fontFace: F.body, fontSize: 9, color: C.text3, margin: 0,
    });
  });

  // CTA strap
  s.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 0.95, w: CONTENT_W, h: 0,
    line: { color: C.border, width: 0.75 },
  });
  s.addText('When intelligence becomes infinite, structure becomes the only advantage.', {
    x: MARGIN_X, y: H - 0.75, w: CONTENT_W * 0.7, h: 0.35,
    fontFace: F.body, fontSize: 12, color: C.text2, italic: true, margin: 0,
  });
  s.addText('nicole@grddd.com', {
    x: W - MARGIN_X - 4, y: H - 0.75, w: 4, h: 0.35,
    fontFace: F.body, fontSize: 12, color: C.brand, align: 'right', margin: 0,
  });

  footer(s, 14, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 15 — Close / Vision
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();

  s.addShape(pres.shapes.OVAL, {
    x: 1, y: -5, w: 12, h: 10,
    fill: { color: C.brand, transparency: 93 },
    line: { color: C.bg, width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: 7, y: 4, w: 8, h: 6,
    fill: { color: C.purple, transparency: 95 },
    line: { color: C.bg, width: 0 },
  });

  gridLogo(s, MARGIN_X, 0.55, 0.5);
  s.addText('GRID', {
    x: MARGIN_X + 0.5, y: 0.57, w: 2, h: 0.4,
    fontFace: F.body, fontSize: 11, color: C.text2, charSpacing: 5, margin: 0,
  });
  eyebrow(s, 'CLOSE', W - MARGIN_X - 2, 0.6, C.brand);

  s.addText('Build the structure layer', {
    x: MARGIN_X, y: 2.1, w: CONTENT_W, h: 0.95,
    fontFace: F.display, fontSize: 52, color: C.text1, align: 'center',
    bold: false, margin: 0,
  });
  s.addText('before the intelligence layer locks in.', {
    x: MARGIN_X, y: 3.05, w: CONTENT_W, h: 0.95,
    fontFace: F.display, fontSize: 52, color: C.brand, align: 'center',
    bold: false, margin: 0,
  });

  s.addText(
    'The next 18 months decide whose structure the agent layer runs on. Every month that passes, Notion, Monday and the LLM vendors compound lock-in with shallow structure. GRID is the only system whose core thesis is that structure matters more than the model.',
    {
      x: MARGIN_X + 1.3, y: 4.35, w: CONTENT_W - 2.6, h: 1.1,
      fontFace: F.body, fontSize: 13, color: C.text2, align: 'center', margin: 0,
    }
  );

  const pillars = [
    { title: 'Now',       value: 'Alpha live',   sub: 'private partners testing',           color: C.brand },
    { title: 'Next',      value: 'May 2026',     sub: 'public beta opens',                  color: C.blue },
    { title: 'Built',     value: '18 months',    sub: 'solo  ·  $0 burn  ·  production-ready', color: C.purple },
  ];
  const pColW = (CONTENT_W - 0.5) / 3;
  const pY = 5.65;
  const pH = 1.05;
  pillars.forEach((p, i) => {
    const x = MARGIN_X + i * (pColW + 0.25);
    card(s, x, pY, pColW, pH);
    s.addText(p.title, {
      x: x + 0.3, y: pY + 0.15, w: pColW - 0.6, h: 0.25,
      fontFace: F.body, fontSize: 9, color: p.color, charSpacing: 3, margin: 0,
    });
    s.addText(p.value, {
      x: x + 0.3, y: pY + 0.35, w: pColW * 0.45, h: 0.55,
      fontFace: F.display, fontSize: 24, color: C.text1, bold: false, margin: 0,
    });
    s.addText(p.sub, {
      x: x + pColW * 0.45, y: pY + 0.45, w: pColW * 0.55 - 0.3, h: 0.55,
      fontFace: F.body, fontSize: 9, color: C.text3, margin: 0,
    });
  });

  s.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 0.85, w: CONTENT_W, h: 0,
    line: { color: C.border, width: 0.75 },
  });
  s.addText('Let\u2019s talk.', {
    x: MARGIN_X, y: H - 0.7, w: 4, h: 0.35,
    fontFace: F.body, fontSize: 13, color: C.text2, italic: true, margin: 0,
  });
  s.addText('nicole@grddd.com', {
    x: W - MARGIN_X - 6, y: H - 0.7, w: 6, h: 0.35,
    fontFace: F.body, fontSize: 13, color: C.brand, align: 'right', margin: 0,
  });

  s.addText('GRID', {
    x: MARGIN_X, y: H - 0.38, w: 2, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText(`${TOTAL} / ${TOTAL}`, {
    x: W - MARGIN_X - 2, y: H - 0.38, w: 2, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, align: 'right', margin: 0,
  });
  s.addText('Pre-seed \u2014 2026', {
    x: W / 2 - 2, y: H - 0.38, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, align: 'center', charSpacing: 2,
    margin: 0,
  });
}

// ── Write ──────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: 'pitch/GRID_pitch_deck.pptx' }).then((fn) => {
  console.log('Wrote', fn);
});
