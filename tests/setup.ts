import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement scrolling; the shell scrolls to top on navigation.
window.scrollTo = () => {}
afterEach(cleanup)
