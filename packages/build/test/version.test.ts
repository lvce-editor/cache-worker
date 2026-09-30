import { describe, expect, it } from '@jest/globals'
import { resolveVersion } from '../src/version.ts'

describe('resolveVersion', () => {
  it('uses a release version matching the source package version', () => {
    expect(resolveVersion({ RG_VERSION: '0.1.0' })).toBe('0.1.0')
  })

  it('uses a release version that differs from the source package version', () => {
    expect(resolveVersion({ RG_VERSION: 'v0.1.1' })).toBe('0.1.1')
  })

  it('prefers RG_VERSION over GIT_TAG and the exact Git tag', () => {
    expect(resolveVersion({ RG_VERSION: 'v1.2.3', GIT_TAG: 'v2.3.4' }, 'v3.4.5')).toBe('1.2.3')
  })

  it('uses GIT_TAG before the exact Git tag', () => {
    expect(resolveVersion({ GIT_TAG: 'v2.3.4' }, 'v3.4.5')).toBe('2.3.4')
  })

  it('removes only a leading v from the exact Git tag', () => {
    expect(resolveVersion({}, 'v3.4.5')).toBe('3.4.5')
    expect(resolveVersion({}, 'release-v3.4.5')).toBe('release-v3.4.5')
  })

  it('uses a development version when there is no environment version or exact Git tag', () => {
    expect(resolveVersion({})).toBe('0.0.0-dev')
  })
})
