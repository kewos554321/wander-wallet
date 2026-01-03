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
  console.log("[Compress] Getting EXIF orientation...")
  const orientation = await getExifOrientation(file)
  console.log("[Compress] Orientation:", orientation)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      console.log("[Compress] File read complete, creating image...")
      const img = document.createElement("img")
      img.onload = () => {
        console.log("[Compress] Image loaded:", img.width, "x", img.height)
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
        console.log("[Compress] Canvas drawn, converting to blob...")

        // 優先使用 WebP 格式
        canvas.toBlob(
          (blob) => {
            console.log("[Compress] WebP blob result:", blob?.size, blob?.type)
            if (blob) {
              resolve(blob)
            } else {
              // 回退到 JPEG
              console.log("[Compress] WebP failed, trying JPEG...")
              canvas.toBlob(
                (jpegBlob) => {
                  console.log("[Compress] JPEG blob result:", jpegBlob?.size, jpegBlob?.type)
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
 * 偵測是否為 iOS 裝置
 */
function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false
  const userAgent = navigator.userAgent || ""
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
  console.log("[Upload] Platform detection:", { userAgent, isIOS })
  return isIOS
}

/**
 * 上傳圖片到 R2
 * - iOS: 透過後端上傳（避免 CORS 問題）
 * - Android/其他: 使用預簽名 URL 直傳
 *
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
  console.log("[Upload] Starting upload for file:", file.name, file.size, file.type)

  // 1. 壓縮圖片
  console.log("[Upload] Compressing image...")
  const compressedBlob = await compressImageToBlob(file, 1200, 1200, 0.8)
  console.log("[Upload] Compressed:", compressedBlob.size, compressedBlob.type)
  const contentType = compressedBlob.type || "image/webp"

  // iOS 走後端上傳
  if (isIOSDevice()) {
    console.log("[Upload] iOS detected, using backend upload")
    const formData = new FormData()
    formData.append("file", compressedBlob, `image.${contentType === "image/webp" ? "webp" : "jpg"}`)
    formData.append("projectId", projectId)
    formData.append("type", type)

    console.log("[Upload] Sending to /api/upload/direct...")
    const response = await authFetch("/api/upload/direct", {
      method: "POST",
      body: formData,
    })

    console.log("[Upload] Response status:", response.status)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "上傳失敗" }))
      console.error("[Upload] Error:", error)
      throw new Error(error.error || "上傳圖片失敗")
    }

    const result = await response.json()
    console.log("[Upload] Success:", result)
    return { url: result.publicUrl, key: result.key }
  }

  // Android/其他走預簽名 URL 直傳
  // 2. 取得預簽名上傳 URL
  const urlResponse = await authFetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, contentType, type }),
  })

  if (!urlResponse.ok) {
    const error = await urlResponse.json()
    throw new Error(error.error || "取得上傳 URL 失敗")
  }

  const { uploadUrl, publicUrl, key } = await urlResponse.json()

  // 3. 直接上傳到 R2
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: compressedBlob,
  })

  if (!uploadResponse.ok) {
    throw new Error("上傳圖片失敗")
  }

  return { url: publicUrl, key }
}
