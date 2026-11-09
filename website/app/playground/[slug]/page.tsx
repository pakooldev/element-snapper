import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CASES } from "../cases";
import "../playground.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CASES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const testCase = CASES.find((c) => c.slug === slug);
  return { title: testCase ? `Playground: ${testCase.title}` : "Playground" };
}

export default async function PlaygroundCasePage({ params }: Props) {
  const { slug } = await params;
  const testCase = CASES.find((c) => c.slug === slug);
  if (!testCase) notFound();

  return testCase.render(
    <div className="pg-case-intro">
      <Link href="/playground#page-cases" className="btn btn-outline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Playground
      </Link>
      <h1>{testCase.title}</h1>
      <p>
        <strong>Mode:</strong> {testCase.mode}
      </p>
      <p>
        <strong>Expected:</strong> {testCase.expected}
      </p>
    </div>,
  );
}
