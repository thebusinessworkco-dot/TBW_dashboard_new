'use client';

import React, { useState } from 'react';
import { Building2, Palette, Save, X, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface GeneralSettingsProps {
  initialGeneral: {
    company_name: string;
    tagline: string;
    support_email: string;
    support_phone: string;
    website_url: string;
    timezone: string;
    business_hours: string;
    address: string;
  };
  initialBrand: {
    brand_name: string;
    tagline: string;
    primary_color: string;
    accent_sage: string;
    neutral_ivory: string;
    stone_border: string;
    card_white: string;
    logo_url?: string;
    favicon_url?: string;
  };
}

export function GeneralBrandSettings({ initialGeneral, initialBrand }: GeneralSettingsProps) {
  const [general, setGeneral] = useState(initialGeneral);
  const [brand, setBrand] = useState(initialBrand);
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'general', data: general }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'General settings updated successfully.' });
        setIsEditingGeneral(false);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save general settings.' });
      }
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBrand(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'brand', data: brand }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'Brand configuration saved successfully.' });
        setIsEditingBrand(false);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save brand settings.' });
      }
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setIsSavingBrand(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-medium border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* SECTION 1: GENERAL SETTINGS */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#202B35] p-2 text-[#FCFBF8]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                General Company Settings
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Core business details, official contact channels, and operating schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingGeneral ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingGeneral(true)}
              >
                Edit Details
              </Button>
            ) : (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setGeneral(initialGeneral);
                  setIsEditingGeneral(false);
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveGeneral} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                disabled={!isEditingGeneral}
                value={general.company_name}
                onChange={(e) => setGeneral({ ...general, company_name: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Official Tagline
              </label>
              <input
                type="text"
                disabled={!isEditingGeneral}
                value={general.tagline}
                onChange={(e) => setGeneral({ ...general, tagline: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Support Email
              </label>
              <input
                type="email"
                disabled={!isEditingGeneral}
                value={general.support_email}
                onChange={(e) => setGeneral({ ...general, support_email: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Support Phone
              </label>
              <input
                type="text"
                disabled={!isEditingGeneral}
                value={general.support_phone}
                onChange={(e) => setGeneral({ ...general, support_phone: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Official Website
              </label>
              <input
                type="text"
                disabled={!isEditingGeneral}
                value={general.website_url}
                onChange={(e) => setGeneral({ ...general, website_url: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Business Timezone
              </label>
              <input
                type="text"
                disabled={!isEditingGeneral}
                value={general.timezone}
                onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Business Operating Hours
              </label>
              <input
                type="text"
                disabled={!isEditingGeneral}
                value={general.business_hours}
                onChange={(e) => setGeneral({ ...general, business_hours: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Headquarters Address
              </label>
              <input
                type="text"
                disabled={!isEditingGeneral}
                value={general.address}
                onChange={(e) => setGeneral({ ...general, address: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>
          </div>

          {isEditingGeneral && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setGeneral(initialGeneral);
                  setIsEditingGeneral(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingGeneral}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save General Settings
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* SECTION 2: BRAND SETTINGS */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#7D8F82] p-2 text-white">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Brand Identity & Palette
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Design system tokens, official typography, and brand messaging.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingBrand ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingBrand(true)}
              >
                Edit Brand
              </Button>
            ) : (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setBrand(initialBrand);
                  setIsEditingBrand(false);
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Color Palette Cards */}
        <div>
          <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-3">
            Active Design System Palette
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl border border-[#DDD9D0] bg-[#F4F2EC] dark:border-[#263342] space-y-2">
              <div className="h-7 w-full rounded-lg bg-[#F4F2EC] border border-[#DDD9D0]" />
              <div>
                <div className="font-semibold text-xs text-[#202B35]">Warm Ivory</div>
                <div className="font-mono text-[10px] text-stone-500">#F4F2EC · Page Canvas</div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#DDD9D0] bg-white dark:bg-[#1A232D] dark:border-[#263342] space-y-2">
              <div className="h-7 w-full rounded-lg bg-[#202B35]" />
              <div>
                <div className="font-semibold text-xs text-[#202B35] dark:text-white">Ink Navy</div>
                <div className="font-mono text-[10px] text-stone-500">#202B35 · Primary Action</div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#DDD9D0] bg-white dark:bg-[#1A232D] dark:border-[#263342] space-y-2">
              <div className="h-7 w-full rounded-lg bg-[#7D8F82]" />
              <div>
                <div className="font-semibold text-xs text-[#202B35] dark:text-white">Muted Sage</div>
                <div className="font-mono text-[10px] text-stone-500">#7D8F82 · Positive Status</div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#DDD9D0] bg-white dark:bg-[#1A232D] dark:border-[#263342] space-y-2">
              <div className="h-7 w-full rounded-lg bg-[#DDD9D0]" />
              <div>
                <div className="font-semibold text-xs text-[#202B35] dark:text-white">Stone</div>
                <div className="font-mono text-[10px] text-stone-500">#DDD9D0 · Borders & Divs</div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#DDD9D0] bg-white dark:bg-[#1A232D] dark:border-[#263342] space-y-2">
              <div className="h-7 w-full rounded-lg bg-[#FCFBF8] border border-[#DDD9D0]" />
              <div>
                <div className="font-semibold text-xs text-[#202B35] dark:text-white">Off White</div>
                <div className="font-mono text-[10px] text-stone-500">#FCFBF8 · Cards & Panels</div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Details Form */}
        <form onSubmit={handleSaveBrand} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Brand Display Name
              </label>
              <input
                type="text"
                disabled={!isEditingBrand}
                value={brand.brand_name}
                onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Brand Slogan / Tagline
              </label>
              <input
                type="text"
                disabled={!isEditingBrand}
                value={brand.tagline}
                onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
                className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-50 disabled:text-stone-600 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8] dark:disabled:bg-[#121820]"
              />
            </div>
          </div>

          {isEditingBrand && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setBrand(initialBrand);
                  setIsEditingBrand(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingBrand}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save Brand Settings
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
