'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  Sparkles,
  ArrowRight,
  FolderPlus,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Modal } from '@/components/ui/modal';
import { FormField, Label, Input, Textarea, Select } from '@/components/ui/form';

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string;
  category: string;
  content: string;
  order: number;
}

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  {
    id: 'qr-1',
    title: 'Welcome & Value Proposition',
    shortcut: '/welcome',
    category: 'General',
    content:
      'Welcome to The Business Work! 😊 We make business simpler by automating customer communications, table ordering, and CRM workflows. How can our team assist you today?',
    order: 0,
  },
  {
    id: 'qr-2',
    title: 'Cafe & Restaurant QR Tap Ordering Demo',
    shortcut: '/cafe',
    category: 'Cafe & Restaurant QR',
    content:
      'Our Restaurant & Cafe QR & NFC tap ordering system allows your guests to browse your visual digital menu, order instantly from their table, and pay without app downloads. Kitchen display and billing sync in real-time. Would you like a 5-minute live demo?',
    order: 1,
  },
  {
    id: 'qr-3',
    title: 'Book a Strategy Consultation',
    shortcut: '/calendar',
    category: 'Consultation & Bookings',
    content:
      'Let’s schedule a 15-minute consultation to review your business operations and set up your automation roadmap. What date and time works best for you this week?',
    order: 2,
  },
  {
    id: 'qr-4',
    title: 'Human Specialist Takeover Notice',
    shortcut: '/agent',
    category: 'Follow-ups',
    content:
      'A senior business automation specialist has joined this chat and taken over from the AI assistant. I am reviewing your requirements now.',
    order: 3,
  },
  {
    id: 'qr-5',
    title: 'WhatsApp Automation Pricing Overview',
    shortcut: '/pricing',
    category: 'Pricing',
    content:
      'Our WhatsApp AI Automation setup starts at ₹15,000 one-time implementation, which includes flow configuration, Meta Cloud API verification, and Google Sheets CRM sync. Ongoing maintenance is ₹3,500/month.',
    order: 4,
  },
];

