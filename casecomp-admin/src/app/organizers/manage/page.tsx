'use client';

import { useState, useEffect, useCallback } from 'react';
import { type Organizer, OrgType, type LogEntry } from '@/types';
import Navbar from '@/components/Navbar';
import { EditableTable, LogList } from '@/components/PasteTable';
import { supabase, resolveUniversityId } from '@/lib/supabase';
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
  TextareaEditor,
  OrgTypeEditor,
  BooleanEditor
} from '@/components/TableEditors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import FileUploader from '@/components/FileUploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Default values for new organizers
const DEFAULT_VALUES: Partial<Organizer> = {
  orgId: '',
  createdAt: '',
  updatedAt: '',
  isUniversity: false,
};

// Required fields for validation
const REQUIRED_FIELDS: (keyof Organizer)[] = ['orgName', 'orgType'];

// Type validations
const TYPE_VALIDATIONS: Record<keyof Organizer, (value: any) => boolean> = {
  orgWebsiteUrl: (value) => !value || isValidUrl(value),
  orgLogoUrl: (value) => !value || isValidUrl(value),
  orgBannerUrl: (value) => !value || isValidUrl(value),
} as any;

export default function OrganizersManagePage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [universities, setUniversities] = useState<{ id: string, name: string }[]>([]);
  const [newOrganizer, setNewOrganizer] = useState<Partial<Organizer>>({
    orgName: '',
    orgType: OrgType.COMPANY,
    isUniversity: false
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState<'logo' | 'banner' | false>(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);

  // Columns for the editable table
  const columns = [
    { key: 'orgName', header: 'Name', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'orgType', header: 'Type', editor: (value, onChange) => <OrgTypeEditor value={value} onChange={onChange} /> },
    { key: 'orgShortDescription', header: 'Short Description', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'orgLongDescription', header: 'Long Description', editor: (value, onChange) => <TextareaEditor value={value} onChange={onChange} /> },
    { key: 'isUniversity', header: 'Is University', editor: (value, onChange) => <BooleanEditor value={value} onChange={onChange} /> },
    { key: 'universityId', header: 'University ID', editor: (value, onChange, row) => (
      row.isUniversity ? (
        <Select
          value={value}
          onValueChange={onChange}
        >
          <SelectTrigger className="min-w-[180px]">
            <SelectValue placeholder="Select University" />
          </SelectTrigger>
          <SelectContent>
            {universities.map((uni) => (
              <SelectItem key={uni.id} value={uni.id}>
                {uni.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : <div className="text-zinc-400">Not a university</div>
    )},
    { key: 'city', header: 'City', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'state', header: 'State', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'country', header: 'Country', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'orgWebsiteUrl', header: 'Website URL', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'orgLogoUrl', header: 'Logo URL', editor: (value, onChange, row) => (
      <ImageUrlEditor
        value={value}
        onChange={onChange}
        onUpload={() => handleImageUpload(row as Organizer, 'logo')}
      />
    )},
    { key: 'orgBannerUrl', header: 'Banner URL', editor: (value, onChange, row) => (
      <ImageUrlEditor
        value={value}
        onChange={onChange}
        onUpload={() => handleImageUpload(row as Organizer, 'banner')}
      />
    )},
    {
      key: 'actions',
      header: 'Actions',
      editor: (_, __, row) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveEdit(row as Organizer)}
          >
            Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row as Organizer)}
          >
            Delete
          </Button>
        </div>
      )
    },
  ];

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch organizers
      const organizersResponse = await supabase
        .from('organizer')
        .select('*')
        .order('orgName');

      if (organizersResponse.error) {
        throw organizersResponse.error;
      }

      // Fetch universities for the dropdown
      const universitiesResponse = await supabase
        .from('university')
        .select('id, name')
        .order('name');

      if (universitiesResponse.error) {
        throw universitiesResponse.error;
      }

      setOrganizers(organizersResponse.data || []);
      setUniversities(universitiesResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle image upload dialog
  const handleImageUpload = (organizer: Organizer, type: 'logo' | 'banner') => {
    setSelectedOrganizer(organizer);
    setDialogOpen(type);
  };

  // Handle changes to organizer rows
  const handleRowChange = (index: number, updatedRow: Organizer) => {
    const newOrganizers = [...organizers];
    newOrganizers[index] = updatedRow;
    setOrganizers(newOrganizers);
  };

  // Handle adding a new organizer
  const handleAddOrganizer = async () => {
    try {
      // Validate the new organizer
      const { isValid, errors } = validateRow<Organizer>(
        newOrganizer,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Apply defaults and generate ID
      const now = getNow();
      const payload = applyDefaults<Organizer>(
        { ...newOrganizer },
        {
          ...DEFAULT_VALUES,
          orgId: generateId(),
          createdAt: now,
          updatedAt: now,
        }
      );

      // If not a university, remove the universityId
      if (!payload.isUniversity) {
        payload.universityId = undefined;
      }

      // Insert into Supabase
      const { data, error } = await supabase
        .from('organizer')
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
          message: `Organizer "${payload.orgName}" added successfully`,
        }
      ]);

      // Refresh organizers and reset form
      await fetchData();
      setNewOrganizer({
        orgName: '',
        orgType: OrgType.COMPANY,
        isUniversity: false
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
          payload: newOrganizer,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle saving an edited organizer
  const handleSaveEdit = async (organizer: Organizer) => {
    try {
      // Validate the organizer
      const { isValid, errors } = validateRow<Organizer>(
        organizer,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Update timestamp
      const payload = {
        ...organizer,
        updatedAt: getNow(),
      };

      // If not a university, remove the universityId
      if (!payload.isUniversity) {
        payload.universityId = undefined;
      }

      // Update in Supabase
      const { data, error } = await supabase
        .from('organizer')
        .update(payload)
        .eq('orgId', organizer.orgId);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: organizers.findIndex(o => o.orgId === organizer.orgId),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Organizer "${organizer.orgName}" updated successfully`,
        }
      ]);

      // Refresh organizers
      await fetchData();
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: organizers.findIndex(o => o.orgId === organizer.orgId),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: organizer,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting an organizer
  const handleDelete = async (organizer: Organizer) => {
    if (!confirm(`Are you sure you want to delete ${organizer.orgName}?`)) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Delete from Supabase
      const { error } = await supabase
        .from('organizer')
        .delete()
        .eq('orgId', organizer.orgId);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: organizers.findIndex(o => o.orgId === organizer.orgId),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Organizer "${organizer.orgName}" deleted successfully`,
        }
      ]);

      // Refresh organizers
      await fetchData();
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: organizers.findIndex(o => o.orgId === organizer.orgId),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: organizer,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file upload complete
  const handleUploadComplete = async (url: string, file: File) => {
    if (!selectedOrganizer || !dialogOpen) return;

    const field = dialogOpen === 'logo' ? 'orgLogoUrl' : 'orgBannerUrl';

    // Find the organizer in the list and update it
    const updatedOrganizers = organizers.map(o =>
      o.orgId === selectedOrganizer.orgId
        ? { ...o, [field]: url }
        : o
    );

    setOrganizers(updatedOrganizers);

    // Save the change to Supabase
    try {
      const { error } = await supabase
        .from('organizer')
        .update({ [field]: url, updatedAt: getNow() })
        .eq('orgId', selectedOrganizer.orgId);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: organizers.findIndex(o => o.orgId === selectedOrganizer.orgId),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `${dialogOpen === 'logo' ? 'Logo' : 'Banner'} updated for "${selectedOrganizer.orgName}"`,
        }
      ]);
    } catch (error) {
      console.error('Error saving image URL:', error);
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: organizers.findIndex(o => o.orgId === selectedOrganizer.orgId),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      ]);
    }

    // Close the dialog
    setDialogOpen(false);
    setSelectedOrganizer(null);
  };

  // Handle university selection for new organizer
  const handleUniversitySelect = (universityId: string) => {
    setNewOrganizer({ ...newOrganizer, universityId, isUniversity: true });
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Organizer Management</h1>
          <p className="text-zinc-600">
            Add, edit, or remove organizer records. Organizers are used as foreign keys in competitions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Organizer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Organizer Name *"
                value={newOrganizer.orgName || ''}
                onChange={(e) => setNewOrganizer({ ...newOrganizer, orgName: e.target.value })}
              />
            </div>
            <div>
              <Select
                value={newOrganizer.orgType}
                onValueChange={(value) => setNewOrganizer({ ...newOrganizer, orgType: value as OrgType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(OrgType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-university"
                checked={newOrganizer.isUniversity || false}
                onChange={(e) => setNewOrganizer({
                  ...newOrganizer,
                  isUniversity: e.target.checked,
                  universityId: e.target.checked ? newOrganizer.universityId : undefined
                })}
              />
              <label htmlFor="is-university">Is University</label>

              {newOrganizer.isUniversity && (
                <Select
                  value={newOrganizer.universityId}
                  onValueChange={handleUniversitySelect}
                >
                  <SelectTrigger className="ml-4">
                    <SelectValue placeholder="Select University" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((uni) => (
                      <SelectItem key={uni.id} value={uni.id}>
                        {uni.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={handleAddOrganizer}
              disabled={isSubmitting || !newOrganizer.orgName?.trim()}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Adding...
                </>
              ) : 'Add Organizer'}
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Organizers</h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <EditableTable
              data={organizers}
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
              bucket="organizers"
              path={selectedOrganizer?.orgId || ''}
              onUploadComplete={handleUploadComplete}
              accept="image/*"
            />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
