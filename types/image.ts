/** Value shared by the expense form's image field and draft state. */
export interface ImagePickerValue {
  image: string | null // 已上傳的 URL
  pendingFile: File | null // 待上傳的檔案
  preview: string | null // 本地預覽 URL
}
