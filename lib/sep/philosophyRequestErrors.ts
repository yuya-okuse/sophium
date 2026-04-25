/**
 * Distinguish client errors (4xx) from model/fetch errors (5xx) in the chat route.
 */
export class SlugNotInIndexError extends Error {
  override readonly name = "SlugNotInIndexError"
  constructor(message: string) {
    super(message)
  }
}
