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
 * 壓縮圖片並轉為 WebP base64（保留向下相容）
 */
export async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  const blob = await compressImageToBlob(file, maxWidth, maxHeight, quality)
  return blobToBase64(blob)
}

/**
 * 壓縮圖片並轉為 Blob（用於 R2 上傳）
 */
export async function compressImageToBlob(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
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
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              // 回退到 JPEG
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    resolve(jpegBlob)
                  } else {
                    reject(new Error("圖片轉換失敗"))
                  }
                },
                "image/jpeg",
                quality
              )
            }
          },
          "image/webp",
          quality
        )
      }
      img.onerror = () => reject(new Error("圖片載入失敗"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("檔案讀取失敗"))
    reader.readAsDataURL(file)
  })
}

/**
 * Blob 轉 Base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("轉換失敗"))
    reader.readAsDataURL(blob)
  })
}

export interface UploadResult {
  url: string
  key: string
}

/**
 * 上傳圖片到 R2（透過後端上傳，避免 iOS CORS 問題）
 * @param file 圖片檔案
 * @param projectId 專案 ID
 * @param authFetch 認證的 fetch 函數
 * @param type 類型（expense 或 cover）
 */
export async function uploadImageToR2(
  file: File,
  projectId: string,
  authFetch: (url: string, options?: RequestInit) => Promise<Response>,
  type: "expense" | "cover" = "expense"
): Promise<UploadResult> {
  // 1. 壓縮圖片
  const compressedBlob = await compressImageToBlob(file, 1200, 1200, 0.8)

  // 2. 使用 FormData 上傳到後端
  const formData = new FormData()
  formData.append("file", compressedBlob, `image.${compressedBlob.type === "image/webp" ? "webp" : "jpg"}`)
  formData.append("projectId", projectId)
  formData.append("type", type)

  const response = await authFetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "上傳失敗" }))
    throw new Error(error.error || "上傳圖片失敗")
  }

  const { publicUrl, key } = await response.json()
  return { url: publicUrl, key }
}
