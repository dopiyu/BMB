// Onboarding questionnaire. Edit QUESTIONS to change what new users are asked.
// Each answer is saved under profile.onboarding.answers[id] and sent to the AI Coach.
// buildPlan() in program.js reads: goal, experience, days, place, length, limits.

export const ONBOARDING_VERSION = 1;

export const QUESTIONS = [
  {
    id: 'goal', type: 'single', title: 'What do you want from the gym?',
    help: 'Pick the one that matters most right now.',
    options: [
      { value: 'consistency', label: 'Build a habit', sub: 'Show up regularly and feel better' },
      { value: 'fat-loss', label: 'Lose fat', sub: 'Get leaner and lighter' },
      { value: 'muscle', label: 'Build muscle', sub: 'Look stronger and fuller' },
      { value: 'strength', label: 'Get stronger', sub: 'Lift more over time' },
    ],
  },
  {
    id: 'experience', type: 'single', title: 'How much have you trained before?',
    options: [
      { value: 'new', label: 'Never, or not in years', sub: 'Brand new to the gym' },
      { value: 'some', label: 'A little', sub: 'Under 6 months, on and off' },
      { value: 'regular', label: 'Regularly', sub: '6 months or more' },
    ],
  },
  {
    id: 'days', type: 'single', title: 'How many days a week can you train?',
    help: 'Be realistic. Showing up 3 days every week beats 5 days for one week.',
    options: [
      { value: '2', label: '2 days' },
      { value: '3', label: '3 days' },
      { value: '4', label: '4 days' },
      { value: '5', label: '5 days' },
    ],
  },
  {
    id: 'place', type: 'single', title: 'Where will you train?',
    options: [
      { value: 'gym', label: 'Gym', sub: 'Machines and cables' },
      { value: 'home', label: 'Home with dumbbells' },
      { value: 'bodyweight', label: 'Anywhere, no equipment' },
    ],
  },
  {
    id: 'length', type: 'single', title: 'How long can each workout be?',
    options: [
      { value: '30', label: '30 minutes' },
      { value: '45', label: '45 minutes' },
      { value: '60', label: '60 minutes' },
    ],
  },
  {
    id: 'limits', type: 'multi', optional: true, sensitive: true,
    title: 'Anything we should go easy on?',
    help: 'Optional. Used only to keep your plan safe, and you can change it any time. If something hurts, check with a doctor or physio first.',
    options: [
      { value: 'knees', label: 'Knees' },
      { value: 'lower-back', label: 'Lower back' },
      { value: 'shoulders', label: 'Shoulders' },
    ],
  },
];

export const answerLabel = (q, v) => {
  if (Array.isArray(v)) return v.length ? v.map((x) => answerLabel(q, x)).join(', ') : 'Nothing';
  return q.options.find((o) => o.value === v)?.label || '';
};
