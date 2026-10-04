import { CoverArt } from "../cover/cover-art"

export function CoverThumb({ cover }: { cover: string | null }) {
  return <CoverArt cover={cover} />
}
