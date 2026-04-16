import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "24px" }}>
      <h1>Trust Lock</h1>
      <p>Default white layout with minimal styling.</p>
      <ul>
        <li>
          <Link href="/auth">Auth</Link>
        </li>
        <li>
          <Link href="/portal">Portal</Link>
        </li>
        <li>
          <Link href="/onboarding">Onboarding</Link>
        </li>
        <li>
          <Link href="/security">Security</Link>
        </li>
        <li>
          <Link href="/admin">Admin</Link>
        </li>
      </ul>
    </main>
  );
}
