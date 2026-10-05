"use client";

import { useEffect, useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { refreshConversationAvatar } from "@/lib/inbox/clientAvatarRefresh";

const FALLBACK_AVATAR = "/images/no_profile.jpg";

interface LeadAvatarProps {
  // The inbox conversation the picture belongs to. When given, a picture
  // that fails to load is looked up again from Instagram.
  conversationId?: string;
  src: string | null | undefined;
  alt: string;
  className?: string;
  loadingMode?: "eager" | "lazy";
}

// A lead's profile picture. Instagram's picture links expire, so a failed
// load shows the default avatar straight away (never a broken image) and
// asks for a current link in the background.
export default function LeadAvatar({
  conversationId,
  src,
  alt,
  className,
  loadingMode = "lazy",
}: LeadAvatarProps) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_AVATAR);

  // A new link from the server (a sync, or another lead) starts over.
  useEffect(() => {
    setCurrentSrc(src || FALLBACK_AVATAR);
  }, [src]);

  const handleError = () => {
    if (currentSrc === FALLBACK_AVATAR) return;

    const failedSrc = currentSrc;
    setCurrentSrc(FALLBACK_AVATAR);

    // Only the stored link gets a second chance; if the refreshed one fails
    // too, the default avatar stays.
    if (!conversationId || failedSrc !== src) return;

    void refreshConversationAvatar(conversationId).then((freshSrc) => {
      if (!freshSrc || freshSrc === failedSrc) return;
      setCurrentSrc((shown) => (shown === FALLBACK_AVATAR ? freshSrc : shown));
    });
  };

  return (
    <AppImage
      src={currentSrc}
      alt={alt}
      className={className}
      loadingMode={loadingMode}
      onError={handleError}
    />
  );
}
