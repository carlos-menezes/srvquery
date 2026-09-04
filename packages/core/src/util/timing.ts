/** Resolves after the requested number of milliseconds. */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
