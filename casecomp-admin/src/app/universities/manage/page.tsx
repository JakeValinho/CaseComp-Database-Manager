'use client';

import { useState, useEffect, useCallback } from 'react';
import type { University, LogEntry } from '@/types';
import Navbar from '@/components/Navbar';
import { EditableTable, LogList } from '@/components/PasteTable';
import { supabase } from '@/lib/supabase';
import {
  applyDefaults,
  generateId,
  getNow,
  validateRow,
  isValidUrl,
} from '@/lib/utils';
import {
  TextEditor,
  ImageUrlEditor,
  TextareaEditor
} from '@/components/TableEditors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import FileUploader from '@/components/FileUploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Default values for new universities
const DEFAULT_VALUES: Partial<University> = {
  id: '',
  createdAt: '',
  updatedAt: '',
};

// Required fields for validation
const REQUIRED_FIELDS: (keyof University)[] = ['name'];

// Type validations
const TYPE_VALIDATIONS: Record<keyof University, (value: any) => boolean> = {
  logoUrl: (value) => !value || isValidUrl(value),
  bannerImageUrl: (value) => !value || isValidUrl(value),
  websiteUrl: (value) => !value || isValidUrl(value),
} as any;

export default function UniversitiesManagePage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [newUniversity, setNewUniversity] = useState<Partial<University>>({ name: '' });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);

  // Columns for the editable table
  const columns = [
    { key: 'name', header: 'Name', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'shortName', header: 'Short Name', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'cities', header: 'Cities', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'state', header: 'State', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'country', header: 'Country', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'description', header: 'Description', editor: (value, onChange) => <TextareaEditor value={value} onChange={onChange} /> },
    { key: 'emailDomain', header: 'Email Domain', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'logoUrl', header: 'Logo URL', editor: (value, onChange, row) => (
      <ImageUrlEditor
        value={value}
        onChange={onChange}
        onUpload={() => handleImageUpload(row as University, 'logo')}
      />
    )},
    { key: 'bannerImageUrl', header: 'Banner URL', editor: (value, onChange, row) => (
      <ImageUrlEditor
        value={value}
        onChange={onChange}
        onUpload={() => handleImageUpload(row as University, 'banner')}
      />
    )},
    { key: 'websiteUrl', header: 'Website URL', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    {
      key: 'actions',
      header: 'Actions',
      editor: (_, __, row) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveEdit(row as University)}
          >
            Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row as University)}
          >
            Delete
          </Button>
        </div>
      )
    },
  ];

  // Fetch universities
  const fetchUniversities = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('university')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setUniversities(data || []);
    } catch (error) {
      console.error('Error fetching universities:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniversities();
  }, [fetchUniversities]);

  // Handle image upload dialog
  const handleImageUpload = (university: University, type: 'logo' | 'banner') => {
    setSelectedUniversity(university);
    setDialogOpen(true);
  };

  // Handle changes to university rows
  const handleRowChange = (index: number, updatedRow: University) => {
    const newUniversities = [...universities];
    newUniversities[index] = updatedRow;
    setUniversities(newUniversities);
  };

  // Handle adding a new university
  const handleAddUniversity = async () => {
    try {
      // Validate the new university
      const { isValid, errors } = validateRow<University>(
        newUniversity,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Apply defaults and generate ID
      const now = getNow();
      const payload = applyDefaults<University>(
        { ...newUniversity },
        {
          ...DEFAULT_VALUES,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
      );

      // Insert into Supabase
      const { data, error } = await supabase
        .from('university')
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
          message: `University "${payload.name}" added successfully`,
        }
      ]);

      // Refresh universities and reset form
      await fetchUniversities();
      setNewUniversity({ name: '' });
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: newUniversity,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle saving an edited university
  const handleSaveEdit = async (university: University) => {
    try {
      // Validate the university
      const { isValid, errors } = validateRow<University>(
        university,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Update timestamp
      const payload = {
        ...university,
        updatedAt: getNow(),
      };

      // Update in Supabase
      const { data, error } = await supabase
        .from('university')
        .update(payload)
        .eq('id', university.id);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: universities.findIndex(u => u.id === university.id),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `University "${university.name}" updated successfully`,
        }
      ]);

      // Refresh universities
      await fetchUniversities();
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: universities.findIndex(u => u.id === university.id),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: university,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a university
  const handleDelete = async (university: University) => {
    if (!confirm(`Are you sure you want to delete ${university.name}?`)) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Delete from Supabase
      const { error } = await supabase
        .from('university')
        .delete()
        .eq('id', university.id);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: universities.findIndex(u => u.id === university.id),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `University "${university.name}" deleted successfully`,
        }
      ]);

      // Refresh universities
      await fetchUniversities();
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: universities.findIndex(u => u.id === university.id),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: university,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file upload complete
  const handleUploadComplete = async (url: string, file: File) => {
    if (!selectedUniversity) return;

    const field = dialogOpen === 'logo' ? 'logoUrl' : 'bannerImageUrl';

    // Find the university in the list and update it
    const updatedUniversities = universities.map(u =>
      u.id === selectedUniversity.id
        ? { ...u, [field]: url }
        : u
    );

    setUniversities(updatedUniversities);

    // Save the change to Supabase
    try {
      const { error } = await supabase
        .from('university')
        .update({ [field]: url, updatedAt: getNow() })
        .eq('id', selectedUniversity.id);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: universities.findIndex(u => u.id === selectedUniversity.id),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `${field === 'logoUrl' ? 'Logo' : 'Banner'} updated for "${selectedUniversity.name}"`,
        }
      ]);
    } catch (error) {
      console.error('Error saving image URL:', error);
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: universities.findIndex(u => u.id === selectedUniversity.id),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      ]);
    }

    // Close the dialog
    setDialogOpen(false);
    setSelectedUniversity(null);
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">University Management</h1>
          <p className="text-zinc-600">
            Add, edit, or remove university records. Universities are used as foreign keys in competitions and organizers.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New University</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="University Name *"
                value={newUniversity.name || ''}
                onChange={(e) => setNewUniversity({ ...newUniversity, name: e.target.value })}
              />
            </div>
            <div>
              <Input
                placeholder="Short Name"
                value={newUniversity.shortName || ''}
                onChange={(e) => setNewUniversity({ ...newUniversity, shortName: e.target.value })}
              />
            </div>
            <div>
              <Input
                placeholder="Email Domain"
                value={newUniversity.emailDomain || ''}
                onChange={(e) => setNewUniversity({ ...newUniversity, emailDomain: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={handleAddUniversity}
              disabled={isSubmitting || !newUniversity.name?.trim()}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Adding...
                </>
              ) : 'Add University'}
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Universities</h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <EditableTable
              data={universities}
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
              Upload {dialogOpen === 'logo' ? 'Logo' : 'Banner'} Image
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <FileUploader
              bucket="universities"
              path={selectedUniversity?.id || ''}
              onUploadComplete={handleUploadComplete}
              accept="image/*"
            />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
