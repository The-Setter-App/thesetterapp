"use client";

import { type FormEvent, useState } from "react";
import type { NewCommentAutomationInput } from "@/components/settings/comment-automations/useCommentAutomations";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_HINT_CLASS,
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
  SETTINGS_SECONDARY_BUTTON_CLASS,
  SETTINGS_TEXTAREA_CLASS,
} from "@/components/settings/settingsStyles";

const MAX_NAME_LENGTH = 60;
const MAX_KEYWORD_LENGTH = 60;
const MAX_MEDIA_ID_LENGTH = 60;
export const MAX_AUTOMATION_MESSAGE_LENGTH = 1000;

interface CommentAutomationFormProps {
  // Resolves to true when the automation was saved, so the form can close.
  onCreate: (input: NewCommentAutomationInput) => Promise<boolean>;
  onClose: () => void;
}

export default function CommentAutomationForm({
  onCreate,
  onClose,
}: CommentAutomationFormProps) {
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    name.trim().length > 0 && replyMessage.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    const created = await onCreate({ name, keyword, mediaId, replyMessage });
    setIsSubmitting(false);
    if (created) onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${SETTINGS_BLOCK_CLASS} space-y-4 border-b border-[#F0F2F6] bg-[#F8F7FF]`}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="automation-name" className={SETTINGS_LABEL_CLASS}>
            Name
          </label>
          <input
            id="automation-name"
            type="text"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder="PDF giveaway"
            className={SETTINGS_INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="automation-keyword" className={SETTINGS_LABEL_CLASS}>
            Trigger keyword
          </label>
          <input
            id="automation-keyword"
            type="text"
            value={keyword}
            maxLength={MAX_KEYWORD_LENGTH}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="PDF"
            className={SETTINGS_INPUT_CLASS}
          />
          <p className={SETTINGS_HINT_CLASS}>
            Leave blank to reply to every comment.
          </p>
        </div>

        <div>
          <label htmlFor="automation-media-id" className={SETTINGS_LABEL_CLASS}>
            Post or reel media ID
          </label>
          <input
            id="automation-media-id"
            type="text"
            value={mediaId}
            maxLength={MAX_MEDIA_ID_LENGTH}
            onChange={(event) => setMediaId(event.target.value)}
            placeholder="All posts"
            className={SETTINGS_INPUT_CLASS}
          />
          <p className={SETTINGS_HINT_CLASS}>
            Leave blank to cover all your posts.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="automation-reply" className={SETTINGS_LABEL_CLASS}>
          Message to send
        </label>
        <textarea
          id="automation-reply"
          value={replyMessage}
          maxLength={MAX_AUTOMATION_MESSAGE_LENGTH}
          onChange={(event) => setReplyMessage(event.target.value)}
          placeholder="Thanks for commenting! Here is your PDF: …"
          rows={3}
          className={SETTINGS_TEXTAREA_CLASS}
        />
        <p className={SETTINGS_HINT_CLASS}>
          Instagram allows one automatic reply per comment, sent within 7 days
          of it.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <button
          type="button"
          onClick={onClose}
          className={`${SETTINGS_SECONDARY_BUTTON_CLASS} w-full !bg-white md:w-auto`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full md:w-auto`}
        >
          {isSubmitting ? "Adding…" : "Add automation"}
        </button>
      </div>
    </form>
  );
}
