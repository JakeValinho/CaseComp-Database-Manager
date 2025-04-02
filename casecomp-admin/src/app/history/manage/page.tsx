'use client';

import { useState, useEffect, useCallback } from 'react';
import type { History, HistoryEntry, Competition, LogEntry } from '@/types';
import Navbar from '@/components/Navbar';
import { EditableTable, LogList } from '@/components/PasteTable';
import { supabase, resolveHistoryId, resolveCompetitionId } from '@/lib/supabase';
import {
  applyDefaults,
  generateId,
  getNow,
  validateRow,
  formatDate,
  isValidDate,
  isValidUrl,
} from '@/lib/utils';
import {
  TextEditor,
  TextareaEditor,
  DateEditor
} from '@/components/TableEditors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Default values for new history entries
const DEFAULT_VALUES: Partial<HistoryEntry> = {
  id: '',
  createdAt: '',
  updatedAt: '',
};

// Required fields for validation
const REQUIRED_FIELDS: (keyof HistoryEntry)[] = ['historyId', 'title', 'date'];

// Type validations
const TYPE_VALIDATIONS: Record<keyof HistoryEntry, (value: any) => boolean> = {
  date: (value) => !value || isValidDate(value),
  sourceUrl: (value) => !value || isValidUrl(value),
} as any;

