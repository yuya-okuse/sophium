/** How the assistant frames the reply while staying SEP-grounded. */
export type AnswerMode = "easy" | "hard"

export const DEFAULT_ANSWER_MODE: AnswerMode = "hard"

export function isAnswerMode(value: unknown): value is AnswerMode {
  return value === "easy" || value === "hard"
}
