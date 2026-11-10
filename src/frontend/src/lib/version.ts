import { version } from '../../package.json'
import { displayVersion } from './version-format'

/** This build's version as people see it, for example "v2.261110". It comes from package.json. */
export const appVersion = displayVersion(version)
