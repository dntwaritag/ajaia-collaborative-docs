import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/client";
import { getDocument } from "@/lib/documents";
import { ServiceError } from "@/lib/errors";
import { Editor } from "@/components/Editor";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  try {
    const doc = await getDocument(await getDb(), user.id, id);
    return <Editor initial={JSON.parse(JSON.stringify(doc))} />;
  } catch (e) {
    const notFound = e instanceof ServiceError;
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold">{notFound ? "Document not found" : "Couldn’t load this document"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {notFound ? "It may have been deleted, or you may not have access to it." : "Something went wrong on our side. Please try again."}
          </p>
          <Link href="/" className="btn btn-primary mt-6">Back to documents</Link>
        </div>
      </main>
    );
  }
}
