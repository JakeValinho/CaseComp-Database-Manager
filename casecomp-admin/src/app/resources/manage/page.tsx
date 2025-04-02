'use client';

import { useState, useEffect, useCallback } from 'react';
import { type Resource, ResourceType, type LogEntry } from '@/types';
import Navbar from '@/components/Navbar';
import { EditableTable, LogList } from '@/components/PasteTable';
import { supabase } from '@/lib/supabase';
import {
  applyDefaults,
  generateId,
  getNow,
  validateRow,
  isValidUrl,
  toNumber,
} from '@/lib/utils';
import {
  TextEditor,
  TextareaEditor,
  ResourceTypeEditor,
  BooleanEditor,
  NumberEditor,
  ImageUrlEditor,
  LongDescriptionEditor,
} from '@/components/TableEditors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import FileUploader from '@/components/FileUploader';
import { ImagePreview } from '@/components/FileUploader';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Default values for new resources
const DEFAULT_VALUES: Partial<Resource> = {
  resourceId: '',
  createdAt: '',
  updatedAt: '',
  isPaid: false,
  price: 0,
  createdBy: 'admin',
};

// Required fields for validation
const REQUIRED_FIELDS: (keyof Resource)[] = ['title', 'type'];

// Type validations
const TYPE_VALIDATIONS: Record<keyof Resource, (value: any) => boolean> = {
  websiteUrl: (value) => !value || isValidUrl(value),
  imageUrl: (value) => !value || isValidUrl(value),
  bannerUrl: (value) => !value || isValidUrl(value),
} as any;

