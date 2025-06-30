"use client";

import type React from "react";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Check, Edit3, Download, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Tesseract from "tesseract.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TextDisplay } from "@/components/text-display";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { useApprovedTexts } from "@/contexts/approved-texts-context";
import { PageTitleEditor } from "@/components/page-title-editor";

interface ProcessedPage {
  id: string;
  file: File;
  imageUrl: string;
  ocrText: string;
  editedText: string;
  title: string; // Add title field
  status: "processing" | "completed" | "approved";
  progress: number;
}

interface Language {
  code: string;
  name: string;
  direction: "ltr" | "rtl";
}

interface StandaloneOCRDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: "ara", name: "Arabic (العربية)", direction: "rtl" },
  { code: "eng", name: "English", direction: "ltr" },
  { code: "fra", name: "French (Français)", direction: "ltr" },
  { code: "spa", name: "Spanish (Español)", direction: "ltr" },
  { code: "deu", name: "German (Deutsch)", direction: "ltr" },
  { code: "ita", name: "Italian (Italiano)", direction: "ltr" },
  { code: "por", name: "Portuguese (Português)", direction: "ltr" },
  { code: "rus", name: "Russian (Русский)", direction: "ltr" },
  { code: "chi_sim", name: "Chinese Simplified (中文)", direction: "ltr" },
  { code: "jpn", name: "Japanese (日本語)", direction: "ltr" },
];

