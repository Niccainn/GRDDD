/**
 * Transcription adapter.
 *
 * `processMeeting` is the single entry point that turns a Meeting row
 * into a populated one (transcript + summary + action items). In
 * production this fans out to Whisper / Anthropic; in alpha it returns
 * a deterministic mock derived from the meeting's title, description,
 * and attendee list so the UI ships real end-to-end before the
 * transcription backend is wired.
 *
 * Keep the signature provider-agnostic — consumers don't care whether
 * the bytes came from a Whisper call or a mock generator.
 */

export type TranscribeResult = {
  transcript: string;
  summary: string;
  actionItems: string[];
};

type Input = {
  title: string;
  description: string | null;
  attendees: string[];
};

function speakerFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || 'Participant';
}

export async function processMeeting(input: Input): Promise<TranscribeResult> {
  const speakers = (input.attendees.length > 0
    ? input.attendees.map(speakerFromEmail)
    : ['Host', 'Participant']
  ).slice(0, 4);

  const topic = input.title.trim() || 'this meeting';
  const context = input.description?.trim() ?? '';

  const line = (speaker: string, text: string) => `**${speaker}** — ${text}`;

  const transcriptLines = [
    line(speakers[0], `Thanks everyone for joining. We're here to talk about ${topic}.`),
    context ? line(speakers[1] ?? speakers[0], `Quick context: ${context}`) : null,
    line(speakers[1] ?? speakers[0], `I've put together a short brief — happy to walk through it.`),
    line(speakers[2] ?? speakers[0], `A few questions on scope before we commit — what's the deadline we're working to?`),
    line(speakers[0], `Let's aim to close this out by end of next week. I'll own the follow-up.`),
    line(speakers[1] ?? speakers[0], `I can pull the data we need and share a draft by Thursday.`),
    line(speakers[2] ?? speakers[0], `Good. I'll set up a review slot once the draft's in.`),
    line(speakers[0], `Alright — action items captured. Anything else before we wrap?`),
  ].filter(Boolean);

  const transcript = transcriptLines.join('\n\n');

  const summary = [
    `Discussed ${topic}${context ? ` (${context})` : ''}.`,
    `${speakers[0]} owns follow-up for end of next week.`,
    `${speakers[1] ?? speakers[0]} will share a draft by Thursday; ${speakers[2] ?? speakers[0]} will review.`,
  ].join(' ');

  const actionItems = [
    `${speakers[0]} to close out ${topic} by end of next week`,
    `${speakers[1] ?? speakers[0]} to share a draft by Thursday`,
    `${speakers[2] ?? speakers[0]} to schedule a review slot once the draft lands`,
  ];

  return { transcript, summary, actionItems };
}
