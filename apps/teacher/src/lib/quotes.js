export const TEACHER_QUOTES = [
  "Every correction you give today becomes fluency tomorrow.",
  "Great teachers turn 30 days into a lifetime of confidence.",
  "Your patience is the reason someone else's hard work pays off.",
  "A good class today is a fluent student in a year.",
  "You're not just teaching a language - you're opening doors.",
]

export const randomQuote = () => TEACHER_QUOTES[Math.floor(Math.random() * TEACHER_QUOTES.length)]
