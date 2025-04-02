'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GalleryImage, Competition, LogEntry } from '@/types';
import Navbar from '@/components/Navbar';
import { LogList } from '@/components/PasteTable';
import { supabase, resolveCompetitionId } from '@/lib/supabase';
import {
  applyDefaults,
  generateId,
  getNow,
  validateRow,
  isValidUrl,
  formatDate,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import FileUploader from '@/components/FileUploader';
import { ImagePreview } from '@/components/FileUploader';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

// Default values for new gallery images
const DEFAULT_VALUES: Partial<GalleryImage> = {
  id: '',
  createdAt: '',
};

// Required fields for validation
const REQUIRED_FIELDS: (keyof GalleryImage)[] = ['competitionId', 'imageUrl'];

// Type validations
const TYPE_VALIDATIONS: Record<keyof GalleryImage, (value: any) => boolean> = {
  imageUrl: (value) => isValidUrl(value),
} as any;

export default function GalleryManagePage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [newImage, setNewImage] = useState<Partial<GalleryImage>>({
    competitionId: '',
    imageUrl: '',
    caption: '',
    dateTaken: getNow(),
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch competitions
      const competitionsResponse = await supabase
        .from('competition')
        .select('id, title')
        .order('title');

      if (competitionsResponse.error) {
        throw competitionsResponse.error;
      }

      setCompetitions(competitionsResponse.data || []);

      // If a competition is selected, fetch its gallery images
      if (selectedCompetitionId) {
        await fetchGalleryImages(selectedCompetitionId);
      } else {
        setGalleryImages([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompetitionId]);

  // Fetch gallery images for a specific competition
  const fetchGalleryImages = async (competitionId: string) => {
    try {
      const { data, error } = await supabase
        .from('competitionGalleryImage')
        .select('*')
        .eq('competitionId', competitionId)
        .order('dateTaken', { ascending: false });

      if (error) {
        throw error;
      }

      setGalleryImages(data || []);
    } catch (error) {
      console.error('Error fetching gallery images:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle competition selection
  const handleCompetitionSelect = (competitionId: string) => {
    setSelectedCompetitionId(competitionId);
    setNewImage(prev => ({ ...prev, competitionId }));
  };

  // Handle file upload complete
  const handleUploadComplete = (url: string, file: File) => {
    setUploadedImageUrl(url);
    setNewImage(prev => ({ ...prev, imageUrl: url }));
  };

  // Handle adding a new gallery image
  const handleAddImage = async () => {
    try {
      // Validate the new image
      const { isValid, errors } = validateRow<GalleryImage>(
        newImage,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Apply defaults and generate ID
      const now = getNow();
      const payload = applyDefaults<GalleryImage>(
        { ...newImage },
        {
          ...DEFAULT_VALUES,
          id: generateId(),
          createdAt: now,
        }
      );

      // Insert into Supabase
      const { data, error } = await supabase
        .from('competitionGalleryImage')
        .insert([payload]);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Gallery image added successfully`,
        }
      ]);

      // Refresh images and reset form
      await fetchGalleryImages(payload.competitionId);
      setNewImage({
        competitionId: payload.competitionId,
        imageUrl: '',
        caption: '',
        dateTaken: getNow(),
      });
      setUploadedImageUrl('');
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: newImage,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a gallery image
  const handleDeleteImage = async (image: GalleryImage) => {
    if (!confirm('Are you sure you want to delete this gallery image?')) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Delete from Supabase
      const { error } = await supabase
        .from('competitionGalleryImage')
        .delete()
        .eq('id', image.id);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: galleryImages.findIndex(img => img.id === image.id),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Gallery image deleted successfully`,
        }
      ]);

      // Refresh images
      await fetchGalleryImages(image.competitionId);
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: galleryImages.findIndex(img => img.id === image.id),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: image,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDateForDisplay = (date: string) => {
    try {
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return date;
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gallery Management</h1>
          <p className="text-zinc-600">
            Upload and manage competition gallery images. Images are associated with specific competitions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Select Competition</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {competitions.length > 0 ? (
                <Select
                  value={selectedCompetitionId}
                  onValueChange={handleCompetitionSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Competition" />
                  </SelectTrigger>
                  <SelectContent>
                    {competitions.map((competition) => (
                      <SelectItem key={competition.id} value={competition.id}>
                        {competition.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-zinc-500">No competitions found</div>
              )}
            </div>
          </div>
        </div>

        {selectedCompetitionId && (
          <>
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-semibold mb-4">Upload New Image</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <FileUploader
                    bucket="gallery"
                    path={selectedCompetitionId}
                    onUploadComplete={handleUploadComplete}
                    accept="image/*"
                  />

                  {uploadedImageUrl && (
                    <div className="mt-4">
                      <ImagePreview url={uploadedImageUrl} alt="Uploaded image" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Caption
                    </label>
                    <Input
                      placeholder="Enter caption for the image"
                      value={newImage.caption || ''}
                      onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Date Taken
                    </label>
                    <Input
                      type="datetime-local"
                      value={newImage.dateTaken?.toString().substring(0, 16) || ''}
                      onChange={(e) => setNewImage({ ...newImage, dateTaken: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Image URL
                    </label>
                    <Input
                      placeholder="Or enter image URL directly"
                      value={newImage.imageUrl || ''}
                      onChange={(e) => setNewImage({ ...newImage, imageUrl: e.target.value })}
                      disabled={!!uploadedImageUrl}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      {uploadedImageUrl ? 'URL set from uploaded image' : 'Optional if you uploaded an image above'}
                    </p>
                  </div>

                  <div>
                    <Button
                      onClick={handleAddImage}
                      disabled={isSubmitting || !newImage.imageUrl?.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Adding...
                        </>
                      ) : 'Add to Gallery'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Gallery Images</h2>

              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : galleryImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {galleryImages.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={image.imageUrl}
                          alt={image.caption || 'Gallery image'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/600x400?text=Image+Error';
                          }}
                        />
                      </div>
                      <CardContent className="p-4">
                        <p className="text-sm font-medium">{image.caption || 'No caption'}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Date: {formatDateForDisplay(image.dateTaken || '')}
                        </p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteImage(image)}
                        >
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  No gallery images found for this competition. Upload an image above.
                </div>
              )}
            </div>
          </>
        )}

        {logs.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Log</h2>
            <LogList logs={logs} />
          </div>
        )}
      </div>
    </main>
  );
}
