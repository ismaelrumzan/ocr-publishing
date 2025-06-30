export interface Page {
  id: string;
  fileName: string;
  title?: string; // Add optional title field
  originalText: string;
  editedText: string;
  language: string;
  ocrConfidence?: number;
  status: "processing" | "completed" | "approved";
  createdAt: string;
  updatedAt: string;
  rootPageId?: string; // For translation pages, links to the root page
  translationPages?: string[]; // For root pages, array of translation page IDs
  imageUrl?: string; // Blob URL for the uploaded image
  imageBlobId?: string; // Blob ID for management
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  rootLanguage: string; // The source language
  translationLanguages: string[]; // Target languages for translation
  pages: Record<string, string[]>; // language -> page IDs
  pageGroups: string[]; // Array of page group IDs
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived";
}

export interface CreateProjectData {
  title: string;
  description?: string;
  fileName: string;
  rootLanguage: string;
  translationLanguages: string[];
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  status?: Project["status"];
}

export interface LinkedPageGroup {
  rootPage: {
    id: string;
    title: string;
    fileName: string;
    language: string;
    editedText: string;
    status: string;
    imageUrl?: string;
  };
  translations: Record<
    string,
    {
      id: string;
      editedText: string;
      language: string;
      status: string;
    }
  >;
}

export interface PageGroup {
  id: string;
  title: string;
  fileName: string;
  rootLanguage: string;
  rootText: string;
  translations: Record<string, string>; // language code -> translated text
  imageUrl?: string;
  imageBlobId?: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "approved" | "needs_review";
}
