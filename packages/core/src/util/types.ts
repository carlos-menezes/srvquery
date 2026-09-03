/**
 * Extracts the optional properties from a given type `T`.
 *
 * Example:
 * ```ts
 * type Example = {
 *   required: string;
 *   optional?: number;
 * }
 *
 * type Result = ExtractOptional<Example>;
 * // Result is { optional?: number | undefined }
 * ```
 */
export type ExtractOptional<T> = Pick<
  T,
  Exclude<
    {
      [K in keyof T]: undefined extends T[K] ? K : never;
    }[keyof T],
    undefined
  >
>;
