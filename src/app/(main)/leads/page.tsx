"use client";

import { useState, useEffect, useMemo } from 'react';
import { Lead, StatusType, SortConfig } from '@/types/leads';
import { initialLeadsData } from '@/data/mockLeadsData';
import LeadsFilters from '@/components/leads/LeadsFilters';
import LeadsTable from '@/components/leads/LeadsTable';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('leads-checkbox-state');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return initialLeadsData;
        }
      }
    }
    return initialLeadsData;
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leads-checkbox-state', JSON.stringify(leads));
    }
  }, [leads]);

  const handleToggleSelect = (id: string) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === id ? { ...lead, selected: !lead.selected } : lead
      )
    );
  };

  const handleToggleAll = () => {
    const allSelected = leads.every((lead) => lead.selected);
    setLeads((prevLeads) =>
      prevLeads.map((lead) => ({ ...lead, selected: !allSelected }))
    );
  };

  const handleToggleStatus = (status: StatusType) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const handleSort = (key: keyof Lead) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Filter by Search
    if (search.trim()) {
        const lowerSearch = search.toLowerCase();
        result = result.filter(lead => 
            lead.name.toLowerCase().includes(lowerSearch) ||
            (lead.handle && lead.handle.toLowerCase().includes(lowerSearch))
        );
    }

    // Filter by Status
    if (selectedStatuses.length > 0) {
      result = result.filter(lead => selectedStatuses.includes(lead.status));
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === undefined) aValue = '';
        if (bValue === undefined) bValue = '';

        if (sortConfig.key === 'cash') {
          const parseCash = (val: string | number | undefined) => {
              const strVal = String(val);
              if (strVal === 'N/A' || strVal === 'Pending') return -1;
              return parseFloat(strVal.replace(/[^0-9.-]+/g,""));
          }
          
          const aNum = parseCash(aValue as string);
          const bNum = parseCash(bValue as string);
          
          if (aNum < bNum) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aNum > bNum) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        if (String(aValue).toLowerCase() < String(bValue).toLowerCase()) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (String(aValue).toLowerCase() > String(bValue).toLowerCase()) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return result;
  }, [leads, sortConfig, selectedStatuses, search]);

  let headerCheckboxState: boolean | 'indeterminate' = false;
  if (leads.length > 0) {
    const selectedCount = leads.filter(l => l.selected).length;
    if (selectedCount === leads.length) headerCheckboxState = true;
    else if (selectedCount === 0) headerCheckboxState = false;
    else headerCheckboxState = 'indeterminate';
  }

  const getStatusCount = (status: StatusType) => leads.filter(l => l.status === status).length;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <div className="pt-8 px-6 space-y-8 max-w-[1600px] mx-auto">
        <LeadsFilters 
            totalCount={filteredAndSortedLeads.length}
            search={search}
            onSearchChange={setSearch}
            selectedStatuses={selectedStatuses}
            onToggleStatus={handleToggleStatus}
            getStatusCount={getStatusCount}
        />

        <LeadsTable 
            leads={filteredAndSortedLeads}
            onToggleSelect={handleToggleSelect}
            onToggleAll={handleToggleAll}
            headerCheckboxState={headerCheckboxState}
            sortConfig={sortConfig}
            onSort={handleSort}
        />
      </div>
    </div>
  );
}