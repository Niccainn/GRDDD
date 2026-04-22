/**
 * The five-question onboarding interview.
 *
 * Kills the blank-page problem for AI products. A user who can't
 * describe what they want Nova to run can always answer these. The
 * answers feed Nova, not the other way around; Nova writes the
 * proposal.
 *
 * Questions are deliberately short. One sentence each. Placeholder
 * text models the honesty we want the user to match.
 */

export type InterviewQuestion = {
  id: string;
  prompt: string;
  placeholder: string;
  why: string;
};

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'monday',
    prompt: 'What do you spend Monday morning doing?',
    placeholder: 'e.g. Reading 70 emails from the weekend and triaging customer issues.',
    why: 'Tells Nova the rhythm of your week and where the most painful recurring work starts.',
  },
  {
    id: 'hate',
    prompt: 'What do you hate doing that keeps coming back?',
    placeholder: 'e.g. Copying numbers from Stripe into a Google Sheet every Friday.',
    why: 'The fastest automation wins start here — the tasks you already resent.',
  },
  {
    id: 'cracks',
    prompt: 'Where does work fall through the cracks on your team?',
    placeholder: 'e.g. Customer escalations — we hear about them three days late.',
    why: 'This becomes Nova\'s first "exception" to watch for.',
  },
  {
    id: 'fired',
    prompt: 'What would your boss fire you for missing?',
    placeholder: 'e.g. Dropping the ball on a renewal conversation that matters.',
    why: 'Names the boundary Nova must never cross without asking you.',
  },
  {
    id: 'twelve',
    prompt: 'What do you want to own in twelve months?',
    placeholder: 'e.g. Zero-touch inbound triage. I never read a support ticket first.',
    why: 'Gives Nova the direction of travel — so today\'s actions compound.',
  },
];
