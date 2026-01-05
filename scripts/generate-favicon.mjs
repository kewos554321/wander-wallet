import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const svgPath = join(rootDir, 'public/icons/logo.svg')
const svg = readFileSync(svgPath)

async function generateFavicon() {
  // Generate 32x32 PNG for favicon
  const pngBuffer = await sharp(svg)
    .resize(32, 32)
    .png()
    .toBuffer()

  // Write as icon.png (Next.js App Router will use this)
  writeFileSync(join(rootDir, 'app/icon.png'), pngBuffer)
  console.log('✓ app/icon.png generated')

  // Also generate a larger one for better quality
  const png48Buffer = await sharp(svg)
    .resize(48, 48)
    .png()
    .toBuffer()

  writeFileSync(join(rootDir, 'public/favicon.png'), png48Buffer)
  console.log('✓ public/favicon.png generated')
}

generateFavicon().catch(console.error)
