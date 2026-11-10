import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as sass from 'sass'

export const root = fileURLToPath(new URL('..', import.meta.url))

export function compileFixture(name) {
  return sass.compile(path.join(root, 'tests', 'fixtures', `${name}.scss`), {
    style: 'expanded',
    quietDeps: true
  }).css
}
