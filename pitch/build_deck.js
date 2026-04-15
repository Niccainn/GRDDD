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

// GRID logo mark — rectangle with two inner vertical lines that curve at bottom.
// Drawn via thin rectangles + small ovals at corners to suggest the mark.
function gridLogo(slide, x, y, size = 0.55, color = C.brand) {
  // Outer frame
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: size * 0.79, h: size,
    fill: { color: C.bg }, line: { color, width: 1.25 },
    rectRadius: 0.06,
  });
  // Two inner vertical lines
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

  // Ambient gradient disk (upper)
  s.addShape(pres.shapes.OVAL, {
    x: 2, y: -4, w: 10, h: 8,
    fill: { color: C.brand, transparency: 94 },
    line: { color: C.bg, width: 0 },
  });
  // Ambient disk (lower left)
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

  // Top-left logo strap
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
  s.addText('THE END OF OPERATIONAL OVERHEAD', {
    x: MARGIN_X, y: 2.35, w: CONTENT_W, h: 0.35,
    fontFace: F.body, fontSize: 10, color: C.brand, charSpacing: 5, align: 'center', margin: 0,
  });

  // Headline line 1 — white
  s.addText('One person.', {
    x: MARGIN_X, y: 2.75, w: CONTENT_W, h: 0.95,
    fontFace: F.display, fontSize: 60, color: C.text1, align: 'center',
    bold: false, margin: 0,
  });
  // Headline line 2 — brand
  s.addText('The output of an entire team.', {
    x: MARGIN_X, y: 3.65, w: CONTENT_W, h: 0.95,
    fontFace: F.display, fontSize: 60, color: C.brand, align: 'center',
    bold: false, margin: 0,
  });

  // Sub
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
  s.addText('Nicole  ·  Founder', {
    x: MARGIN_X, y: H - 0.72, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
  });
  s.addText('$350K target  ·  $500K hard cap', {
    x: W - MARGIN_X - 4, y: H - 0.72, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 10, color: C.brand, align: 'right', margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 2 — The problem
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'THE PROBLEM', MARGIN_X, 0.6);

  s.addText('Every knowledge company drowns in coordination overhead.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 32, color: C.text1, bold: false, margin: 0,
  });

  s.addText(
    'A 50-person company spends $600K+ per year on roles whose entire purpose is moving information between humans: project managers, ops analysts, content coordinators, social managers. They exist because no system maps the work itself — only the meetings about it.',
    {
      x: MARGIN_X, y: 1.9, w: CONTENT_W * 0.72, h: 1.3,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // 4 problem stat cards
  const stats = [
    { value: '$600K',  label: 'wasted per 50-person org', sub: 'on coordination roles alone',   color: C.red },
    { value: '32h',    label: 'per content piece',        sub: 'research → draft → review → publish', color: C.yellow },
    { value: '62%',    label: 'of PM time',               sub: 'is synthesizing status updates', color: C.blue },
    { value: '0',      label: 'single source of truth',   sub: 'across tools, sheets, inboxes',  color: C.purple },
  ];
  const cardW = (CONTENT_W - 0.45) / 4;
  const cardY = 3.55;
  const cardH = 2.2;
  stats.forEach((stat, i) => {
    const x = MARGIN_X + i * (cardW + 0.15);
    card(s, x, cardY, cardW, cardH);
    // Accent line top
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: cardY + 0.01, w: cardW - 0.02, h: 0.04,
      fill: { color: stat.color }, line: { color: stat.color, width: 0 },
    });
    s.addText(stat.value, {
      x: x + 0.3, y: cardY + 0.35, w: cardW - 0.6, h: 0.9,
      fontFace: F.display, fontSize: 44, color: C.text1, bold: false, margin: 0,
    });
    s.addText(stat.label, {
      x: x + 0.3, y: cardY + 1.3, w: cardW - 0.6, h: 0.35,
      fontFace: F.body, fontSize: 11, color: C.text2, margin: 0,
    });
    s.addText(stat.sub, {
      x: x + 0.3, y: cardY + 1.62, w: cardW - 0.6, h: 0.5,
      fontFace: F.body, fontSize: 9, color: C.text3, margin: 0,
    });
  });

  s.addText(
    'Better AI does not fix this. More tools do not fix this. Only structure does.',
    {
      x: MARGIN_X, y: H - 1.1, w: CONTENT_W, h: 0.4,
      fontFace: F.body, fontSize: 13, color: C.brand, italic: true, margin: 0,
    }
  );

  footer(s, 2, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 3 — The insight / thesis
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'THE THESIS', MARGIN_X, 0.6);

  s.addText('When intelligence becomes infinite,', {
    x: MARGIN_X, y: 1.3, w: CONTENT_W, h: 0.95,
    fontFace: F.display, fontSize: 44, color: C.text1, bold: false, margin: 0,
  });
  s.addText('structure becomes the only advantage.', {
    x: MARGIN_X, y: 2.25, w: CONTENT_W, h: 0.95,
    fontFace: F.display, fontSize: 44, color: C.brand, bold: false, margin: 0,
  });

  s.addText(
    'AI performance is a function of environmental structure, not model capability. Better models do not fix broken systems. More data does not create alignment. Only structure does. GRID encodes this into software.',
    {
      x: MARGIN_X, y: 3.55, w: CONTENT_W * 0.68, h: 1.1,
      fontFace: F.body, fontSize: 14, color: C.text2, margin: 0,
    }
  );

  // Equation card
  const eqX = MARGIN_X, eqY = 5.0, eqW = CONTENT_W, eqH = 1.55;
  card(s, eqX, eqY, eqW, eqH);
  s.addText('THE GRID EQUATION', {
    x: eqX + 0.4, y: eqY + 0.25, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText([
    { text: 'S', options: { color: C.text2 } },
    { text: ' = ', options: { color: C.text3 } },
    { text: 'f', options: { color: C.brand } },
    { text: '(', options: { color: C.text3 } },
    { text: 'Id', options: { color: C.blue } },
    { text: ', ', options: { color: C.text3 } },
    { text: 'If', options: { color: C.purple } },
    { text: ', ', options: { color: C.text3 } },
    { text: 'In', options: { color: C.yellow } },
    { text: ')', options: { color: C.text3 } },
  ], {
    x: eqX + 0.4, y: eqY + 0.58, w: 4.6, h: 0.7,
    fontFace: F.mono, fontSize: 26, bold: false, margin: 0,
  });

  s.addText([
    { text: 'Identity', options: { color: C.blue, bold: false } },
    { text: ' — constrains', options: { color: C.text3 } },
  ], {
    x: eqX + 5.2, y: eqY + 0.55, w: 2.8, h: 0.35,
    fontFace: F.body, fontSize: 11, margin: 0,
  });
  s.addText([
    { text: 'Infrastructure', options: { color: C.purple, bold: false } },
    { text: ' — enables', options: { color: C.text3 } },
  ], {
    x: eqX + 5.2, y: eqY + 0.9, w: 3.2, h: 0.35,
    fontFace: F.body, fontSize: 11, margin: 0,
  });
  s.addText([
    { text: 'Intelligence', options: { color: C.yellow, bold: false } },
    { text: ' — adapts', options: { color: C.text3 } },
  ], {
    x: eqX + 8.6, y: eqY + 0.55, w: 3, h: 0.35,
    fontFace: F.body, fontSize: 11, margin: 0,
  });
  s.addText('Three variables. One equation.', {
    x: eqX + 8.6, y: eqY + 0.9, w: 3.5, h: 0.35,
    fontFace: F.body, fontSize: 11, color: C.text2, italic: true, margin: 0,
  });

  footer(s, 3, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Solution: architecture
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'THE SOLUTION', MARGIN_X, 0.6);

  s.addText('GRID is the structure layer for AI-native work.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 30, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Your organization becomes a system of adaptive environments — each a live dashboard of widgets that replace meetings, spreadsheets, and status updates.',
    {
      x: MARGIN_X, y: 1.85, w: CONTENT_W * 0.7, h: 0.7,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // Three architecture columns
  const items = [
    {
      n: '01', title: 'Environments', color: C.brand,
      body: 'Organizational containers — Operations, Marketing, Product. Each adapts to its team. White-label ready.',
    },
    {
      n: '02', title: 'Systems', color: C.blue,
      body: 'Structured functions inside environments. Health monitoring, goal tracking, intelligence — computed from real data.',
    },
    {
      n: '03', title: 'Workflows', color: C.purple,
      body: 'Multi-stage executable processes. Nova runs each stage, validates output, and delivers real artifacts — not summaries.',
    },
  ];
  const colW = (CONTENT_W - 0.5) / 3;
  const colY = 3.0;
  const colH = 3.1;
  items.forEach((it, i) => {
    const x = MARGIN_X + i * (colW + 0.25);
    card(s, x, colY, colW, colH);
    // Accent
    s.addText(it.n, {
      x: x + 0.4, y: colY + 0.35, w: 2, h: 0.3,
      fontFace: F.body, fontSize: 9, color: it.color, charSpacing: 4, margin: 0,
    });
    s.addText(it.title, {
      x: x + 0.4, y: colY + 0.75, w: colW - 0.8, h: 0.6,
      fontFace: F.display, fontSize: 22, color: C.text1, bold: false, margin: 0,
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.4, y: colY + 1.45, w: 0.8, h: 0,
      line: { color: it.color, width: 1 },
    });
    s.addText(it.body, {
      x: x + 0.4, y: colY + 1.65, w: colW - 0.8, h: 1.3,
      fontFace: F.body, fontSize: 12, color: C.text2, margin: 0,
    });
  });

  // Flow arrows between columns
  const arrowY = colY + colH / 2;
  for (let i = 0; i < 2; i++) {
    const x = MARGIN_X + (i + 1) * colW + i * 0.25 + 0.03;
    s.addText('→', {
      x: x, y: arrowY - 0.25, w: 0.3, h: 0.4,
      fontFace: F.body, fontSize: 18, color: C.text4, align: 'center', margin: 0,
    });
  }

  footer(s, 4, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Nova
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'THE ENGINE', MARGIN_X, 0.6);

  s.addText('Nova is not a chatbot.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 32, color: C.text1, bold: false, margin: 0,
  });
  s.addText('It is a constraint engine that reasons across your entire org.', {
    x: MARGIN_X, y: 1.75, w: CONTENT_W, h: 0.7,
    fontFace: F.display, fontSize: 22, color: C.purple, bold: false, margin: 0,
  });

  // Left description
  s.addText(
    'Nova reads every system, every workflow, every signal — and acts. It generates reports, triages incoming work, executes multi-stage workflows, and validates every output against your identity constraints.\n\nNova uses 11 operational tools and streams execution in real time. Every run is auditable. Every cost is capped.',
    {
      x: MARGIN_X, y: 2.85, w: 6.2, h: 3.5,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // Right capability chips
  const capX = 7.8, capY = 2.85, capW = CONTENT_W - 7.1;
  card(s, capX, capY, capW, 3.6, { fill: C.bgCardAlt, border: '2A1F3A' });
  s.addText('CAPABILITIES', {
    x: capX + 0.35, y: capY + 0.3, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.purple, charSpacing: 3, margin: 0,
  });
  const caps = [
    'Cross-system reasoning',
    '11 operational tools',
    'Quality validation scoring',
    'Memory + context retention',
    'Real-time streaming execution',
    'Automatic signal triage',
    'Per-tenant cost circuit breakers',
    'GDPR-compliant erasure + export',
  ];
  caps.forEach((c, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const cx = capX + 0.35 + col * (capW - 0.7) / 2;
    const cy = capY + 0.75 + row * 0.65;
    s.addShape(pres.shapes.OVAL, {
      x: cx, y: cy + 0.15, w: 0.08, h: 0.08,
      fill: { color: C.purple }, line: { color: C.purple, width: 0 },
    });
    s.addText(c, {
      x: cx + 0.18, y: cy, w: (capW - 0.7) / 2 - 0.2, h: 0.4,
      fontFace: F.body, fontSize: 11, color: C.text2, margin: 0,
    });
  });

  footer(s, 5, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Product mock: the Attention Widget
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'PRODUCT  ·  HOME', MARGIN_X, 0.6);
  s.addText('Attention, not notifications.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 30, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Signals, failed executions, at-risk goals and unhealthy systems — ranked into one focus stream. Built on tenant-isolated Prisma queries. Renders in <50ms.',
    {
      x: MARGIN_X, y: 1.8, w: CONTENT_W * 0.7, h: 0.55,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // ── Mock app chrome ────────────────────────────────────────────────────
  const appX = MARGIN_X, appY = 2.55, appW = CONTENT_W, appH = 4.3;
  card(s, appX, appY, appW, appH, { fill: '0B0B12', border: '1A1A24', radius: 0.1 });

  // Top bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: appX + 0.01, y: appY + 0.01, w: appW - 0.02, h: 0.45,
    fill: { color: '0D0D16' }, line: { color: '1A1A24', width: 0 },
  });
  // Traffic lights
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

  // Attention widget card
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

  // Attention rows
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
    // row bg
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
    // title
    s.addText(r.title, {
      x: awX + 0.95, y: ry + 0.04, w: awW - 2.2, h: 0.22,
      fontFace: F.body, fontSize: 10, color: C.text1, margin: 0,
    });
    // reason
    s.addText(r.reason, {
      x: awX + 0.95, y: ry + 0.22, w: awW - 2.2, h: 0.18,
      fontFace: F.body, fontSize: 8, color: C.text3, margin: 0,
    });
    // Score
    s.addText(String(r.score), {
      x: awX + awW - 0.85, y: ry + 0.08, w: 0.4, h: 0.25,
      fontFace: F.display, fontSize: 13,
      color: r.score >= 80 ? C.red : r.score >= 60 ? C.yellow : C.purple,
      align: 'right', margin: 0,
    });
    // Attention bar (track)
    const trackX = awX + 0.95, trackY = ry + rowH - 0.1, trackW = awW - 2.2, trackH = 0.04;
    s.addShape(pres.shapes.RECTANGLE, {
      x: trackX, y: trackY, w: trackW, h: trackH,
      fill: { color: '1E1E2A' }, line: { color: '1E1E2A', width: 0 },
    });
    // Attention bar (fill)
    s.addShape(pres.shapes.RECTANGLE, {
      x: trackX, y: trackY, w: trackW * (r.score / 100), h: trackH,
      fill: { color: r.score >= 80 ? C.red : r.score >= 60 ? C.yellow : C.purple, transparency: 15 },
      line: { color: C.bg, width: 0 },
    });
  });

  footer(s, 6, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Use cases
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'USE CASES', MARGIN_X, 0.6);
  s.addText('Every department. One system.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 30, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'GRID absorbs the coordination work across four categories of knowledge org, with shipped workflow templates for each.',
    {
      x: MARGIN_X, y: 1.8, w: CONTENT_W * 0.7, h: 0.5,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  const cases = [
    {
      dept: 'MARKETING', workflow: 'Social Media Campaign',
      stages: 'Narrative → Assets → Review → Publish',
      result: 'Full multi-platform campaign in 3 minutes. Instagram, Facebook, LinkedIn — copy, scheduling, analytics.',
      color: C.red,
    },
    {
      dept: 'CONTENT', workflow: 'Blog Post Pipeline',
      stages: 'Research → Draft → Review → Publish',
      result: 'SEO-optimized posts from brief to publish-ready. Nova writes, validates, and prepares metadata.',
      color: C.blue,
    },
    {
      dept: 'OPERATIONS', workflow: 'Client Onboarding',
      stages: 'Discovery → Setup → Training → Handoff',
      result: 'Structured onboarding that self-reports progress. Health scores track client engagement in real time.',
      color: C.brand,
    },
    {
      dept: 'ENGINEERING', workflow: 'Sprint Cycle',
      stages: 'Planning → Development → Review → Deploy',
      result: 'Sprint planning generated by Nova. Velocity tracked. Blockers surfaced automatically from signals.',
      color: C.purple,
    },
  ];
  const gridW = (CONTENT_W - 0.3) / 2;
  const gridH = 2.15;
  cases.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MARGIN_X + col * (gridW + 0.3);
    const y = 2.55 + row * (gridH + 0.22);
    card(s, x, y, gridW, gridH);
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: y + 0.01, w: gridW - 0.02, h: 0.04,
      fill: { color: c.color }, line: { color: c.color, width: 0 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.4, y: y + 0.4, w: 0.14, h: 0.14,
      fill: { color: c.color }, line: { color: c.color, width: 0 },
    });
    s.addText(c.dept, {
      x: x + 0.62, y: y + 0.33, w: 4, h: 0.3,
      fontFace: F.body, fontSize: 9, color: c.color, charSpacing: 3, margin: 0,
    });
    s.addText(c.workflow, {
      x: x + 0.4, y: y + 0.7, w: gridW - 0.8, h: 0.5,
      fontFace: F.display, fontSize: 18, color: C.text1, bold: false, margin: 0,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.4, y: y + 1.18, w: gridW - 0.8, h: 0.3,
      fill: { color: '15151F' }, line: { color: '1F1F2A', width: 0.5 },
      rectRadius: 0.04,
    });
    s.addText(c.stages, {
      x: x + 0.5, y: y + 1.18, w: gridW - 1, h: 0.3,
      fontFace: F.mono, fontSize: 9, color: C.text2, margin: 0, valign: 'middle',
    });
    s.addText(c.result, {
      x: x + 0.4, y: y + 1.52, w: gridW - 0.8, h: 0.6,
      fontFace: F.body, fontSize: 10, color: C.text3, margin: 0,
    });
  });

  footer(s, 7, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 8 — Case studies / archetypes
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'CASE STUDIES  ·  DESIGN PARTNER ARCHETYPES', MARGIN_X, 0.6);
  s.addText('Who GRID replaces on day one.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 30, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Three archetypes we are onboarding in the closed alpha. Each represents a different cost curve GRID collapses.',
    {
      x: MARGIN_X, y: 1.8, w: CONTENT_W * 0.75, h: 0.5,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  const archetypes = [
    {
      tag: 'SOLO OPERATOR',
      color: C.brand,
      title: 'The content founder',
      who: 'Solo marketing founder, $8K/mo ad spend, publishes 3× / week',
      problem: 'Needs a 3-person content team to stay consistent',
      with: 'Runs 1 content workflow, publishes on 4 platforms automatically, reviews Nova output in 10 min/day',
      saving: 'Replaces: $18K/mo in fractional content hires',
    },
    {
      tag: 'MID-MARKET OPS',
      color: C.blue,
      title: 'The 50-person knowledge org',
      who: '50-person services firm, 3 PMs, 2 analysts, 1 ops lead',
      problem: 'Coordination overhead eats 30% of senior time',
      with: 'Replaces PM status layer + analyst reporting with live GRID environments per client',
      saving: 'Replaces: $600K/yr in coordination roles',
    },
    {
      tag: 'AGENCY  /  WHITELABEL',
      color: C.purple,
      title: 'The agency reseller',
      who: 'Marketing agency managing 12 client accounts',
      problem: 'Each client needs custom dashboards the agency has to build',
      with: 'White-labels GRID per client, brands with client logo + color, bills $299/environment',
      saving: 'Adds: $43K/yr margin on 12 clients',
    },
  ];
  const colW = (CONTENT_W - 0.5) / 3;
  const colY = 2.6;
  const colH = 4.3;
  archetypes.forEach((a, i) => {
    const x = MARGIN_X + i * (colW + 0.25);
    card(s, x, colY, colW, colH);
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: colY + 0.01, w: colW - 0.02, h: 0.04,
      fill: { color: a.color }, line: { color: a.color, width: 0 },
    });
    s.addText(a.tag, {
      x: x + 0.35, y: colY + 0.35, w: colW - 0.7, h: 0.3,
      fontFace: F.body, fontSize: 9, color: a.color, charSpacing: 3, margin: 0,
    });
    s.addText(a.title, {
      x: x + 0.35, y: colY + 0.65, w: colW - 0.7, h: 0.6,
      fontFace: F.display, fontSize: 18, color: C.text1, bold: false, margin: 0,
    });
    // Who
    s.addText('WHO', {
      x: x + 0.35, y: colY + 1.35, w: 2, h: 0.22,
      fontFace: F.body, fontSize: 8, color: C.text4, charSpacing: 2, margin: 0,
    });
    s.addText(a.who, {
      x: x + 0.35, y: colY + 1.55, w: colW - 0.7, h: 0.55,
      fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
    });
    // Problem
    s.addText('PROBLEM', {
      x: x + 0.35, y: colY + 2.15, w: 2, h: 0.22,
      fontFace: F.body, fontSize: 8, color: C.text4, charSpacing: 2, margin: 0,
    });
    s.addText(a.problem, {
      x: x + 0.35, y: colY + 2.35, w: colW - 0.7, h: 0.55,
      fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
    });
    // With GRID
    s.addText('WITH GRID', {
      x: x + 0.35, y: colY + 2.95, w: 2, h: 0.22,
      fontFace: F.body, fontSize: 8, color: a.color, charSpacing: 2, margin: 0,
    });
    s.addText(a.with, {
      x: x + 0.35, y: colY + 3.15, w: colW - 0.7, h: 0.7,
      fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
    });
    // Saving chip
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.35, y: colY + colH - 0.55, w: colW - 0.7, h: 0.38,
      fill: { color: a.color, transparency: 88 },
      line: { color: a.color, width: 0.5 },
      rectRadius: 0.04,
    });
    s.addText(a.saving, {
      x: x + 0.35, y: colY + colH - 0.55, w: colW - 0.7, h: 0.38,
      fontFace: F.body, fontSize: 10, color: a.color, align: 'center', valign: 'middle',
      margin: 0,
    });
  });

  footer(s, 8, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Market
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

  // Concentric market rings
  const rings = [
    { label: 'TAM', sub: 'Global coordination labor',      value: '$2.1T', desc: 'PMs, ops, content, social — annual salary spend across all knowledge orgs', color: C.brand },
    { label: 'SAM', sub: 'English-speaking SMB + mid-mkt', value: '$310B', desc: 'Companies 10–500 where a single founder can buy without procurement', color: C.blue },
    { label: 'SOM', sub: '5-year capturable',              value: '$180M', desc: '18K seats × $99/mo average at 1% SAM penetration — conservative floor',   color: C.purple },
  ];
  const cardY = 2.75;
  const cardH = 3.4;
  const cardW = (CONTENT_W - 0.5) / 3;
  rings.forEach((r, i) => {
    const x = MARGIN_X + i * (cardW + 0.25);
    card(s, x, cardY, cardW, cardH);
    s.addText(r.label, {
      x: x + 0.4, y: cardY + 0.35, w: 3, h: 0.3,
      fontFace: F.body, fontSize: 9, color: r.color, charSpacing: 4, margin: 0,
    });
    s.addText(r.sub, {
      x: x + 0.4, y: cardY + 0.65, w: cardW - 0.8, h: 0.3,
      fontFace: F.body, fontSize: 10, color: C.text3, margin: 0,
    });
    s.addText(r.value, {
      x: x + 0.4, y: cardY + 1.15, w: cardW - 0.8, h: 1.3,
      fontFace: F.display, fontSize: 56, color: C.text1, bold: false, margin: 0,
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.4, y: cardY + 2.4, w: 0.8, h: 0,
      line: { color: r.color, width: 1 },
    });
    s.addText(r.desc, {
      x: x + 0.4, y: cardY + 2.55, w: cardW - 0.8, h: 0.85,
      fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
    });
  });

  s.addText('Every % of knowledge-work coordination we absorb = 10× the per-seat SaaS alternative.', {
    x: MARGIN_X, y: H - 1.05, w: CONTENT_W, h: 0.35,
    fontFace: F.body, fontSize: 12, color: C.text3, italic: true, margin: 0,
  });

  footer(s, 9, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Traction (rewritten, no 1,000 waitlist)
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'TRACTION', MARGIN_X, 0.6);
  s.addText('Two years. One founder. Shipped.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 32, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'GRID is already in production. Every system below is live in the repo, hardened, and running on a single founder\'s infrastructure.',
    {
      x: MARGIN_X, y: 1.85, w: CONTENT_W * 0.78, h: 0.55,
      fontFace: F.body, fontSize: 13, color: C.text2, margin: 0,
    }
  );

  // Left column: stat callouts
  const statsX = MARGIN_X;
  const statsY = 2.7;
  const statRowH = 1.1;
  const leftW = 5.6;
  const bigStats = [
    { value: '2 yrs', label: 'Bootstrapped solo', sub: 'Zero outside capital' },
    { value: '11',    label: 'Nova operational tools', sub: 'Shipped and auditable' },
    { value: '44+',   label: 'API routes, tenant-isolated', sub: 'GDPR Art 17 + 20 compliant' },
    { value: '$0',    label: 'Burn to date',            sub: 'One Anthropic account as sole resource' },
  ];
  bigStats.forEach((st, i) => {
    const y = statsY + i * statRowH;
    card(s, statsX, y, leftW, statRowH - 0.15);
    s.addText(st.value, {
      x: statsX + 0.35, y: y + 0.15, w: 1.9, h: 0.7,
      fontFace: F.display, fontSize: 32, color: C.brand, bold: false, margin: 0,
    });
    s.addText(st.label, {
      x: statsX + 2.3, y: y + 0.2, w: leftW - 2.5, h: 0.35,
      fontFace: F.body, fontSize: 12, color: C.text1, margin: 0,
    });
    s.addText(st.sub, {
      x: statsX + 2.3, y: y + 0.52, w: leftW - 2.5, h: 0.35,
      fontFace: F.body, fontSize: 10, color: C.text3, margin: 0,
    });
  });

  // Right column: milestones shipped
  const rX = MARGIN_X + leftW + 0.35;
  const rW = CONTENT_W - leftW - 0.35;
  card(s, rX, statsY, rW, statRowH * 4 - 0.15);
  s.addText('SHIPPED', {
    x: rX + 0.35, y: statsY + 0.3, w: 3, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.brand, charSpacing: 3, margin: 0,
  });
  s.addText('What is live today', {
    x: rX + 0.35, y: statsY + 0.55, w: rW - 0.7, h: 0.35,
    fontFace: F.display, fontSize: 16, color: C.text1, bold: false, margin: 0,
  });
  const shipped = [
    'Multi-tenant architecture with ownership guards across every route',
    'Nova constraint engine: 11 tools, streaming execution, quality validation',
    'Session auth hardened (sameSite strict, CSRF defense, rate-limited)',
    'GDPR Article 17 erasure + Article 20 portability flows',
    'Upstash Redis distributed rate limiting (fail-open to in-memory)',
    'Attention-ranking home widget, signal triage, goal tracking',
    'Daily encrypted Postgres backups via GitHub Actions',
    'Per-tenant daily cost circuit breakers ($10/day default)',
  ];
  shipped.forEach((line, i) => {
    const ly = statsY + 1.0 + i * 0.33;
    s.addShape(pres.shapes.RECTANGLE, {
      x: rX + 0.4, y: ly + 0.11, w: 0.1, h: 0.04,
      fill: { color: C.brand }, line: { color: C.brand, width: 0 },
    });
    s.addText(line, {
      x: rX + 0.6, y: ly, w: rW - 1, h: 0.3,
      fontFace: F.body, fontSize: 10, color: C.text2, margin: 0,
    });
  });

  footer(s, 10, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Business model
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'BUSINESS MODEL  ·  PRICING', MARGIN_X, 0.6);
  s.addText('Four tiers. Margin protected at every level.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.8,
    fontFace: F.display, fontSize: 28, color: C.text1, bold: false, margin: 0,
  });
  s.addText(
    'Median user costs us ~$22/mo at current Anthropic rates. Per-tenant daily caps enforce a worst-case ceiling. Gross margin stays above 78% in the worst case and above 92% at the median.',
    {
      x: MARGIN_X, y: 1.75, w: CONTENT_W * 0.85, h: 0.6,
      fontFace: F.body, fontSize: 12, color: C.text2, margin: 0,
    }
  );

  // ── 4-tier pricing grid ─────────────────────────────────────────────────
  const tiers = [
    {
      name: 'HOBBY',
      color: C.text2,
      price: 'Free',
      unit: '',
      seats: '1 user  ·  1 environment',
      margin: 'Acquisition funnel',
      features: [
        '$2 / day AI cap',
        'Nova with 5 tools',
        'Community support',
        'Public-template workflows',
      ],
    },
    {
      name: 'STARTER',
      color: C.brand,
      price: '$39',
      unit: '/user / mo',
      seats: 'Up to 5 seats  ·  1 environment',
      margin: '~44% GM',
      features: [
        'Nova with 11 tools',
        '$10 / day AI cap',
        'Signals  ·  goals  ·  workflows',
        'Email support',
      ],
    },
    {
      name: 'GROWTH',
      color: C.blue,
      price: '$99',
      unit: '/user / mo',
      seats: 'Up to 50 seats  ·  5 environments',
      margin: '~78% GM',
      features: [
        'Everything in Starter',
        '$50 / day AI cap',
        'Custom workflows  ·  API  ·  webhooks',
        'Priority support',
      ],
    },
    {
      name: 'ENTERPRISE',
      color: C.purple,
      price: '$299',
      unit: '/user / mo',
      seats: 'Unlimited  ·  White-label',
      margin: '~92% GM',
      features: [
        'Everything in Growth',
        'White-label branding  ·  SSO',
        'Audit logs  ·  custom AI caps',
        'Design partner SLA',
      ],
    },
  ];
  const gap = 0.2;
  const colW = (CONTENT_W - gap * 3) / 4;
  const colY = 2.55;
  const colH = 3.7;
  tiers.forEach((t, i) => {
    const x = MARGIN_X + i * (colW + gap);
    card(s, x, colY, colW, colH);
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.01, y: colY + 0.01, w: colW - 0.02, h: 0.04,
      fill: { color: t.color }, line: { color: t.color, width: 0 },
    });
    s.addText(t.name, {
      x: x + 0.3, y: colY + 0.3, w: colW - 0.6, h: 0.3,
      fontFace: F.body, fontSize: 9, color: t.color, charSpacing: 4, margin: 0,
    });
    s.addText([
      { text: t.price, options: { fontSize: 34, color: C.text1 } },
      { text: t.unit, options: { fontSize: 10, color: C.text3 } },
    ], {
      x: x + 0.3, y: colY + 0.65, w: colW - 0.6, h: 0.9,
      fontFace: F.display, bold: false, margin: 0,
    });
    s.addText(t.seats, {
      x: x + 0.3, y: colY + 1.55, w: colW - 0.6, h: 0.3,
      fontFace: F.body, fontSize: 9, color: C.text3, margin: 0,
    });
    // Margin chip
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.3, y: colY + 1.85, w: colW - 0.6, h: 0.3,
      fill: { color: t.color, transparency: 88 },
      line: { color: t.color, width: 0.5 },
      rectRadius: 0.04,
    });
    s.addText(t.margin, {
      x: x + 0.3, y: colY + 1.85, w: colW - 0.6, h: 0.3,
      fontFace: F.body, fontSize: 9, color: t.color, align: 'center', valign: 'middle',
      margin: 0,
    });
    s.addShape(pres.shapes.LINE, {
      x: x + 0.3, y: colY + 2.3, w: colW - 0.6, h: 0,
      line: { color: C.border, width: 0.75 },
    });
    t.features.forEach((f, fi) => {
      const fy = colY + 2.4 + fi * 0.3;
      s.addText('✓', {
        x: x + 0.3, y: fy, w: 0.25, h: 0.3,
        fontFace: F.body, fontSize: 9, color: t.color, margin: 0,
      });
      s.addText(f, {
        x: x + 0.52, y: fy, w: colW - 0.82, h: 0.3,
        fontFace: F.body, fontSize: 9, color: C.text2, margin: 0,
      });
    });
  });

  // ── Add-ons strip ────────────────────────────────────────────────────────
  const addY = 6.4;
  const addH = 0.55;
  card(s, MARGIN_X, addY, CONTENT_W, addH, { fill: C.bgCardAlt });
  s.addText('ADD-ONS', {
    x: MARGIN_X + 0.3, y: addY, w: 1.3, h: addH,
    fontFace: F.body, fontSize: 9, color: C.text3, charSpacing: 3,
    valign: 'middle', margin: 0,
  });
  const addons = [
    { label: 'Annual billing',  value: '−20%',         color: C.brand },
    { label: 'Extra AI cap',    value: '$0.02 / 1K tok', color: C.blue },
    { label: 'SSO add-on',      value: '$500 / mo',    color: C.purple },
    { label: 'White-label env', value: '$299 / env / mo', color: C.yellow },
  ];
  const addColW = (CONTENT_W - 1.6) / addons.length;
  addons.forEach((a, i) => {
    const ax = MARGIN_X + 1.5 + i * addColW;
    s.addShape(pres.shapes.OVAL, {
      x: ax, y: addY + addH / 2 - 0.05, w: 0.1, h: 0.1,
      fill: { color: a.color }, line: { color: a.color, width: 0 },
    });
    s.addText([
      { text: a.label, options: { color: C.text2, fontSize: 9 } },
      { text: '  ', options: {} },
      { text: a.value, options: { color: a.color, fontSize: 9, bold: false } },
    ], {
      x: ax + 0.2, y: addY, w: addColW - 0.2, h: addH,
      fontFace: F.body, valign: 'middle', margin: 0,
    });
  });

  footer(s, 11, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Competition / moat
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'COMPETITION  ·  MOAT', MARGIN_X, 0.6);
  s.addText('Everyone is building chat. We are building structure.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 28, color: C.text1, bold: false, margin: 0,
  });

  // 2x2 positioning map
  const mapX = MARGIN_X, mapY = 2.1, mapW = 7.0, mapH = 4.5;
  card(s, mapX, mapY, mapW, mapH, { fill: '0C0C14' });
  // Axes
  s.addShape(pres.shapes.LINE, {
    x: mapX + mapW / 2, y: mapY + 0.2, w: 0, h: mapH - 0.4,
    line: { color: C.border, width: 0.75 },
  });
  s.addShape(pres.shapes.LINE, {
    x: mapX + 0.2, y: mapY + mapH / 2, w: mapW - 0.4, h: 0,
    line: { color: C.border, width: 0.75 },
  });
  // Axis labels
  s.addText('STRUCTURE-FIRST →', {
    x: mapX + mapW / 2 + 0.1, y: mapY + 0.1, w: mapW / 2 - 0.2, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText('← CHAT-FIRST', {
    x: mapX + 0.2, y: mapY + 0.1, w: mapW / 2 - 0.2, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText('AI-NATIVE ↑', {
    x: mapX + 0.1, y: mapY + 0.4, w: 1.5, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText('↓ TEMPLATE-OPS', {
    x: mapX + 0.1, y: mapY + mapH - 0.4, w: 1.7, h: 0.25,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });

  // Competitor dots
  const dots = [
    { name: 'ChatGPT',  x: 0.22, y: 0.20, color: C.text3 },
    { name: 'Claude',   x: 0.16, y: 0.28, color: C.text3 },
    { name: 'Notion AI',x: 0.35, y: 0.55, color: C.text3 },
    { name: 'Monday',   x: 0.62, y: 0.72, color: C.text3 },
    { name: 'Asana',    x: 0.72, y: 0.78, color: C.text3 },
    { name: 'Linear',   x: 0.80, y: 0.60, color: C.text3 },
    { name: 'GRID',     x: 0.82, y: 0.18, color: C.brand, big: true },
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

  // Right side: moat bullets
  const mtX = mapX + mapW + 0.35;
  const mtW = CONTENT_W - mapW - 0.35;
  const moats = [
    { title: 'Structure as thesis', body: 'The only ops tool whose core claim is that models do not matter — structure does. A hard-to-copy point of view.' },
    { title: 'Multi-tenant by default', body: '44+ routes behind ownership guards from day one. Competitors bolt this on years later.' },
    { title: 'Identity constraints', body: 'Every output validated against a tenant identity. Alignment becomes a built-in property, not a prompt.' },
    { title: 'White-label at the seat level', body: 'Agencies can rebrand GRID per client. Distribution wedge competitors cannot match without a rewrite.' },
  ];
  s.addText('WHY WE WIN', {
    x: mtX, y: mapY + 0.05, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.brand, charSpacing: 3, margin: 0,
  });
  moats.forEach((m, i) => {
    const my = mapY + 0.4 + i * 1.05;
    s.addShape(pres.shapes.LINE, {
      x: mtX, y: my + 0.15, w: 0.25, h: 0,
      line: { color: C.brand, width: 1.5 },
    });
    s.addText(m.title, {
      x: mtX + 0.35, y: my, w: mtW - 0.35, h: 0.3,
      fontFace: F.body, fontSize: 12, color: C.text1, bold: false, margin: 0,
    });
    s.addText(m.body, {
      x: mtX + 0.35, y: my + 0.3, w: mtW - 0.35, h: 0.7,
      fontFace: F.body, fontSize: 10, color: C.text3, margin: 0,
    });
  });

  footer(s, 12, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Team
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  eyebrow(s, 'TEAM', MARGIN_X, 0.6);
  s.addText('One founder. Full stack. Two years in.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.85,
    fontFace: F.display, fontSize: 30, color: C.text1, bold: false, margin: 0,
  });

  // Founder card
  const fcX = MARGIN_X, fcY = 2.3, fcW = CONTENT_W, fcH = 2.8;
  card(s, fcX, fcY, fcW, fcH);

  // Avatar
  s.addShape(pres.shapes.OVAL, {
    x: fcX + 0.6, y: fcY + 0.55, w: 1.7, h: 1.7,
    fill: { color: C.brand, transparency: 80 },
    line: { color: C.brand, width: 1 },
  });
  s.addText('N', {
    x: fcX + 0.6, y: fcY + 0.55, w: 1.7, h: 1.7,
    fontFace: F.display, fontSize: 60, color: C.brand,
    align: 'center', valign: 'middle', bold: false, margin: 0,
  });

  s.addText('Nicole', {
    x: fcX + 2.65, y: fcY + 0.55, w: 8, h: 0.7,
    fontFace: F.display, fontSize: 30, color: C.text1, bold: false, margin: 0,
  });
  s.addText('Founder  ·  Engineer  ·  Designer', {
    x: fcX + 2.65, y: fcY + 1.2, w: 8, h: 0.35,
    fontFace: F.body, fontSize: 13, color: C.brand, charSpacing: 2, margin: 0,
  });
  s.addText(
    'Built GRID end-to-end over 24 months with no outside capital. Architected the multi-tenant data model, the Nova constraint engine, the workflow execution layer, the auth perimeter, and the entire design system. Background in product design and engineering. Operator-builder, not a manager-founder.',
    {
      x: fcX + 2.65, y: fcY + 1.6, w: fcW - 3.1, h: 1.1,
      fontFace: F.body, fontSize: 11, color: C.text2, margin: 0,
    }
  );

  // Hiring plan card
  const hX = MARGIN_X, hY = 5.3, hW = CONTENT_W, hH = 1.55;
  card(s, hX, hY, hW, hH, { fill: C.bgCardAlt });
  s.addText('POST-RAISE HIRING PLAN', {
    x: hX + 0.4, y: hY + 0.25, w: 5, h: 0.3,
    fontFace: F.body, fontSize: 9, color: C.text3, charSpacing: 3, margin: 0,
  });
  const hires = [
    { title: 'Technical co-founder or senior eng #1', when: 'Month 1',  color: C.brand },
    { title: 'GTM / design partner lead',            when: 'Month 3',  color: C.blue },
    { title: 'Founding designer (contract → FT)',    when: 'Month 6',  color: C.purple },
  ];
  hires.forEach((h, i) => {
    const x = hX + 0.4 + i * ((hW - 0.8) / 3);
    s.addShape(pres.shapes.OVAL, {
      x: x, y: hY + 0.75, w: 0.12, h: 0.12,
      fill: { color: h.color }, line: { color: h.color, width: 0 },
    });
    s.addText(h.title, {
      x: x + 0.2, y: hY + 0.62, w: (hW - 0.8) / 3 - 0.3, h: 0.35,
      fontFace: F.body, fontSize: 11, color: C.text1, margin: 0,
    });
    s.addText(h.when, {
      x: x + 0.2, y: hY + 0.92, w: (hW - 0.8) / 3 - 0.3, h: 0.3,
      fontFace: F.body, fontSize: 9, color: h.color, margin: 0,
    });
  });

  footer(s, 13, TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 14 — The ask
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();

  // Ambient brand wash
  s.addShape(pres.shapes.OVAL, {
    x: -3, y: -4, w: 10, h: 10,
    fill: { color: C.brand, transparency: 94 },
    line: { color: C.bg, width: 0 },
  });

  eyebrow(s, 'THE ASK', MARGIN_X, 0.6, C.brand);
  s.addText('$350K target.  $500K hard cap.', {
    x: MARGIN_X, y: 0.95, w: CONTENT_W, h: 0.9,
    fontFace: F.display, fontSize: 36, color: C.text1, bold: false, margin: 0,
  });
  s.addText('Pre-seed SAFE  ·  $3M post-money cap  ·  18 months runway', {
    x: MARGIN_X, y: 1.85, w: CONTENT_W, h: 0.5,
    fontFace: F.body, fontSize: 15, color: C.brand, charSpacing: 1, margin: 0,
  });

  // Use of funds — horizontal bar
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
      x: bx, y: ufY, w: w, h: ufH,
      fill: { color: u.color, transparency: 20 },
      line: { color: C.bg, width: 1.5 },
    });
    s.addText(`${Math.round(u.pct * 100)}%`, {
      x: bx, y: ufY + 0.15, w: w, h: 0.4,
      fontFace: F.display, fontSize: 16, color: C.text1,
      align: 'center', valign: 'middle', bold: false, margin: 0,
    });
    bx += w;
  });
  // Labels below
  bx = ufX;
  uses.forEach((u) => {
    const w = ufW * u.pct;
    s.addText(u.label, {
      x: bx, y: ufY + ufH + 0.1, w: w, h: 0.35,
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
    { n: '01', title: '5 paying design partners',       sub: 'Month 4',  color: C.brand },
    { n: '02', title: '$10K MRR',                       sub: 'Month 8',  color: C.blue },
    { n: '03', title: '3 published case studies',       sub: 'Month 10', color: C.purple },
    { n: '04', title: 'Seed-ready metrics package',     sub: 'Month 14', color: C.yellow },
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
// SLIDE 15 — Close / vision
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();

  // Ambient brand field — large diffuse disc top-center
  s.addShape(pres.shapes.OVAL, {
    x: 1, y: -5, w: 12, h: 10,
    fill: { color: C.brand, transparency: 93 },
    line: { color: C.bg, width: 0 },
  });
  // Secondary purple glow bottom-right
  s.addShape(pres.shapes.OVAL, {
    x: 7, y: 4, w: 8, h: 6,
    fill: { color: C.purple, transparency: 95 },
    line: { color: C.bg, width: 0 },
  });

  // Top strap
  gridLogo(s, MARGIN_X, 0.55, 0.5);
  s.addText('GRID', {
    x: MARGIN_X + 0.5, y: 0.57, w: 2, h: 0.4,
    fontFace: F.body, fontSize: 11, color: C.text2, charSpacing: 5, margin: 0,
  });
  eyebrow(s, 'CLOSE', W - MARGIN_X - 2, 0.6, C.brand);

  // Headline block — the thesis, finally at size
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

  // Sub — the why-now
  s.addText(
    'The next 18 months decide whose structure the agent layer runs on. Every month that passes, Notion, Monday and the LLM vendors compound lock-in with shallow structure. GRID is the only system whose core thesis is that structure matters more than the model.',
    {
      x: MARGIN_X + 1.3, y: 4.35, w: CONTENT_W - 2.6, h: 1.1,
      fontFace: F.body, fontSize: 13, color: C.text2, align: 'center', margin: 0,
    }
  );

  // Three closing pillars
  const pillars = [
    { title: 'Built',    value: '2 yrs',    sub: 'solo, bootstrapped, shipped',           color: C.brand },
    { title: 'Asking',   value: '$350K',    sub: 'pre-seed SAFE  ·  $3M cap',             color: C.blue },
    { title: 'Unlocks',  value: '18 mo',    sub: 'runway to 5 design partners + $10K MRR', color: C.purple },
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

  // CTA strap — bottom
  s.addShape(pres.shapes.LINE, {
    x: MARGIN_X, y: H - 0.85, w: CONTENT_W, h: 0,
    line: { color: C.border, width: 0.75 },
  });
  s.addText('Let us talk.', {
    x: MARGIN_X, y: H - 0.7, w: 4, h: 0.35,
    fontFace: F.body, fontSize: 13, color: C.text2, italic: true, margin: 0,
  });
  s.addText('nicole@grddd.com', {
    x: W - MARGIN_X - 6, y: H - 0.7, w: 6, h: 0.35,
    fontFace: F.body, fontSize: 13, color: C.brand, align: 'right', margin: 0,
  });

  // Page number only (no footer line — already drawn above)
  s.addText('GRID', {
    x: MARGIN_X, y: H - 0.38, w: 2, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, charSpacing: 3, margin: 0,
  });
  s.addText(`${TOTAL} / ${TOTAL}`, {
    x: W - MARGIN_X - 2, y: H - 0.38, w: 2, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, align: 'right', margin: 0,
  });
  s.addText('Pre-seed — 2026', {
    x: W / 2 - 2, y: H - 0.38, w: 4, h: 0.3,
    fontFace: F.body, fontSize: 8, color: C.text3, align: 'center', charSpacing: 2,
    margin: 0,
  });
}

// ── Write ──────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: 'pitch/GRID_pitch_deck.pptx' }).then((fn) => {
  console.log('Wrote', fn);
});
