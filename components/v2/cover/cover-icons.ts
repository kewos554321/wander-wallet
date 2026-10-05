import {
  BedDouble,
  Camera,
  Car,
  Compass,
  Globe,
  Heart,
  Leaf,
  Mountain,
  MountainSnow,
  Sparkles,
  Star,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"

// Lucide equivalents of COVER_ICONS (A9b cover picker tiles + CoverArt).
export const COVER_ICON_COMPONENTS: Record<string, LucideIcon> = {
  compass: Compass,
  leaf: Leaf,
  utensils: Utensils,
  globe: Globe,
  car: Car,
  bed: BedDouble,
  star: Star,
  camera: Camera,
  "fork-knife": UtensilsCrossed,
  hiking: MountainSnow,
  mountain: Mountain,
  heart: Heart,
  sparkle: Sparkles,
}
