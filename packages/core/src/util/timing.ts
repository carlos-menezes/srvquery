/** Resolves after the requested number of milliseconds. */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Default time in milliseconds to wait for a response to a single request attempt. */
export const defaultTimeout = 2000;
