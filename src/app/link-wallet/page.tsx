import { redirect } from "next/navigation";

export default function LinkWalletRoute() {
  redirect("/?walletModal=1");
}

