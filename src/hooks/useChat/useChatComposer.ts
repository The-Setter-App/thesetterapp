import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useState } from "react";

interface UseChatComposerResult {
  messageInput: string;
  setMessageInput: Dispatch<SetStateAction<string>>;
  attachmentFile: File | null;
  setAttachmentFile: Dispatch<SetStateAction<File | null>>;
  attachmentPreview: string;
  setAttachmentPreview: Dispatch<SetStateAction<string>>;
  handleFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  handleAttachmentPaste: (file: File) => void;
  clearAttachment: () => void;
}

export function useChatComposer(): UseChatComposerResult {
  const [messageInput, setMessageInput] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const handleAttachmentPaste = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  const clearAttachment = () => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }
    setAttachmentFile(null);
    setAttachmentPreview("");
  };

  return {
    messageInput,
    setMessageInput,
    attachmentFile,
    setAttachmentFile,
    attachmentPreview,
    setAttachmentPreview,
    handleFileSelect,
    handleAttachmentPaste,
    clearAttachment,
  };
}
