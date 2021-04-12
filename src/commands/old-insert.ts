import * as vscode from "vscode";

import { Command, CommandDescriptor, CommandFlags, define } from ".";
import { SelectionBehavior } from "../state/extension";
import { SelectionHelper } from "../utils/selection-helper";

define(Command.repeatInsert, CommandFlags.Edit, async ({ editor }, state) => {
  const editorState = state.extension.getEditorState(editor);

  let switchToInsert: undefined | typeof editorState.recordedCommands[0];
  let i = editorState.recordedCommands.length - 1;

  for (; i >= 0; i--) {
    if (editorState.recordedCommands[i].descriptor.flags & CommandFlags.SwitchToInsertBefore) {
      switchToInsert = editorState.recordedCommands[i];
      break;
    }
  }

  if (switchToInsert === undefined) {
    return;
  }

  const start = i;
  let switchToNormal: undefined | typeof editorState.recordedCommands[0];

  for (i++; i < editorState.recordedCommands.length; i++) {
    if (editorState.recordedCommands[i].descriptor.flags & CommandFlags.SwitchToNormal) {
      switchToNormal = editorState.recordedCommands[i];
      break;
    }
  }

  if (switchToNormal === undefined) {
    return;
  }

  await CommandDescriptor.execute(editorState, editorState.recordedCommands[start]);

  const end = i;

  await editor.edit((builder) => {
    for (let i = state.currentCount || 1; i > 0; i--) {
      for (let j = start; j <= end; j++) {
        const commandState = editorState.recordedCommands[j],
              changes = commandState.followingChanges;

        if (changes === undefined) {
          continue;
        }

        for (const change of changes) {
          if (change.rangeLength === 0) {
            builder.insert(editor.selection.active, change.text);
          } else {
            builder.replace(editor.selection, change.text);
          }
        }
      }
    }
  });
});
