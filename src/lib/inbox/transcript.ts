import type { Message } from "@/types/inbox";

export interface TranscriptOptions {
  // The newest messages are kept when the whole conversation does not fit.
  maxChars: number;
  // What each side is called in the transcript.
  teamLabel?: string;
  leadLabel?: string;
}

// The words of a message, or a stand-in for media that carries none.
function describeMessage(message: Message): string {
  const text = message.text?.trim();
  if (text) return text;
  if (message.type === "audio") return "[Voice note]";
  if (message.type === "image") return "[Image]";
  if (message.type === "video") return "[Video]";
  return message.type === "text" ? "" : "[Attachment]";
}

// Turns stored messages, oldest first, into "Speaker: text" lines for a
// model to read.
export function buildConversationTranscript(
  messages: Message[],
  { maxChars, teamLabel = "Setter", leadLabel = "Lead" }: TranscriptOptions,
): string {
  const lines: string[] = [];
  for (const message of messages) {
    if (message.isEmpty) continue;
    const text = describeMessage(message);
    if (!text) continue;
    lines.push(`${message.fromMe ? teamLabel : leadLabel}: ${text}`);
  }

  const transcript = lines.join("\n");
  if (transcript.length <= maxChars) return transcript;

  // Cut at a line break so the transcript never opens mid-message.
  const tail = transcript.slice(transcript.length - maxChars);
  const firstBreak = tail.indexOf("\n");
  return firstBreak >= 0 ? tail.slice(firstBreak + 1) : tail;
}

// Who sent the last message that carries any content.
export function getLastSpeaker(messages: Message[]): "team" | "lead" | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.isEmpty || !describeMessage(message)) continue;
    return message.fromMe ? "team" : "lead";
  }
  return null;
}
