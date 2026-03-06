"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth";

export async function logout() {
  await deleteSession();
  redirect("/login");
}
