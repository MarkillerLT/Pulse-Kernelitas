import {
  Cog,
  Cpu,
  HeartPulse,
  House,
  Radar,
  Shield,
  Sprout,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import type { SectorId } from '../domain/content/sectors'

export const SECTOR_ICONS: Record<SectorId, LucideIcon> = {
  armstrong: Radar,
  gagarin: Cog,
  ride: HeartPulse,
  aldrin: Shield,
  tereshkova: Sprout,
  collins: Cpu,
  habitat: House,
  'life-support': Wind,
}