export function StandaloneOCRDialog({
  isOpen,
  onClose,
}: StandaloneOCRDialogProps) {
  const [pages, setPages] = useState<ProcessedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    SUPPORTED_LANGUAGES[0]
  ); // Default to Arabic
  const { addApprovedText } = useApprovedTexts();

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newPages: ProcessedPage[] = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        imageUrl: URL.createObjectURL(file),
        ocrText: "",
        editedText: "",
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension for initial title
        status: "processing" as const,
        progress: 0,
      }));

      setPages((prev) => [...prev, ...newPages]);
      setIsProcessing(true);

      // Process each image with OCR
      for (const page of newPages) {
        try {
          const result = await Tesseract.recognize(
            page.file,
            selectedLanguage.code,
            {
              logger: (m) => {
                if (m.status === "recognizing text") {
                  setPages((prev) =>
                    prev.map((p) =>
                      p.id === page.id
                        ? { ...p, progress: Math.round(m.progress * 100) }
                        : p
                    )
                  );
                }
              },
            }
          );

          setPages((prev) =>
            prev.map((p) =>
              p.id === page.id
                ? {
                    ...p,
                    ocrText: result.data.text,
                    editedText: result.data.text,
                    status: "completed" as const,
                    progress: 100,
                  }
                : p
            )
          );
        } catch (error) {
          console.error("OCR Error:", error);
          toast({
            title: "OCR Error",
            description: `Failed to process ${page.file.name}`,
            variant: "destructive",
          });
        }
      }

      setIsProcessing(false);
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${newPages.length} page(s)`,
      });
    },
    [toast, selectedLanguage.code]
  );

  const updateText = (pageId: string, newText: string) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId ? { ...page, editedText: newText } : page
      )
    );
  };

  const updateTitle = (pageId: string, newTitle: string) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId ? { ...page, title: newTitle } : page
      )
    );
  };

  const approvePage = async (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (page) {
      try {
        // Save to JSON-based storage
        const response = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: page.file.name,
            title: page.title,
            originalText: page.ocrText,
            editedText: page.editedText,
            language: selectedLanguage.code,
            status: "approved",
          }),
        });

        if (response.ok) {
          const dbPage = await response.json();

          // Update local state
          setPages((prev) =>
            prev.map((p) =>
              p.id === pageId ? { ...p, status: "approved" as const } : p
            )
          );

          // Add to approved texts context for translation
          addApprovedText({
            id: pageId,
            fileName: page.file.name,
            text: page.editedText,
            language: selectedLanguage.code,
            approvedAt: new Date(),
          });

          toast({
            title: "Page Approved",
            description: "Page has been approved and saved",
          });
        } else {
          throw new Error("Failed to save page");
        }
      } catch (error) {
        console.error("Error saving page:", error);
        toast({
          title: "Error",
          description: "Failed to save page",
          variant: "destructive",
        });
      }
    }
  };

  const deletePage = (pageId: string) => {
    setPages((prev) => {
      const pageToDelete = prev.find((p) => p.id === pageId);
      if (pageToDelete) {
        URL.revokeObjectURL(pageToDelete.imageUrl);
      }
      return prev.filter((p) => p.id !== pageId);
    });
  };

  const exportAllText = () => {
    const allText = pages
      .filter((page) => page.status === "approved")
      .map((page, index) => `--- Page ${index + 1} ---\n${page.editedText}`)
      .join("\n\n");

    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr-results.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: ProcessedPage["status"]) => {
    switch (status) {
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "completed":
        return <Badge variant="outline">Ready for Review</Badge>;
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            Approved
          </Badge>
        );
    }
  };

  const handleClose = () => {
    // Clean up any remaining object URLs
    pages.forEach((page) => {
      if (page.imageUrl) {
        URL.revokeObjectURL(page.imageUrl);
      }
    });
    setPages([]);
    onClose();
  };

  // Check if we have any processed pages to show the full-width layout
  const hasProcessedPages = pages.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`${
          hasProcessedPages ? "max-w-[95vw] w-[95vw]" : "max-w-2xl"
        } max-h-[95vh] overflow-y-auto`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Standalone OCR Scanner
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section - Only show if no pages or still processing */}
          {(!hasProcessedPages || isProcessing) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Scanned Pages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language-select">OCR Language</Label>
                  <Select
                    value={selectedLanguage.code}
                    onValueChange={(value) => {
                      const language = SUPPORTED_LANGUAGES.find(
                        (lang) => lang.code === value
                      );
                      if (language) setSelectedLanguage(language);
                    }}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          {language.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="standalone-file-upload"
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor="standalone-file-upload"
                    className={`cursor-pointer ${
                      isProcessing ? "opacity-50 cursor-not-allowed" : ""
                    }`}>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      {isProcessing
                        ? "Processing..."
                        : "Click to upload images"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Support for JPG, PNG, and other image formats
                    </p>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {pages.some((page) => page.status === "approved") && (
            <div className="flex gap-4">
              <Button onClick={exportAllText} className="gap-2">
                <Download className="w-4 h-4" />
                Export Approved Text
              </Button>
              <Button
                onClick={() => setPages([])}
                variant="outline"
                className="gap-2">
                <Upload className="w-4 h-4" />
                Upload More Images
              </Button>
            </div>
          )}

          {/* Full-Width Pages Display */}
          <div className="space-y-6">
            {pages.map((page) => (
              <div key={page.id} className="space-y-4">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <PageTitleEditor
                      title={page.title}
                      fileName={page.file.name}
                      onSave={(newTitle) => updateTitle(page.id, newTitle)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(page.status)}
                    {page.status === "completed" && (
                      <Button
                        onClick={() => approvePage(page.id)}
                        className="gap-2">
                        <Check className="w-4 h-4" />
                        Approve & Save
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePage(page.id)}
                      className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Processing Progress */}
                {page.status === "processing" && (
                  <div className="space-y-2">
                    <Progress value={page.progress} className="w-full" />
                    <p className="text-sm text-muted-foreground">
                      Processing... {page.progress}%
                    </p>
                  </div>
                )}

                {/* Full-Width Comparison Layout */}
                {(page.status === "completed" ||
                  page.status === "approved") && (
                  <div className="grid grid-cols-2 gap-6 min-h-[70vh]">
                    {/* Image Panel - Left Side */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Original Scan</h4>
                        <Badge variant="outline" className="text-xs">
                          {selectedLanguage.name}
                        </Badge>
                      </div>
                      <div className="border rounded-lg overflow-hidden bg-muted h-full">
                        <ZoomableImage
                          src={page.imageUrl || "/placeholder.svg"}
                          alt={`Scan of ${page.file.name}`}
                          className="w-full h-full"
                          showControls={true}
                          maxZoom={3}
                          alignTopOnFit={true}
                        />
                      </div>
                    </div>

                    {/* Text Panel - Right Side */}
                    <div className="space-y-3 flex flex-col">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        <h4 className="font-medium">Extracted Text</h4>
                        {page.status === "approved" && (
                          <Badge
                            variant="default"
                            className="bg-green-600 text-xs">
                            Approved
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1">
                        <TextDisplay
                          text={page.editedText}
                          language={selectedLanguage.code}
                          direction={selectedLanguage.direction}
                          editable={page.status !== "approved"}
                          onChange={(newText) => updateText(page.id, newText)}
                          className="h-full min-h-[calc(70vh-4rem)]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pages.length === 0 && (
            <div className="text-center py-12">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                No pages uploaded yet
              </h3>
              <p className="text-muted-foreground">
                Upload some scanned images to get started with OCR processing
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
