import { useState, useRef, type ChangeEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface FileUploaderProps {
  bucket: string;
  path?: string;
  onUploadComplete: (url: string, file: File) => void;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileUploader({
  bucket,
  path = '',
  onUploadComplete,
  accept = 'image/*',
  maxSizeMB = 5,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setUploadError(`File size exceeds the limit of ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Generate a unique filename with uuid
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const fullPath = path ? `${path}/${fileName}` : fileName;

      // Upload file to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(fullPath, file);

      if (error) {
        throw new Error(error.message);
      }

      // Get public URL
      const publicUrl = supabase
        .storage
        .from(bucket)
        .getPublicUrl(data.path).data.publicUrl;

      // Call the callback with the URL
      onUploadComplete(publicUrl, file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file-upload">Upload File</Label>
        <Input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Spinner className="h-4 w-4" />
          <span>Uploading...</span>
        </div>
      )}

      {uploadError && (
        <div className="text-sm text-red-600">
          {uploadError}
        </div>
      )}
    </div>
  );
}

interface ImagePreviewProps {
  url: string;
  alt?: string;
  onRemove?: () => void;
}

export function ImagePreview({ url, alt = 'Preview', onRemove }: ImagePreviewProps) {
  return (
    <div className="relative">
      <img
        src={url}
        alt={alt}
        className="object-cover rounded-md max-h-48 w-auto"
      />

      {onRemove && (
        <Button
          variant="destructive"
          size="sm"
          className="absolute top-2 right-2"
          onClick={onRemove}
        >
          Remove
        </Button>
      )}
    </div>
  );
}
