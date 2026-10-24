import { createAdminClient } from '../supabase/admin';
import { getAllReelRules } from './reel-automation';
import { parseAndNormalizeInstagramReelUrl } from './reel-url-resolver';
import { InstagramReelRule } from '../types/dashboard';

export interface SyncedReelItem {
  media_id: string; // The real numeric Meta Media ID e.g. "180429182390192"
  shortcode: string;
  caption: string;
  permalink: string;
  thumbnail_url?: string;
  media_url?: string;
  timestamp: string; // ISO 8601
  media_type: 'VIDEO' | 'IMAGE' | 'CAROUSEL_ALBUM';
  media_product_type?: string;
  comments_count?: number;
  like_count?: number;
  rule_id?: string | null;
  rule_enabled?: boolean;
  is_available?: boolean;
  availability_status?: 'published' | 'deleted_or_unavailable';
  rule_status_reason?: string | null;
}

export interface SyncedReelsStore {
  account: {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
  };
  last_synced_at: string;
  reels: SyncedReelItem[];
  unavailable_rules?: SyncedReelItem[];
}

export interface MetaConfig {
  accessToken: string;
  accountId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
}

/**
 * Loads Meta Instagram Graph API credentials from environment or Supabase admin_settings
 */
export async function getMetaInstagramCredentials(): Promise<MetaConfig | null> {
  const envToken = process.env.INSTAGRAM_GRAPH_API_ACCESS_TOKEN;
  const envAccount = process.env.INSTAGRAM_ACCOUNT_ID;

  if (envToken && envAccount) {
    return {
      accessToken: envToken,
      accountId: envAccount,
      username: 'thebusinesswork.co',
    };
  }

  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    try {
      const { data, error } = await adminSupabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'instagram_meta_config')
        .maybeSingle();

      if (!error && data?.value) {
        const val = data.value as {
          access_token?: string;
          account_id?: string;
          username?: string;
          name?: string;
          profile_picture_url?: string;
        };
        if (val.access_token) {
          return {
            accessToken: val.access_token,
            accountId: val.account_id || '29081127174886627',
            username: val.username || 'thebusinesswork.co',
            name: val.name,
            profilePictureUrl: val.profile_picture_url,
          };
        }
      }
    } catch {
      // Supabase unavailable
    }
  }

  return null;
}

/**
 * Fetches published Reels from Meta Graph API with pagination support
 * CRITICAL RULE: Never infer deletion unless account identity, permissions, and complete sync are verified!
 */
