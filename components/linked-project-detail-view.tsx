"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, FileText, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectOCRScanner } from "@/components/project-ocr-scanner";
import { EditableTextDisplay } from "@/components/editable-text-display";
import type { Project, LinkedPageGroup } from "@/types/project";
import { PageTitleEditor } from "@/components/page-title-editor";
import { InlineTranslationEditor } from "@/components/inline-translation-editor";

interface LinkedProjectDetailViewProps {
  project: Project;
  onBack: () => void;
}

const SUPPORTED_LANGUAGES = [
  {
    code: "ara",
    name: "Arabic (العربية)",
    direction: "rtl" as const,
    flag: "🇸🇦",
  },
  { code: "eng", name: "English", direction: "ltr" as const, flag: "🇺🇸" },
  {
    code: "fra",
    name: "French (Français)",
    direction: "ltr" as const,
    flag: "🇫🇷",
  },
  {
    code: "spa",
    name: "Spanish (Español)",
    direction: "ltr" as const,
    flag: "🇪🇸",
  },
  {
    code: "deu",
    name: "German (Deutsch)",
    direction: "ltr" as const,
    flag: "🇩🇪",
  },
];

export function LinkedProjectDetailView({
  project,
  onBack,
}: LinkedProjectDetailViewProps) {
  const [linkedPageGroups, setLinkedPageGroups] = useState<LinkedPageGroup[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [ocrScannerOpen, setOcrScannerOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchLinkedPageGroups();
  }, [project.id]);

  const fetchLinkedPageGroups = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`);
      if (response.ok) {
        const data = await response.json();
        setLinkedPageGroups(data.linkedPageGroups || []);
      }
    } catch (error) {
      console.error("Error fetching linked page groups:", error);
      toast({
        title: "Error",
        description: "Failed to fetch project pages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRootLanguagePage = () => {
    console.log("Add root page clicked, project:", project);
    console.log("Root language:", project.rootLanguage);
    setSelectedLanguage(project.rootLanguage);
    setOcrScannerOpen(true);
  };

  const handlePageSaved = () => {
    console.log("Page saved, refreshing page groups");
    fetchLinkedPageGroups();
  };

  const handleUpdatePageText = async (pageId: string, newText: string) => {
    try {
      // Check if this is a root page or translation
      const isTranslation = pageId.includes("_");

      if (isTranslation) {
        // Extract page group ID and language from the translation ID
        const [pageGroupId, language] = pageId.split("_");

        const response = await fetch(
          `/api/page-groups/${pageGroupId}/translations`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language, text: newText }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update translation");
        }
      } else {
        // Update root text
        const response = await fetch(`/api/page-groups/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rootText: newText }),
        });

        if (!response.ok) {
          throw new Error("Failed to update root text");
        }
      }

      await fetchLinkedPageGroups();
      toast({
        title: "Success",
        description: "Text updated successfully",
      });
    } catch (error) {
      console.error("Error updating text:", error);
      toast({
        title: "Error",
        description: "Failed to update text",
        variant: "destructive",
      });
    }
  };

  const handleCreateTranslation = async (
    pageGroupId: string,
    language: string,
    translationText: string
  ) => {
    try {
      console.log("Creating translation:", {
        pageGroupId,
        language,
        translationText: translationText.substring(0, 50) + "...",
      });

      const response = await fetch(
        `/api/page-groups/${pageGroupId}/translations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language, text: translationText }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to create translation: ${
            errorData.error || response.statusText
          }`
        );
      }

      console.log("Translation created successfully");

      // Refresh the page groups to show the new translation
      await fetchLinkedPageGroups();

      toast({
        title: "Success",
        description: "Translation created successfully",
      });
    } catch (error) {
      console.error("Error creating translation:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create translation",
        variant: "destructive",
      });
    }
  };

  const getLanguageInfo = (code: string) => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  };

  const handleUpdatePageTitle = async (pageId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/page-groups/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        await fetchLinkedPageGroups();
        toast({
          title: "Success",
          description: "Page title updated successfully",
        });
      } else {
        throw new Error("Failed to update page title");
      }
    } catch (error) {
      console.error("Error updating page title:", error);
      toast({
        title: "Error",
        description: "Failed to update page title",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading project details...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Project Context:</strong> Pages will be automatically added to
          "{project.title}" project.
        </p>
      </div>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Root Language:</span>
                <Badge variant="default" className="bg-blue-600">
                  {getLanguageInfo(project.rootLanguage)?.flag}{" "}
                  {getLanguageInfo(project.rootLanguage)?.name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Translation Languages:
                </span>
                <div className="flex gap-1">
                  {(project.translationLanguages || []).map((langCode) => {
                    const langInfo = getLanguageInfo(langCode);
                    return (
                      <Badge
                        key={langCode}
                        variant="outline"
                        className="text-xs">
                        {langInfo?.flag} {langInfo?.name || langCode}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge
                  variant={
                    project.status === "active" ? "default" : "secondary"
                  }>
                  {project.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Created:</span>
                <span className="text-sm">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Root Page Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Page Groups</h2>
        <Button onClick={handleAddRootLanguagePage} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Root Page
        </Button>
      </div>

      {/* Linked Page Groups */}
      {linkedPageGroups.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No pages yet</h3>
          <p className="text-muted-foreground mb-4">
            Add pages in {getLanguageInfo(project.rootLanguage)?.name} to get
            started
          </p>
          <Button onClick={handleAddRootLanguagePage} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload & OCR Images
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {linkedPageGroups.map((group, index) => {
            const rootLangInfo = getLanguageInfo(group.rootPage.language);

            return (
              <Card key={group.rootPage.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="bg-blue-600">
                          ROOT
                        </Badge>
                      </div>
                      <PageTitleEditor
                        title={group.rootPage.title || ""}
                        fileName={group.rootPage.fileName}
                        onSave={(newTitle) =>
                          handleUpdatePageTitle(group.rootPage.id, newTitle)
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Root Page */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="default" className="bg-blue-600">
                        {rootLangInfo?.flag} {rootLangInfo?.name}
                      </Badge>
                      <Badge variant="outline">{group.rootPage.status}</Badge>
                    </div>
                    <EditableTextDisplay
                      text={group.rootPage.editedText}
                      language={group.rootPage.language}
                      direction={rootLangInfo?.direction || "ltr"}
                      onSave={(newText) =>
                        handleUpdatePageText(group.rootPage.id, newText)
                      }
                    />
                  </div>

                  {/* Translation Pages */}
                  <div className="space-y-3">
                    {(project.translationLanguages || []).map((langCode) => {
                      const langInfo = getLanguageInfo(langCode);
                      const translationPage = group.translations[langCode];

                      return (
                        <div key={langCode} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {langInfo?.flag} {langInfo?.name}
                              </Badge>
                              {translationPage && (
                                <Badge variant="outline">
                                  {translationPage.status}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {translationPage ? (
                            <EditableTextDisplay
                              text={translationPage.editedText}
                              language={translationPage.language}
                              direction={langInfo?.direction || "ltr"}
                              onSave={(newText) =>
                                handleUpdatePageText(
                                  translationPage.id,
                                  newText
                                )
                              }
                            />
                          ) : (
                            <div className="space-y-3">
                              <div className="text-center py-2 text-muted-foreground">
                                <p>No {langInfo?.name} translation</p>
                              </div>
                              <InlineTranslationEditor
                                rootPageText={group.rootPage.editedText}
                                targetLanguage={langCode}
                                languageInfo={langInfo}
                                onSave={(translationText) =>
                                  handleCreateTranslation(
                                    group.rootPage.id,
                                    langCode,
                                    translationText
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* OCR Scanner Dialog */}
      <ProjectOCRScanner
        project={project}
        language={project.rootLanguage}
        isOpen={ocrScannerOpen}
        onClose={() => setOcrScannerOpen(false)}
        onPageSaved={handlePageSaved}
      />
    </div>
  );
}
