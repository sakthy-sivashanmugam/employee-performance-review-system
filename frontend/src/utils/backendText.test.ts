import { characterCount, trimLikeBackend } from './backendText'

// Invisible characters are built from code points so they are readable in source code.
const char = (codePoint: number) => String.fromCodePoint(codePoint)
const NO_BREAK_SPACE = char(0x00a0)
const NEXT_LINE = char(0x0085)
const EM_SPACE = char(0x2003)
const IDEOGRAPHIC_SPACE = char(0x3000)
const BYTE_ORDER_MARK = char(0xfeff)
const ZERO_WIDTH_SPACE = char(0x200b)

describe('trimLikeBackend', () => {
  it('removes the whitespace the backend removes from both ends', () => {
    const padding = ` \t\n${NO_BREAK_SPACE}${EM_SPACE}${NEXT_LINE}${IDEOGRAPHIC_SPACE}`
    expect(trimLikeBackend(`${padding}EMP1${[...padding].reverse().join('')}`)).toBe('EMP1')
  })

  it('keeps spaces inside the text', () => {
    expect(trimLikeBackend('  Mary  Jane  ')).toBe('Mary  Jane')
  })

  it('does not strip U+FEFF (byte-order mark), unlike JavaScript trim(): the backend keeps it', () => {
    expect(trimLikeBackend(`${BYTE_ORDER_MARK}EMP1`)).toBe(`${BYTE_ORDER_MARK}EMP1`)
    expect(`${BYTE_ORDER_MARK}EMP1`.trim()).toBe('EMP1') // the difference this function exists to avoid
  })

  it('strips U+0085 (next-line), unlike JavaScript trim(): the backend removes it', () => {
    expect(trimLikeBackend(`${NEXT_LINE}EMP1`)).toBe('EMP1')
    expect(`${NEXT_LINE}EMP1`.trim()).toBe(`${NEXT_LINE}EMP1`)
  })

  it('does not strip invisible characters that are not whitespace', () => {
    const text = `${ZERO_WIDTH_SPACE}x${ZERO_WIDTH_SPACE}`
    expect(trimLikeBackend(text)).toBe(text)
  })

  it('returns an empty string for text that is only whitespace', () => {
    expect(trimLikeBackend(` ${NEXT_LINE}${IDEOGRAPHIC_SPACE} `)).toBe('')
  })

  it('does not change text without surrounding whitespace', () => {
    expect(trimLikeBackend('EMP106')).toBe('EMP106')
    expect(trimLikeBackend('')).toBe('')
  })
})

describe('characterCount', () => {
  it('counts one per character, like the backend', () => {
    expect(characterCount('')).toBe(0)
    expect(characterCount('abc')).toBe(3)
  })

  it('counts an emoji as one character, not two', () => {
    expect(characterCount(char(0x1f600))).toBe(1)
    expect('😀'.length).toBe(2) // what JavaScript length would say
  })

  it('counts a letter and a combining accent as two characters', () => {
    expect(characterCount(`e${char(0x0301)}`)).toBe(2)
  })
})
