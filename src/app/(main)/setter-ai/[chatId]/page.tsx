import SetterAiClient from "@/components/setter-ai/SetterAiClient";

export default async function SetterAiChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  return <SetterAiClient initialChatId={chatId} />;
}

