import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const svgPath = join(rootDir, 'public/icons/logo.svg')
const svg = readFileSync(svgPath)

async function generateIcons() {
  console.log('Generating PWA icons...')

  // Generate 192x192
  await sharp(svg)
    .resize(192, 192)
    .png()
    .toFile(join(rootDir, 'public/icons/icon-192x192.png'))
  console.log('✓ icon-192x192.png')

  // Generate 512x512
  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile(join(rootDir, 'public/icons/icon-512x512.png'))
  console.log('✓ icon-512x512.png')

  // Generate favicon sizes
  const faviconSizes = [16, 32, 48]
  const faviconBuffers = await Promise.all(
    faviconSizes.map(size =>
      sharp(svg)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  )

  // Generate apple-touch-icon
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(join(rootDir, 'public/apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png')

  // For favicon.ico, we'll create a simple 32x32 PNG and rename
  // Modern browsers support PNG favicons
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile(join(rootDir, 'app/favicon.png'))
  console.log('✓ favicon.png (use this as favicon)')

  console.log('\nDone! Icons generated successfully.')
  console.log('\nNote: For favicon.ico, rename favicon.png to favicon.ico')
  console.log('Or use an online converter like https://favicon.io/favicon-converter/')
}

generateIcons().catch(console.error)
