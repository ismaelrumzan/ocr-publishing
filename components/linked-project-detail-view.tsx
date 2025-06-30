"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EditableTextDisplay } from "@/components/editable-text-display";
import { InlineTranslationEditor } from "@/components/inline-translation-editor";
import { ProjectOCRScanner } from "@/components/project-ocr-scanner";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { useToast } from "@/hooks/use-toast";
import type { Project, LinkedPageGroup } from "@/types/project";
import {
  ArrowLeft,
  Plus,
  FileText,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";

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
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageTitle, setSelectedImageTitle] = useState<string>("");
  const { toast } = useToast();

  const rootLangInfo = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === project.rootLanguage
  );

  useEffect(() => {
    fetchLinkedPageGroups();
  }, [project.id]);

  const fetchLinkedPageGroups = async () => {
    try {
      console.log(`Fetching linked page groups for project: ${project.id}`);
      const response = await fetch(`/api/projects/${project.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log("API response data:", data);
        console.log("Linked page groups:", data.linkedPageGroups);
        setLinkedPageGroups(data.linkedPageGroups || []);
      }
    } catch (error) {
      console.error("Error fetching linked page groups:", error);
      toast({
        title: "Error",
        description: "Failed to fetch project data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePageText = async (pageId: string, newText: string) => {
    try {
      console.log("Updating page text:", {
        pageId,
        newTextLength: newText.length,
      });

      // Check if this is a translation page ID (contains underscore)
      const isTranslation = pageId.includes("_");

      if (isTranslation) {
        // Extract page group ID and language from the translation ID
        // Translation IDs have format: "pageGroupId_languageCode"
        // We need to split on the last underscore to get the language
        const lastUnderscoreIndex = pageId.lastIndexOf("_");
        const pageGroupId = pageId.substring(0, lastUnderscoreIndex);
        const language = pageId.substring(lastUnderscoreIndex + 1);

        console.log("Translation parsing:");
        console.log("  Original pageId:", pageId);
        console.log("  Last underscore index:", lastUnderscoreIndex);
        console.log("  Extracted pageGroupId:", pageGroupId);
        console.log("  Extracted language:", language);

        const response = await fetch(
          `/api/page-groups/${pageGroupId}/translations`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language, text: newText }),
          }
        );

        console.log("Translation update response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Translation update error:", errorData);
          throw new Error(
            `Failed to update translation: ${
              errorData.error || response.statusText
            }`
          );
        }

        const responseData = await response.json();
        console.log("Translation update response:", responseData);
      } else {
        // Update root text
        console.log("Updating root text for page group:", pageId);

        const response = await fetch(`/api/page-groups/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rootText: newText }),
        });

        console.log("Root text update response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Root text update error:", errorData);
          throw new Error(
            `Failed to update root text: ${
              errorData.error || response.statusText
            }`
          );
        }

        const responseData = await response.json();
        console.log("Root text update response:", responseData);
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
        description:
          error instanceof Error ? error.message : "Failed to update text",
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

  const handlePageSaved = async () => {
    await fetchLinkedPageGroups();
    setOcrScannerOpen(false);
  };

  const getTranslationCount = (group: LinkedPageGroup) => {
    return Object.keys(group.translations).length;
  };

  const getTranslationLanguages = (group: LinkedPageGroup) => {
    return Object.keys(group.translations).map(
      (lang) => getLanguageInfo(lang)?.name || lang
    );
  };

  const handleImageClick = (
    imageUrl: string,
    title: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent accordion from expanding
    setSelectedImage(imageUrl);
    setSelectedImageTitle(title);
    setImageDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading project data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Button onClick={() => setOcrScannerOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Page
        </Button>
      </div>

      {/* Project Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Languages</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-600">
                    {rootLangInfo?.flag} {rootLangInfo?.name} (Root)
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {project.translationLanguages.map((langCode) => {
                    const langInfo = getLanguageInfo(langCode);
                    return (
                      <Badge key={langCode} variant="outline">
                        {langInfo?.flag} {langInfo?.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Statistics</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Total Pages: {linkedPageGroups.length}</div>
                <div>
                  Total Translations:{" "}
                  {linkedPageGroups.reduce(
                    (total, group) => total + getTranslationCount(group),
                    0
                  )}
                </div>
                <div>
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Groups Accordion */}
      {linkedPageGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Pages Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first page using the OCR scanner to get started.
            </p>
            <Button onClick={() => setOcrScannerOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add First Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {linkedPageGroups.map((group, index) => (
            <AccordionItem
              key={group.rootPage.id}
              value={group.rootPage.id}
              className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  {/* Left side - Title and translation info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <h3 className="font-medium text-lg">
                          {group.rootPage.title || `Page ${index + 1}`}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="default"
                            className="bg-blue-600 text-xs">
                            {rootLangInfo?.flag} {rootLangInfo?.name}
                          </Badge>
                          {getTranslationCount(group) > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <span>•</span>
                              <span>
                                {getTranslationCount(group)} translation
                                {getTranslationCount(group) !== 1 ? "s" : ""}
                              </span>
                              <span>•</span>
                              <span>
                                {getTranslationLanguages(group).join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Thumbnail image */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-24 h-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden border shadow-sm ${
                        group.rootPage.imageUrl
                          ? "cursor-pointer hover:opacity-80 transition-opacity"
                          : ""
                      }`}
                      onClick={(e) => {
                        if (group.rootPage.imageUrl) {
                          handleImageClick(
                            group.rootPage.imageUrl,
                            group.rootPage.title || `Page ${index + 1}`,
                            e
                          );
                        }
                      }}>
                      {group.rootPage.imageUrl ? (
                        <img
                          src={group.rootPage.imageUrl}
                          alt="Scanned page thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <FileText className="w-8 h-8 mb-2" />
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
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
                  <div className="space-y-4">
                    {(project.translationLanguages || []).map((langCode) => {
                      const langInfo = getLanguageInfo(langCode);
                      const translationPage = group.translations[langCode];

                      return (
                        <div key={langCode} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline">
                              {langInfo?.flag} {langInfo?.name}
                            </Badge>
                            {translationPage && (
                              <Badge variant="outline">
                                {translationPage.status}
                              </Badge>
                            )}
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
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedImageTitle}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageDialogOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-hidden h-[70vh]">
            {selectedImage && (
              <ZoomableImage
                src={selectedImage}
                alt={selectedImageTitle}
                className="w-full h-full"
                showControls={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
