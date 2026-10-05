import {
  CalendarCheck,
  Clock3,
  type LucideIcon,
  MessageCircleQuestion,
  MessageSquarePlus,
} from "lucide-react";

export interface PromptStarter {
  id: string;
  title: string;
  description: string;
  // The message sent to Setter AI when the starter is chosen.
  prompt: string;
  icon: LucideIcon;
}

export const PROMPT_STARTERS: PromptStarter[] = [
  {
    id: "follow-up",
    title: "Follow up with a quiet lead",
    description: "A short nudge that doesn't feel pushy.",
    prompt:
      "Write a short, friendly follow-up message for a lead who stopped replying a few days ago.",
    icon: Clock3,
  },
  {
    id: "objection",
    title: "Handle an objection",
    description: 'Ways past "I need to think about it."',
    prompt:
      'A lead said "I need to think about it." Give me three ways to respond that keep the conversation moving.',
    icon: MessageCircleQuestion,
  },
  {
    id: "first-reply",
    title: "Reply to a new lead",
    description: "A strong first message to someone who just wrote in.",
    prompt:
      "Write a first reply to a new lead who just messaged me on Instagram asking for more info.",
    icon: MessageSquarePlus,
  },
  {
    id: "book-call",
    title: "Move toward a booked call",
    description: "A natural way to invite them onto a call.",
    prompt:
      "Give me a natural way to invite a lead to book a call without sounding pushy.",
    icon: CalendarCheck,
  },
];
