import { redirect } from "next/navigation";

export default function AuthPage() {
  redirect("/?walletModal=1");
}

