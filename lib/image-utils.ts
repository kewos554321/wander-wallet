/**
 * 讀取圖片的 EXIF 方向資訊
 */
export async function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const view = new DataView(e.target?.result as ArrayBuffer)

      // 檢查是否為 JPEG
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(1)
        return
      }

      let offset = 2
      while (offset < view.byteLength) {
        const marker = view.getUint16(offset, false)
        offset += 2

        if (marker === 0xFFE1) {
          // EXIF marker
          const length = view.getUint16(offset, false)
          offset += 2

          // 檢查 EXIF header
          const exifHeader = view.getUint32(offset, false)
          if (exifHeader !== 0x45786966) {
            resolve(1)
            return
          }

          offset += 6 // Skip 'Exif\0\0'
          const tiffOffset = offset

          // 檢查 byte order
          const littleEndian = view.getUint16(offset, false) === 0x4949
          offset += 8 // Skip to first IFD

          const ifdOffset = view.getUint32(offset, littleEndian)
          offset = tiffOffset + ifdOffset

          const numEntries = view.getUint16(offset, littleEndian)
          offset += 2

          for (let i = 0; i < numEntries; i++) {
            const tag = view.getUint16(offset, littleEndian)
            if (tag === 0x0112) {
              // Orientation tag
              const orientation = view.getUint16(offset + 8, littleEndian)
              resolve(orientation)
              return
            }
            offset += 12
          }
          resolve(1)
          return
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break
        } else {
          offset += view.getUint16(offset, false)
        }
      }
      resolve(1)
    }
    reader.onerror = () => resolve(1)
    reader.readAsArrayBuffer(file.slice(0, 65536)) // 只讀前 64KB
  })
}

/**
 * 壓縮圖片並轉為 WebP base64
 */
export async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  const orientation = await getExifOrientation(file)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = document.createElement("img")
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let { width, height } = img

        // 計算縮放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        // 根據 EXIF 方向調整 canvas 尺寸
        if (orientation >= 5 && orientation <= 8) {
          canvas.width = height
          canvas.height = width
        } else {
          canvas.width = width
          canvas.height = height
        }

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("無法取得 canvas context"))
          return
        }

        // 根據 EXIF 方向進行變換
        switch (orientation) {
          case 2:
            ctx.transform(-1, 0, 0, 1, width, 0)
            break
          case 3:
            ctx.transform(-1, 0, 0, -1, width, height)
            break
          case 4:
            ctx.transform(1, 0, 0, -1, 0, height)
            break
          case 5:
            ctx.transform(0, 1, 1, 0, 0, 0)
            break
          case 6:
            ctx.transform(0, 1, -1, 0, height, 0)
            break
          case 7:
            ctx.transform(0, -1, -1, 0, height, width)
            break
          case 8:
            ctx.transform(0, -1, 1, 0, 0, width)
            break
        }

        ctx.drawImage(img, 0, 0, width, height)

        // 優先使用 WebP 格式
        const base64 = canvas.toDataURL("image/webp", quality)

        if (base64.startsWith("data:image/webp")) {
          resolve(base64)
        } else {
          resolve(canvas.toDataURL("image/jpeg", quality))
        }
      }
      img.onerror = () => reject(new Error("圖片載入失敗"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("檔案讀取失敗"))
    reader.readAsDataURL(file)
  })
}