export function QuickRepliesManager({
  isOpen,
  onClose,
  onInsert,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (content: string) => void;
}) {
  const [replies, setReplies] = useState<QuickReply[]>(DEFAULT_QUICK_REPLIES);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing / Creating modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [title, setTitle] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');

  // New category creation
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tbw_whatsapp_quick_replies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReplies(parsed);
        }
      }
    } catch {}
  }, []);

  const saveReplies = (updated: QuickReply[]) => {
    setReplies(updated);
    try {
      localStorage.setItem('tbw_whatsapp_quick_replies', JSON.stringify(updated));
    } catch {}
  };

  const categories = useMemo(() => {
    const set = new Set(replies.map((r) => r.category));
    return ['all', ...Array.from(set)];
  }, [replies]);

  const filteredReplies = useMemo(() => {
    return replies
      .filter((r) => {
        const matchesCategory =
          activeCategory === 'all' || r.category === activeCategory;
        const matchesQuery =
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => a.order - b.order);
  }, [replies, activeCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingReply(null);
    setTitle('');
    setShortcut('/');
    setCategory(activeCategory === 'all' ? 'General' : activeCategory);
    setContent('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setTitle(reply.title);
    setShortcut(reply.shortcut);
    setCategory(reply.category);
    setContent(reply.content);
    setIsEditorOpen(true);
  };

  const handleSaveReply = () => {
    if (!title.trim() || !content.trim()) return;

    if (editingReply) {
      const updated = replies.map((r) =>
        r.id === editingReply.id
          ? { ...r, title, shortcut, category, content }
          : r
      );
      saveReplies(updated);
    } else {
      const newReply: QuickReply = {
        id: `qr-${Date.now()}`,
        title,
        shortcut: shortcut.startsWith('/') ? shortcut : `/${shortcut}`,
        category,
        content,
        order: replies.length,
      };
      saveReplies([...replies, newReply]);
    }
    setIsEditorOpen(false);
  };

  const handleDeleteReply = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const updated = replies.filter((r) => r.id !== id);
      saveReplies(updated);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredReplies.length) return;

    const copy = [...filteredReplies];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    // Re-assign order
    const updated = replies.map((r) => {
      const foundIdx = copy.findIndex((c) => c.id === r.id);
      if (foundIdx !== -1) return { ...r, order: foundIdx };
      return r;
    });

    saveReplies(updated);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setActiveCategory(newCategoryName.trim());
    setIsNewCategoryOpen(false);
    setNewCategoryName('');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Reply Templates"
        description="Standardized responses for WhatsApp and omnichannel chats. Click to insert into composer."
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewCategoryOpen(true)}
              leftIcon={<FolderPlus className="h-3.5 w-3.5" />}
            >
              New Category
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add Template
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search bar */}
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search templates by title, shortcut (/cafe), or content..."
            size="sm"
          />

          {/* Categories bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition cursor-pointer select-none ${
                  activeCategory === cat
                    ? 'bg-[#202B35] text-[#FCFBF8] dark:bg-[#FCFBF8] dark:text-[#202B35]'
                    : 'bg-[#ECE9E1] text-[#566573] hover:text-[#202B35] dark:bg-[#1E2734] dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]'
                }`}
              >
                {cat === 'all' ? 'All Templates' : cat}
              </button>
            ))}
          </div>

          {/* Templates list */}
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {filteredReplies.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
                No templates found. Click &ldquo;Add Template&rdquo; to create one.
              </div>
            ) : (
              filteredReplies.map((reply, idx) => (
                <div
                  key={reply.id}
                  className="p-3.5 rounded-xl border border-[#DDD9D0] bg-[#FCFBF8] hover:border-[#C7C1B5] transition flex flex-col justify-between gap-2.5 group dark:border-[#232D3B] dark:bg-[#141A22] dark:hover:border-[#2F3D4E]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-[#202B35] dark:text-[#FCFBF8]">
                          {reply.title}
                        </span>
                        <kbd className="font-mono text-[10px] bg-[#ECE9E1] px-1.5 py-0.2 rounded border border-[#DDD9D0] text-[#566573] font-bold dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#94A4B4]">
                          {reply.shortcut}
                        </kbd>
                        <Badge variant="neutral" size="sm">
                          {reply.category}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-[#566573] leading-relaxed dark:text-[#94A4B4]">
                        {reply.content}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 rounded text-[#566573] hover:text-[#202B35] hover:bg-[#ECE9E1] disabled:opacity-30 dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]"
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === filteredReplies.length - 1}
                        title="Move Down"
                        className="p-1 rounded text-[#566573] hover:text-[#202B35] hover:bg-[#ECE9E1] disabled:opacity-30 dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]"
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(reply)}
                        title="Edit Template"
                        className="p-1 rounded text-[#566573] hover:text-[#202B35] hover:bg-[#ECE9E1] dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReply(reply.id)}
                        title="Delete Template"
                        className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {onInsert && (
                    <div className="pt-2 border-t border-[#DDD9D0]/40 flex justify-end dark:border-[#232D3B]/40">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          onInsert(reply.content);
                          onClose();
                        }}
                        rightIcon={<ArrowRight className="h-3 w-3" />}
                      >
                        Insert into Composer
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Editor Modal for Adding / Editing a Template */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingReply ? 'Edit Quick Reply' : 'New Quick Reply Template'}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveReply}>
              Save Template
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <FormField>
            <Label required>Template Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cafe Ordering Intro"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField>
              <Label>Shortcut Trigger</Label>
              <Input
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="/shortcut"
              />
            </FormField>

            <FormField>
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category name"
              />
            </FormField>
          </div>

          <FormField>
            <Label required>Message Content</Label>
            <Textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type the message that will be inserted..."
            />
          </FormField>
        </div>
      </Modal>

      {/* New Category Modal */}
      <Modal
        isOpen={isNewCategoryOpen}
        onClose={() => setIsNewCategoryOpen(false)}
        title="Add New Template Category"
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsNewCategoryOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddCategory}>
              Create Category
            </Button>
          </>
        }
      >
        <FormField>
          <Label required>Category Name</Label>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Quotation Delivery"
          />
        </FormField>
      </Modal>
    </>
  );
}
