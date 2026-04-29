"use client";

import { useLang } from "@/app/lib/lang-context";
import { useState, useEffect } from "react";

export interface FilterState {
  search: string;
  mtsLevel: string;
  specialty: string;
}

interface QueueFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  availableSpecialties: string[];
}

export default function QueueFilters({ onFilterChange, availableSpecialties }: QueueFiltersProps) {
  const { t } = useLang();
  
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    mtsLevel: "all",
    specialty: "all",
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  return (
    <div className="bg-card shadow rounded-lg p-4 border border-border flex flex-col md:flex-row gap-4 items-end flex-grow">
      <div className="flex-1 w-full relative">
        <label htmlFor="search-patient" className="text-sm font-medium text-foreground mb-1.5 block">
          {"Search Patient ID"}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            id="search-patient"
            placeholder={"Enter ID"}
            className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      <div className="w-full md:w-48">
        <label htmlFor="filter-mts" className="text-sm font-medium text-foreground mb-1.5 block">
          {"MTS Level"}
        </label>
        <select
          id="filter-mts"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          value={filters.mtsLevel}
          onChange={(e) => setFilters(prev => ({ ...prev, mtsLevel: e.target.value }))}
        >
          <option value="all">{"All Levels"}</option>
          <option value="1">Level 1 - Resuscitation</option>
          <option value="2">Level 2 - Emergent</option>
          <option value="3">Level 3 - Urgent</option>
          <option value="4">Level 4 - Less Urgent</option>
          <option value="5">Level 5 - Non Urgent</option>
        </select>
      </div>

      <div className="w-full md:w-64">
        <label htmlFor="filter-specialty" className="text-sm font-medium text-foreground mb-1.5 block">
          {"Specialty"}
        </label>
        <select
          id="filter-specialty"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          value={filters.specialty}
          onChange={(e) => setFilters(prev => ({ ...prev, specialty: e.target.value }))}
        >
          <option value="all">{"All Specialties"}</option>
          {availableSpecialties.map((spec) => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>
      </div>
      
      {(filters.search !== "" || filters.mtsLevel !== "all" || filters.specialty !== "all") && (
        <button
          onClick={() => setFilters({ search: "", mtsLevel: "all", specialty: "all" })}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
        >
          {"Clear Filters"}
        </button>
      )}
    </div>
  );
}