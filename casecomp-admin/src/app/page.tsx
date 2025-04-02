import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "CaseComp Admin Tool",
  description: "Admin interface for managing CaseComp data",
};

const adminModules = [
  {
    title: "Competitions",
    description: "Bulk entry of competition data, including format, dates, and details.",
    link: "/competitions/bulk",
    icon: "🏆",
  },
  {
    title: "Universities",
    description: "Manage university records including names, domains, and locations.",
    link: "/universities/manage",
    icon: "🏫",
  },
  {
    title: "Organizers",
    description: "Manage organization entities that host competitions.",
    link: "/organizers/manage",
    icon: "🏢",
  },
  {
    title: "Timeline",
    description: "Create and manage timeline events for competitions.",
    link: "/timeline/manage",
    icon: "📅",
  },
  {
    title: "History",
    description: "Maintain competition history records and entries.",
    link: "/history/manage",
    icon: "📚",
  },
  {
    title: "Gallery",
    description: "Upload and manage competition gallery images.",
    link: "/gallery/manage",
    icon: "🖼️",
  },
  {
    title: "Resources",
    description: "Add resources like articles, videos, and decks.",
    link: "/resources/manage",
    icon: "📋",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">CaseComp Admin Tool</h1>
          <p className="text-lg text-zinc-600">
            Internal admin interface for managing CaseComp database records. Use this tool to add, update, and organize competition data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module) => (
            <Card key={module.title} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="text-2xl mb-2">{module.icon}</div>
                <CardTitle>{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-3">
                <Link href={module.link} className="w-full">
                  <Button variant="default" className="w-full">
                    Open {module.title}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">About This Tool</h2>
          <p className="mb-4">
            The CaseComp Admin Tool is designed for internal use by administrators to maintain the competition database.
            It provides interfaces for bulk data entry, foreign key resolution, and validation.
          </p>
          <p className="text-sm text-zinc-500">
            This tool is for authorized administrators only and performs direct database operations.
          </p>
        </div>
      </div>
    </main>
  );
}
