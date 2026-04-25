export const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/

export function isValidSemver(version: string): boolean {
  return SEMVER_REGEX.test(version)
}
