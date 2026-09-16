import { Text } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

/**
 * Renders text that may wrap between words, but never mid-word.
 * Each non-whitespace token is a non-wrapping Text node.
 */
export function WordSafeText({
  children,
  style,
}: {
  children: string;
  style?: Style | Style[];
}) {
  const parts = String(children).split(/(\s+)/);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        /^\s+$/.test(part) ? (
          part
        ) : part ? (
          <Text key={i} wrap={false}>
            {part}
          </Text>
        ) : null,
      )}
    </Text>
  );
}
