import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Wait up to 5 seconds (the default is 1) for something to appear (findBy..., waitFor). The
// screens render quickly, but the whole suite runs many files at once, and on a busy machine a
// 1 second limit makes correct tests fail now and then.
configure({ asyncUtilTimeout: 5000 })
