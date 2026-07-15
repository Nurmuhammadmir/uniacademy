// shown after finishing a homework section or an exam, to make the grind feel less like a grind
export const STUDENT_QUOTES = [
  "Every word you learn today is a door you can walk through tomorrow.",
  "Consistency beats intensity - showing up daily is the whole game.",
  "You didn't come this far to only come this far.",
  "Small daily wins compound into fluency.",
  "The language is yours now - one more day, one more win.",
  "Mistakes are just proof you're trying.",
  "Future-you is already proud of today-you.",
  "Progress, not perfection.",
  "You're closer to fluent than you were yesterday.",
  "Great things take 30 days, not 30 minutes - keep going.",
]

export const randomQuote = () => STUDENT_QUOTES[Math.floor(Math.random() * STUDENT_QUOTES.length)]
