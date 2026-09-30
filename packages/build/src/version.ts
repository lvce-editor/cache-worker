import { execFileSync } from 'node:child_process'

type VersionEnvironment = {
  RG_VERSION?: string
  GIT_TAG?: string
}

const normalizeVersion = (version: string): string => (version.startsWith('v') ? version.slice(1) : version)

export const resolveVersion = (env: VersionEnvironment, gitTag = ''): string => {
  if (env.RG_VERSION) {
    return normalizeVersion(env.RG_VERSION)
  }
  if (env.GIT_TAG) {
    return normalizeVersion(env.GIT_TAG)
  }
  if (gitTag) {
    return normalizeVersion(gitTag)
  }
  return '0.0.0-dev'
}

export const getVersion = async (env: VersionEnvironment = process.env): Promise<string> => {
  if (env.RG_VERSION || env.GIT_TAG) {
    return resolveVersion(env)
  }

  try {
    const gitTag = execFileSync('git', ['describe', '--exact-match', '--tags'], { encoding: 'utf8' }).trim()
    return resolveVersion(env, gitTag)
  } catch {
    return resolveVersion(env)
  }
}