export default function HistoryManagePage() {
  const [histories, setHistories] = useState<History[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');
  const [newEntry, setNewEntry] = useState<Partial<HistoryEntry>>({
    title: '',
    date: new Date().toISOString().slice(0, 16),
    historyId: '',
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewHistoryForm, setShowNewHistoryForm] = useState(false);
  const [newHistoryName, setNewHistoryName] = useState('');

  // Columns for the editable table
  const columns = [
    { key: 'title', header: 'Title', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    { key: 'date', header: 'Date', editor: (value, onChange) => <DateEditor value={value} onChange={onChange} /> },
    { key: 'description', header: 'Description', editor: (value, onChange) => <TextareaEditor value={value} onChange={onChange} /> },
    { key: 'sourceUrl', header: 'Source URL', editor: (value, onChange) => <TextEditor value={value} onChange={onChange} /> },
    {
      key: 'actions',
      header: 'Actions',
      editor: (_, __, row) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveEdit(row as HistoryEntry)}
          >
            Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row as HistoryEntry)}
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

      // Fetch histories
      const historiesResponse = await supabase
        .from('history')
        .select('*');

      if (historiesResponse.error) {
        throw historiesResponse.error;
      }

      // Fetch competitions to show which competition each history belongs to
      const competitionsResponse = await supabase
        .from('competition')
        .select('id, title, historyId');

      if (competitionsResponse.error) {
        throw competitionsResponse.error;
      }

      setHistories(historiesResponse.data || []);
      setCompetitions(competitionsResponse.data || []);

      // If a history is selected, fetch its entries
      if (selectedHistoryId) {
        await fetchHistoryEntries(selectedHistoryId);
      } else {
        setHistoryEntries([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHistoryId]);

  // Fetch history entries for a specific history
  const fetchHistoryEntries = async (historyId: string) => {
    try {
      const { data, error } = await supabase
        .from('historyentry')
        .select('*')
        .eq('historyId', historyId)
        .order('date');

      if (error) {
        throw error;
      }

      setHistoryEntries(data || []);
    } catch (error) {
      console.error('Error fetching history entries:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle history selection
  const handleHistorySelect = (historyId: string) => {
    setSelectedHistoryId(historyId);
    setNewEntry(prev => ({ ...prev, historyId }));
  };

  // Handle changes to entry rows
  const handleRowChange = (index: number, updatedRow: HistoryEntry) => {
    const newEntries = [...historyEntries];
    newEntries[index] = updatedRow;
    setHistoryEntries(newEntries);
  };

  // Create a new history
  const handleCreateHistory = async () => {
    if (!newHistoryName.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Generate ID and timestamps
      const now = getNow();
      const newHistory: History = {
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('history')
        .insert([newHistory]);

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
          message: `History created successfully with ID: ${newHistory.id}`,
        }
      ]);

      // Refresh histories and select the new one
      await fetchData();
      setSelectedHistoryId(newHistory.id);
      setNewEntry(prev => ({ ...prev, historyId: newHistory.id }));
      setShowNewHistoryForm(false);
      setNewHistoryName('');
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: 0,
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a new entry to the selected history
  const handleAddEntry = async () => {
    try {
      // Make sure the history ID is set
      if (!newEntry.historyId) {
        throw new Error('History ID is required');
      }

      // Validate the new entry
      const { isValid, errors } = validateRow<HistoryEntry>(
        newEntry,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Apply defaults and generate ID
      const now = getNow();
      const payload = applyDefaults<HistoryEntry>(
        { ...newEntry },
        {
          ...DEFAULT_VALUES,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
      );

      // Insert into Supabase
      const { data, error } = await supabase
        .from('historyentry')
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
          message: `Entry "${payload.title}" added successfully`,
        }
      ]);

      // Refresh entries and reset form
      await fetchHistoryEntries(payload.historyId);
      setNewEntry({
        title: '',
        date: new Date().toISOString().slice(0, 16),
        historyId: payload.historyId,
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
          payload: newEntry,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save an edited entry
  const handleSaveEdit = async (entry: HistoryEntry) => {
    try {
      // Validate the entry
      const { isValid, errors } = validateRow<HistoryEntry>(
        entry,
        REQUIRED_FIELDS,
        TYPE_VALIDATIONS as any
      );

      if (!isValid) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      setIsSubmitting(true);

      // Update timestamp
      const payload = {
        ...entry,
        updatedAt: getNow(),
      };

      // Update in Supabase
      const { data, error } = await supabase
        .from('historyentry')
        .update(payload)
        .eq('id', entry.id);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: historyEntries.findIndex(e => e.id === entry.id),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Entry "${entry.title}" updated successfully`,
        }
      ]);

      // Refresh entries
      await fetchHistoryEntries(entry.historyId);
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: historyEntries.findIndex(e => e.id === entry.id),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: entry,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an entry
  const handleDelete = async (entry: HistoryEntry) => {
    if (!confirm(`Are you sure you want to delete "${entry.title}"?`)) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Delete from Supabase
      const { error } = await supabase
        .from('historyentry')
        .delete()
        .eq('id', entry.id);

      if (error) {
        throw error;
      }

      // Log success
      setLogs(prev => [
        ...prev,
        {
          rowIndex: historyEntries.findIndex(e => e.id === entry.id),
          status: 'success',
          timestamp: new Date().toISOString(),
          message: `Entry "${entry.title}" deleted successfully`,
        }
      ]);

      // Refresh entries
      await fetchHistoryEntries(entry.historyId);
    } catch (error) {
      // Log error
      setLogs(prev => [
        ...prev,
        {
          rowIndex: historyEntries.findIndex(e => e.id === entry.id),
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error',
          payload: entry,
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the competition name from the history ID
  const getCompetitionNameFromHistoryId = (historyId: string) => {
    const competition = competitions.find(c => c.historyId === historyId);
    return competition ? competition.title : 'No associated competition';
  };

  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">History Management</h1>
          <p className="text-zinc-600">
            Add, edit, or remove history entries. History records are associated with competitions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Select History</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {histories.length > 0 ? (
                <Select
                  value={selectedHistoryId}
                  onValueChange={handleHistorySelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select History" />
                  </SelectTrigger>
                  <SelectContent>
                    {histories.map((history) => (
                      <SelectItem key={history.id} value={history.id}>
                        {history.id} - {getCompetitionNameFromHistoryId(history.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-zinc-500">No history records found</div>
              )}
            </div>

            <div>
              <Button
                variant="outline"
                onClick={() => setShowNewHistoryForm(!showNewHistoryForm)}
              >
                {showNewHistoryForm ? 'Cancel' : 'Create New History Record'}
              </Button>
            </div>
          </div>

          {showNewHistoryForm && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input
                  placeholder="Enter a name for the new competition history"
                  value={newHistoryName}
                  onChange={(e) => setNewHistoryName(e.target.value)}
                />
              </div>
              <div>
                <Button
                  onClick={handleCreateHistory}
                  disabled={isSubmitting || !newHistoryName.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating...
                    </>
                  ) : 'Create History'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {selectedHistoryId && (
          <>
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-semibold mb-4">Add New Entry</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    placeholder="Entry Title *"
                    value={newEntry.title || ''}
                    onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    type="datetime-local"
                    value={newEntry.date?.toString().substring(0, 16) || ''}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Source URL"
                    value={newEntry.sourceUrl || ''}
                    onChange={(e) => setNewEntry({ ...newEntry, sourceUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Input
                  placeholder="Description"
                  value={newEntry.description || ''}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                />
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleAddEntry}
                  disabled={isSubmitting || !newEntry.title?.trim() || !newEntry.date}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Adding...
                    </>
                  ) : 'Add Entry'}
                </Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">History Entries</h2>
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : historyEntries.length > 0 ? (
                <EditableTable
                  data={historyEntries}
                  columns={columns}
                  onRowChange={handleRowChange}
                />
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  No entries found for this history record. Add an entry above.
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