export default function ResourcesManagePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [newResource, setNewResource] = useState<Partial<Resource>>({
    title: '',
    type: ResourceType.ARTICLE,
    isPaid: false,
    price: 0,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState<'image' | 'banner' | false>(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Columns for the editable table
  const columns = [
    { key: 'title', header: 'Title', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'type', header: 'Type', editor: (value, onChange) => <ResourceTypeEditor value={value} onChange={onChange} /> },
    { key: 'shortDescription', header: 'Short Description', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'longDescription', header: 'Long Description', editor: (value, onChange, row) => (
      <LongDescriptionEditor
        value={value}
        onChange={onChange}
        onGenerateShort={() => handleGenerateShortDescription(row as Resource)}
      />
    )},
    { key: 'websiteUrl', header: 'Website URL', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'imageUrl', header: 'Image URL', editor: (value, onChange, row) => (
      <ImageUrlEditor
        value={value}
        onChange={onChange}
        onUpload={() => handleImageUpload(row as Resource, 'image')}
      />
    )},
    { key: 'bannerUrl', header: 'Banner URL', editor: (value, onChange, row) => (
      <ImageUrlEditor
        value={value}
        onChange={onChange}
        onUpload={() => handleImageUpload(row as Resource, 'banner')}
      />
    )},
    { key: 'isPaid', header: 'Is Paid', editor: (value, onChange) => <BooleanEditor value={value} onChange={onChange} /> },
    { key: 'price', header: 'Price ($)', editor: (value, onChange) => <NumberEditor value={value} onChange={onChange} /> },
    {
      key: 'actions',
      header: 'Actions',
      editor: (_, __, row) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveEdit(row as Resource)}
          >
            Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row as Resource)}
          >
            Delete
          </Button>
        </div>
      )
    },
  ];

  // Fetch resources
  const fetchResources = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('title');

      if (error) {
        throw error;
      }

      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Handle image upload dialog
  const handleImageUpload = (resource: Resource, type: 'image' | 'banner') => {
    setSelectedResource(resource);
    setDialogOpen(type);
  };

  // Handle changes to resource rows
  const handleRowChange = (index: number, updatedRow: Resource) => {
    const newResources = [...resources];
    newResources[index] = updatedRow;
    setResources(newResources);
  };

  // Generate short description using OpenAI
  const handleGenerateShortDescription = async (resource: Resource) => {
    if (!resource.longDescription || resource.longDescription.length <= 50) {
      return;
    }

    try {
      const response = await fetch('/api/gpt-shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ longDescription: resource.longDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate short description');
      }

      const data = await response.json();

      // Update the resource with the generated short description
      const updatedResources = resources.map((r) =>
        r.resourceId === resource.resourceId
          ? { ...r, shortDescription: data.shortDescription }
          : r
      );

      setResources(updatedResources);

      // Save the updated short description to Supabase
      await supabase
        .from('resources')
        .update({ shortDescription: data.shortDescription, updatedAt: getNow() })
        .eq('resourceId', resource.resourceId);

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: resources.findIndex(r => r.resourceId === resource.resourceId),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Short description generated for "${resource.title}"`,
        }
      ]);
    } catch (error) {
      console.error('Error generating short description:', error);

      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: resources.findIndex(r => r.resourceId === resource.resourceId),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      ]);
    }
  };

  // Handle adding a new resource
  const handleAddResource = async () => {
    try {
      // Validate the new resource
      const { isValid, errors } = validateRow<Resource>(
        newResource,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Apply defaults and generate ID
      const now = getNow();
      const payload = applyDefaults<Resource>(
        { ...newResource },
        {
          ...DEFAULT_VALUES,
          resourceId: newResource.resourceId || generateId(),
          createdAt: now,
          updatedAt: now,
        }
      );

      // If not paid, set price to 0
      if (!payload.isPaid) {
        payload.price = 0;
      }

      // Insert into Supabase
      const { data, error } = await supabase
        .from('resources')
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
          message: `Resource "${payload.title}" added successfully`,
        }
      ]);

      // Refresh resources and reset form
      await fetchResources();
      setNewResource({
        title: '',
        type: ResourceType.ARTICLE,
        isPaid: false,
        price: 0,
      });
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: newResource,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle saving an edited resource
  const handleSaveEdit = async (resource: Resource) => {
    try {
      // Validate the resource
      const { isValid, errors } = validateRow<Resource>(
        resource,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Update timestamp
      const payload = {
        ...resource,
        updatedAt: getNow(),
      };

      // If not paid, set price to 0
      if (!payload.isPaid) {
        payload.price = 0;
      }

      // Update in Supabase
      const { data, error } = await supabase
        .from('resources')
        .update(payload)
        .eq('resourceId', resource.resourceId);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: resources.findIndex(r => r.resourceId === resource.resourceId),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Resource "${resource.title}" updated successfully`,
        }
      ]);

      // Refresh resources
      await fetchResources();
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: resources.findIndex(r => r.resourceId === resource.resourceId),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: resource,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a resource
  const handleDelete = async (resource: Resource) => {
    if (!confirm(`Are you sure you want to delete ${resource.title}?`)) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Delete from Supabase
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('resourceId', resource.resourceId);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: resources.findIndex(r => r.resourceId === resource.resourceId),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Resource "${resource.title}" deleted successfully`,
        }
      ]);

      // Refresh resources
      await fetchResources();
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: resources.findIndex(r => r.resourceId === resource.resourceId),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: resource,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file upload complete
  const handleUploadComplete = async (url: string, file: File) => {
    if (!selectedResource || !dialogOpen) return;

    const field = dialogOpen === 'image' ? 'imageUrl' : 'bannerUrl';

    // Find the resource in the list and update it
    const updatedResources = resources.map(r =>
      r.resourceId === selectedResource.resourceId
        ? { ...r, [field]: url }
        : r
    );

    setResources(updatedResources);

    // Save the change to Supabase
    try {
      const { error } = await supabase
        .from('resources')
        .update({ [field]: url, updatedAt: getNow() })
        .eq('resourceId', selectedResource.resourceId);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: resources.findIndex(r => r.resourceId === selectedResource.resourceId),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `${dialogOpen === 'image' ? 'Image' : 'Banner'} updated for "${selectedResource.title}"`,
        }
      ]);
    } catch (error) {
      console.error('Error saving image URL:', error);
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: resources.findIndex(r => r.resourceId === selectedResource.resourceId),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      ]);
    }

    // Close the dialog
    setDialogOpen(false);
    setSelectedResource(null);
  };

  // Format resource type for display
  const formatResourceType = (type: ResourceType) => {
    return type.replace('_', ' ');
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Resource Management</h1>
          <p className="text-zinc-600">
            Add, edit, or remove resource records. Resources can be articles, videos, decks, or external links.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Resource</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Title *
              </label>
              <Input
                placeholder="Resource Title"
                value={newResource.title || ''}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Type *
              </label>
              <Select
                value={newResource.type}
                onValueChange={(value) => setNewResource({ ...newResource, type: value as ResourceType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ResourceType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatResourceType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Website URL
              </label>
              <Input
                placeholder="Website URL"
                value={newResource.websiteUrl || ''}
                onChange={(e) => setNewResource({ ...newResource, websiteUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Short Description
            </label>
            <Input
              placeholder="Short Description"
              value={newResource.shortDescription || ''}
              onChange={(e) => setNewResource({ ...newResource, shortDescription: e.target.value })}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Long Description
            </label>
            <Textarea
              placeholder="Long Description"
              value={newResource.longDescription || ''}
              onChange={(e) => setNewResource({ ...newResource, longDescription: e.target.value })}
              rows={3}
            />
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="isPaid"
              checked={newResource.isPaid || false}
              onCheckedChange={(checked) => setNewResource({
                ...newResource,
                isPaid: !!checked,
                price: !checked ? 0 : newResource.price
              })}
            />
            <label htmlFor="isPaid" className="text-sm font-medium text-zinc-700">
              Is Paid Resource
            </label>

            {newResource.isPaid && (
              <Input
                type="number"
                placeholder="Price"
                value={newResource.price || 0}
                onChange={(e) => setNewResource({ ...newResource, price: Number(e.target.value) })}
                className="ml-4 w-24"
              />
            )}
          </div>

          <div className="mt-4">
            <Button
              onClick={handleAddResource}
              disabled={isSubmitting || !newResource.title?.trim() || !newResource.type}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Adding...
                </>
              ) : 'Add Resource'}
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Resources</h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <EditableTable
              data={resources}
              columns={columns}
              onRowChange={handleRowChange}
            />
          )}
        </div>

        {logs.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Log</h2>
            <LogList logs={logs} />
          </div>
        )}
      </div>

      {/* Image Upload Dialog */}
      <Dialog open={!!dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {dialogOpen === 'image' ? 'Image' : 'Banner'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <FileUploader
              bucket="resources"
              path={selectedResource?.resourceId ? `${selectedResource.resourceId}/${dialogOpen}` : ''}
              onUploadComplete={handleUploadComplete}
              accept="image/*"
            />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
