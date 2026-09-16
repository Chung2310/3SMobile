import { createContext, useContext, type ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';
import { Calendar, Clock, Award, Archive, Inbox, Tag, ArrowRight, FileText, PenLine, ChevronUp, Activity, Sun, Dumbbell, Search, X, SlidersHorizontal, Plus, Sparkles, Layers, RefreshCw, Video, Pencil, Box, ChevronLeft, ChevronRight, ChevronDown, ChartNoAxesColumn, Info, CircleCheck, TriangleAlert, Ban, GitBranch, CirclePlay, SquareCheck, Square, Check, Trash2, Circle, CircleAlert, CircleX, BookOpen, ArrowLeft, type LucideIcon as LucideComponent } from 'lucide-react-native';

const icons = { "calendar": Calendar, "clock": Clock, "award": Award, "archive": Archive, "inbox": Inbox, "tag": Tag, "arrow-right": ArrowRight, "file-text": FileText, "edit-3": PenLine, "chevron-up": ChevronUp, "activity": Activity, "sun": Sun, "target": Dumbbell, "search": Search, "x": X, "sliders": SlidersHorizontal, "plus": Plus, "zap": Sparkles, "layers": Layers, "refresh-cw": RefreshCw, "video": Video, "edit-2": Pencil, "box": Box, "chevron-left": ChevronLeft, "chevron-right": ChevronRight, "chevron-down": ChevronDown, "bar-chart-2": ChartNoAxesColumn, "info": Info, "check-circle": CircleCheck, "alert-triangle": TriangleAlert, "slash": Ban, "git-branch": GitBranch, "play-circle": CirclePlay, "check-square": SquareCheck, "square": Square, "check": Check, "trash-2": Trash2, "circle": Circle, "alert-circle": CircleAlert, "x-circle": CircleX, "book-open": BookOpen, "arrow-left": ArrowLeft };
export const LibraryIconContext = createContext(false);

export function LibraryIcon({ name, size = 24, color, style }: {
  name: keyof typeof icons;
  size?: number;
  color?: string;
  style?: ComponentProps<LucideComponent>['style'];
}) {
  const Icon = icons[name];
  return <Icon size={size} color={color} style={style} strokeWidth={2} />;
}

export function ContextIcon(props: ComponentProps<typeof Feather>) {
  const lucide = useContext(LibraryIconContext);
  const Icon = icons[props.name as keyof typeof icons];
  if (lucide && Icon) return <Icon size={props.size} color={props.color as string} strokeWidth={2} style={props.style as ComponentProps<LucideComponent>['style']} />;
  return <Feather {...props} />;
}