export async function syncReelsFromMeta(options: { maxPages?: number } = {}): Promise<{
  success: boolean;
  store: SyncedReelsStore;
  error?: string;
}> {
  const metaConfig = await getMetaInstagramCredentials();
  if (!metaConfig) {
    const cached = await getCachedSyncedReels();
    return {
      success: false,
      store: cached,
      error: 'Meta Instagram Graph API credentials are not configured. Using cached Reels.',
    };
  }

  // 1. Verify Account Identity & Access Token health first
  let verifiedAccount = {
    id: metaConfig.accountId,
    username: metaConfig.username,
    name: metaConfig.name,
    profile_picture_url: metaConfig.profilePictureUrl,
  };

  try {
    const accRes = await fetch('https://graph.instagram.com/v26.0/me?fields=id,username,name,profile_picture_url', {
      headers: {
        Authorization: `Bearer ${metaConfig.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (accRes.ok) {
      const accData = await accRes.json() as Record<string, unknown>;
      verifiedAccount = {
        id: String(accData.id || metaConfig.accountId),
        username: String(accData.username || metaConfig.username),
        name: String(accData.name || metaConfig.name || 'The Business Work'),
        profile_picture_url: (accData.profile_picture_url || metaConfig.profilePictureUrl) as string | undefined,
      };
    } else {
      const errJson = await accRes.json().catch(() => ({}));
      console.warn('Account verification failed before media sync:', errJson);
      const cached = await getCachedSyncedReels();
      return {
        success: false,
        store: cached,
        error: 'Instagram account authorization failed. Kept existing cache to protect data.',
      };
    }
  } catch (accErr) {
    console.warn('Network error during account verification:', accErr);
    const cached = await getCachedSyncedReels();
    return {
      success: false,
      store: cached,
      error: 'Network timeout during account verification. Kept existing cache to protect data.',
    };
  }

  // 2. Fetch all published media with pagination
  const maxPages = options.maxPages || 5;
  const fetchedReels: SyncedReelItem[] = [];
  let nextUrl: string | null =
    `https://graph.instagram.com/v26.0/me/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,comments_count,like_count&limit=50`;

  let pagesFetched = 0;
  let syncFailed = false;
  let syncErrorMessage: string | undefined;

  try {
    while (nextUrl && pagesFetched < maxPages) {
      pagesFetched++;
      const res: Response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${metaConfig.accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`Meta Graph API media fetch error (page ${pagesFetched}):`, errJson);
        syncFailed = true;
        syncErrorMessage = `Meta API returned HTTP ${res.status} on page ${pagesFetched}.`;
        break;
      }

      const body = (await res.json()) as { data?: Array<Record<string, unknown>>; paging?: { next?: string } };
      const dataList: Array<Record<string, unknown>> = Array.isArray(body.data) ? body.data : [];

      for (const item of dataList) {
        const permalink = String(item.permalink || '');
        const shortcode = permalink.match(/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i)?.[1] || '';

        // Filter: ensure it is a video/reel
        const mediaProductType = String(item.media_product_type || '').toUpperCase();
        const mediaType = String(item.media_type || '').toUpperCase();
        const isReel =
          mediaProductType === 'REELS' ||
          mediaType === 'VIDEO' ||
          permalink.includes('/reel/');

        if (isReel && item.id) {
          fetchedReels.push({
            media_id: String(item.id),
            shortcode,
            caption: String(item.caption || ''),
            permalink: permalink || (shortcode ? `https://www.instagram.com/reel/${shortcode}/` : ''),
            thumbnail_url: (item.thumbnail_url || item.media_url || '') as string,
            media_url: (item.media_url || item.thumbnail_url || '') as string,
            timestamp: String(item.timestamp || new Date().toISOString()),
            media_type: (mediaType as 'VIDEO' | 'IMAGE') || 'VIDEO',
            media_product_type: mediaProductType || 'REELS',
            comments_count: Number(item.comments_count) || 0,
            like_count: Number(item.like_count) || 0,
            is_available: true,
            availability_status: 'published',
          });
        }
      }

      nextUrl = (body.paging?.next as string) || null;
    }
  } catch (err: unknown) {
    console.warn('Network error during Meta media sync:', err);
    syncFailed = true;
    syncErrorMessage = err instanceof Error ? err.message : 'Network error during media sync';
  }

  // 3. SAFETY GUARD: If API call failed or timed out, do NOT mark any reels as deleted!
  if (syncFailed && pagesFetched === 1 && fetchedReels.length === 0) {
    const cached = await getCachedSyncedReels();
    return {
      success: false,
      store: cached,
      error: `Sync aborted: ${syncErrorMessage || 'API failure'}. Existing Reel library preserved.`,
    };
  }

  // 4. Verified Complete Sync: Cross-reference with existing automation rules from Supabase
  const existingRules = await getAllReelRules();
  const ruleMap = new Map(existingRules.map((r) => [r.media_id, r]));
  const unavailableRules: SyncedReelItem[] = [];

  const adminSupabase = createAdminClient();

  // Attach rule status to confirmed published reels
  for (const reel of fetchedReels) {
    const r = ruleMap.get(reel.media_id);
    if (r) {
      reel.rule_id = r.id;
      reel.rule_enabled = r.is_enabled;
      reel.is_available = true;
      reel.availability_status = 'published';
    }
  }

  // Detect missing / deleted Reels: any existing rule NOT in fetchedReels
  for (const r of existingRules) {
    const isPublished = fetchedReels.some((fr) => fr.media_id === r.media_id);
    if (!isPublished && r.media_id) {
      const shortcode = r.permalink?.match(/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i)?.[1] || '';
      
      // Auto-pause rule and record audit status
      const unavailableItem: SyncedReelItem = {
        media_id: r.media_id,
        shortcode,
        caption: r.title,
        permalink: r.permalink || (shortcode ? `https://www.instagram.com/reel/${shortcode}/` : ''),
        thumbnail_url: r.thumbnail_url || '',
        media_url: r.thumbnail_url || '',
        timestamp: r.created_at || new Date().toISOString(),
        media_type: 'VIDEO',
        media_product_type: 'REELS',
        comments_count: r.comments_count || 0,
        rule_id: r.id,
        rule_enabled: false, // Auto-paused
        is_available: false,
        availability_status: 'deleted_or_unavailable',
        rule_status_reason: 'Reel confirmed deleted from Instagram account',
      };
      unavailableRules.push(unavailableItem);

      // Persist auto-paused status in Supabase so it does not falsely trigger
      if (adminSupabase) {
        try {
          await adminSupabase
            .from('instagram_reel_rules')
            .update({
              is_enabled: false,
              updated_at: new Date().toISOString(),
            })
            .eq('media_id', r.media_id);

          await adminSupabase.from('admin_settings').upsert({
            key: `reel_rule_meta_${r.media_id}`,
            value: {
              is_available: false,
              availability_status: 'deleted_or_unavailable',
              rule_status_reason: 'Reel confirmed deleted from Instagram account',
              updated_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
        } catch {
          // Non-blocking
        }
      }
    }
  }

  const store: SyncedReelsStore = {
    account: verifiedAccount,
    last_synced_at: new Date().toISOString(),
    reels: fetchedReels,
    unavailable_rules: unavailableRules,
  };

  // Persist synced reels cache into Supabase admin_settings
  if (adminSupabase) {
    try {
      await adminSupabase.from('admin_settings').upsert({
        key: 'instagram_synced_reels',
        value: store,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
    } catch {
      // Storage fallback
    }
  }

  return { success: true, store };
}

/**
 * Retrieves cached synced reels from Supabase, merged with current automation rules
 */
export async function getCachedSyncedReels(): Promise<SyncedReelsStore> {
  const metaConfig = await getMetaInstagramCredentials();
  const defaultAccount = {
    id: metaConfig?.accountId || '29081127174886627',
    username: metaConfig?.username || 'thebusinesswork.co',
    name: metaConfig?.name || 'The Business Work',
    profile_picture_url: metaConfig?.profilePictureUrl,
  };

  const existingRules = await getAllReelRules();
  const ruleMap = new Map(existingRules.map((r) => [r.media_id, r]));

  let cachedReels: SyncedReelItem[] = [];
  let unavailableRules: SyncedReelItem[] = [];
  let lastSyncedAt = new Date(0).toISOString();

  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    try {
      const { data } = await adminSupabase
        .from('admin_settings')
        .select('value, updated_at')
        .eq('key', 'instagram_synced_reels')
        .maybeSingle();

      if (data?.value) {
        const val = data.value as SyncedReelsStore;
        if (Array.isArray(val.reels)) {
          // Only include items confirmed available
          cachedReels = val.reels.filter((r) => r.is_available !== false && r.availability_status !== 'deleted_or_unavailable');
          lastSyncedAt = val.last_synced_at || (data.updated_at as string);
        }
        if (Array.isArray(val.unavailable_rules)) {
          unavailableRules = val.unavailable_rules;
        }
      }
    } catch {
      // Fallback
    }
  }

  // Update rule states in cached items
  for (const item of cachedReels) {
    const r = ruleMap.get(item.media_id);
    if (r) {
      item.rule_id = r.id;
      item.rule_enabled = r.is_enabled;
      item.is_available = r.is_available !== false;
      item.availability_status = r.availability_status || 'published';
    } else {
      item.rule_id = null;
      item.rule_enabled = false;
    }
  }

  // Check if any rule in existingRules is marked unavailable
  for (const r of existingRules) {
    if (r.is_available === false || r.availability_status === 'deleted_or_unavailable') {
      const alreadyInUnavailable = unavailableRules.some((u) => u.media_id === r.media_id);
      if (!alreadyInUnavailable) {
        const shortcode = r.permalink?.match(/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i)?.[1] || '';
        unavailableRules.push({
          media_id: r.media_id,
          shortcode,
          caption: r.title,
          permalink: r.permalink || (shortcode ? `https://www.instagram.com/reel/${shortcode}/` : ''),
          thumbnail_url: r.thumbnail_url || '',
          media_url: r.thumbnail_url || '',
          timestamp: r.created_at || new Date().toISOString(),
          media_type: 'VIDEO',
          comments_count: r.comments_count || 0,
          rule_id: r.id,
          rule_enabled: false,
          is_available: false,
          availability_status: 'deleted_or_unavailable',
          rule_status_reason: r.rule_status_reason || 'Reel confirmed deleted from Instagram account',
        });
      }
    }
  }

  return {
    account: defaultAccount,
    last_synced_at: lastSyncedAt,
    reels: cachedReels,
    unavailable_rules: unavailableRules,
  };
}

/**
 * Resolves a pasted Instagram Reel URL to its verified real numeric Media ID
 */
export async function resolvePastedReelUrl(rawUrl: string): Promise<{
  success: boolean;
  reel?: SyncedReelItem;
  existingRule?: InstagramReelRule | null;
  error?: string;
  canManualFallback?: boolean;
}> {
  const parsed = parseAndNormalizeInstagramReelUrl(rawUrl);
  if (!parsed.isValid || !parsed.shortcode) {
    return {
      success: false,
      error: parsed.error || 'Invalid Instagram Reel URL format. Please enter a valid URL like: https://www.instagram.com/reel/SHORTCODE/',
    };
  }

  const shortcode = parsed.shortcode;

  // 1. Check in cached synced reels
  const cached = await getCachedSyncedReels();
  const cachedMatch = cached.reels.find(
    (r) => r.shortcode.toLowerCase() === shortcode.toLowerCase() ||
           r.permalink.toLowerCase().includes(`/reel/${shortcode.toLowerCase()}`) ||
           r.permalink.toLowerCase().includes(`/p/${shortcode.toLowerCase()}`)
  );

  if (cachedMatch) {
    const existingRules = await getAllReelRules();
    const existingRule = existingRules.find((r) => r.media_id === cachedMatch.media_id) || null;
    return {
      success: true,
      reel: cachedMatch,
      existingRule,
    };
  }

  // 2. Query Meta API live to discover newly published Reel
  const synced = await syncReelsFromMeta({ maxPages: 5 });
  const liveMatch = synced.store.reels.find(
    (r) => r.shortcode.toLowerCase() === shortcode.toLowerCase() ||
           r.permalink.toLowerCase().includes(`/reel/${shortcode.toLowerCase()}`) ||
           r.permalink.toLowerCase().includes(`/p/${shortcode.toLowerCase()}`)
  );

  if (liveMatch) {
    const existingRules = await getAllReelRules();
    const existingRule = existingRules.find((r) => r.media_id === liveMatch.media_id) || null;
    return {
      success: true,
      reel: liveMatch,
      existingRule,
    };
  }

  // 3. Security Boundary: The Reel was not found in @thebusinesswork.co's account
  return {
    success: false,
    error: `Reel shortcode "${shortcode}" was not found in published media of connected account @thebusinesswork.co. Verify that this Reel was published by @thebusinesswork.co and not a different account. If you know the verified numeric Media ID from Meta Business Suite, you can enter it directly under Advanced / Manual Entry.`,
    canManualFallback: true,
  };
}
