// src/types/ai.ts
export interface GenerateSectionsParams {
  description: string;
  sectionIdea?: string;
  expectedSectionCount?: number;
}

export interface Section {
  title: string;
  description: string;
}

export interface AIResponseSections {
  count: number;
  sections: Section[];
}
