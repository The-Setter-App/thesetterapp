"use client";

import { CloudDownload, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface LeadsHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
}

export default function LeadsHeader({ totalCount, search, onSearchChange }: LeadsHeaderProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-stone-900 md:text-2xl">Leads</h1>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
              {totalCount}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500 md:text-sm">
            All inbox conversations in one lead pipeline.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <Button variant="ghost" size="sm" className="h-11 text-stone-600" leftIcon={<Trash2 size={16} />}>
            Delete
          </Button>
          <Button variant="outline" size="sm" className="h-11 text-stone-700" leftIcon={<CloudDownload size={16} />}>
            Export
          </Button>
          <div className="w-full md:w-72">
            <Input
              placeholder="Search leads"
              icon={<Search size={16} />}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-11 bg-stone-50 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
