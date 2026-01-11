import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// Placeholder for Quick Edit extension
export const quickEdit = (filename: string): Extension => {
  return EditorView.domEventHandlers({
    keydown: (event, view) => {
      // Implementation similar to Polaris if needed,
      // but for now returning empty handler to allow build
      return false;
    },
  });
};
