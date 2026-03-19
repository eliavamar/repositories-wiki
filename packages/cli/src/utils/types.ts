import { createByModelName } from "@microsoft/tiktokenizer";

/** Map of file path to file content */
export type FileContentsMap = Map<string, string>;
export type Tokenizer = Awaited<ReturnType<typeof createByModelName>>;
