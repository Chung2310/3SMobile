import { createContext, type ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';

export const LibraryIconContext = createContext(false);

export function LibraryIcon({
  name,
  size = 24,
  color,
  style,
}: {
  name: ComponentProps<typeof Feather>['name'];
  size?: number;
  color?: string;
  style?: ComponentProps<typeof Feather>['style'];
}) {
  return <Feather name={name} size={size} color={color} style={style} />;
}

export function ContextIcon(props: ComponentProps<typeof Feather>) {
  return <Feather {...props} />;
}
