// PT Sans, not the app's own Plus Jakarta Sans - the latter has no Cyrillic glyphs at all, which
// would silently render every Russian character in the Акт сверки PDF as tofu/blank boxes. PT Sans
// was designed for full Cyrillic+Latin coverage (both Russian and the Uzbek-Latin UI text), and
// ships true static Regular/Bold/Italic files instead of a single variable-weight font - react-pdf's
// Font.register expects one concrete file per weight/style, not a variable axis.
import { Font } from '@react-pdf/renderer'
import ptSansRegular from '../assets/fonts/PTSans-Regular.ttf'
import ptSansBold from '../assets/fonts/PTSans-Bold.ttf'
import ptSansItalic from '../assets/fonts/PTSans-Italic.ttf'

let registered = false

export const STATEMENT_FONT = 'PT Sans'

export const ensureStatementFontsRegistered = () => {
    if (registered) return
    Font.register({
        family: STATEMENT_FONT,
        fonts: [
            { src: ptSansRegular, fontWeight: 'normal' },
            { src: ptSansBold, fontWeight: 'bold' },
            { src: ptSansItalic, fontStyle: 'italic' },
        ],
    })
    // react-pdf's default hyphenation callback splits words using English rules, which mangles
    // Cyrillic text wrapped at the end of a line (it inserts a hyphen mid-word almost at random,
    // since the algorithm has no idea what a Russian syllable boundary is) - treating every word as
    // unsplittable is the documented fix.
    Font.registerHyphenationCallback(word => [word])
    registered = true
}
