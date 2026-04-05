import { FilesystemBackend, createDeepAgent as createLibDeepAgent } from "deepagents";
import type { BackendProtocol, WriteResult, EditResult, DeepAgent } from "deepagents";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

class ReadOnlyFilesystemBackend extends FilesystemBackend implements BackendProtocol {
  constructor(rootDir: string) {
    super({ rootDir, virtualMode: true });
  }

  override async write(_filePath: string, _content: string): Promise<WriteResult> {
    return {
      error: "Read-only filesystem: write operations are not permitted.",
    };
  }

  override async edit(
    _filePath: string,
    _oldString: string,
    _newString: string,
    _replaceAll?: boolean
  ): Promise<EditResult> {
    return {
      error: "Read-only filesystem: edit operations are not permitted.",
    };
  }
}


export function buildDeepAgent(
  chatModel: BaseChatModel,
  projectPath: string,
): DeepAgent {
  const backend = new ReadOnlyFilesystemBackend(projectPath);
  return createLibDeepAgent({
    model: chatModel,
    backend,
  });
}
