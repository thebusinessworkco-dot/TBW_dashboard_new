import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit';
import { TeamMember, TeamRole } from '@/lib/types/dashboard';


const DEFAULT_SUPERADMIN: TeamMember = {
  id: '92318d7c-0b0d-40a2-942f-002d425fcb73',
  email: 'thebusinesswork.co@gmail.com',
  name: 'Aman Rajbhar',
  role: 'superadmin',
  phone: '+91 86046 00292',
  avatar: 'AR',
  added_at: '2026-10-21T11:24:17.571Z',
  last_active_at: new Date().toISOString(),
  status: 'active',
  permissions: {
    can_manage_contacts: true,
    can_manage_chats: true,
    can_takeover_bot: true,
    can_manage_leads: true,
    can_manage_appointments: true,
    can_manage_quotations: true,
    can_manage_automations: true,
    can_manage_settings: true,
    can_view_audit_logs: true,
  },
};

const DEFAULT_ROLES_PERMISSIONS: Record<TeamRole, TeamMember['permissions']> = {
  superadmin: {
    can_manage_contacts: true,
    can_manage_chats: true,
    can_takeover_bot: true,
    can_manage_leads: true,
    can_manage_appointments: true,
    can_manage_quotations: true,
    can_manage_automations: true,
    can_manage_settings: true,
    can_view_audit_logs: true,
  },
  admin: {
    can_manage_contacts: true,
    can_manage_chats: true,
    can_takeover_bot: true,
    can_manage_leads: true,
    can_manage_appointments: true,
    can_manage_quotations: true,
    can_manage_automations: true,
    can_manage_settings: false,
    can_view_audit_logs: true,
  },
  manager: {
    can_manage_contacts: true,
    can_manage_chats: true,
    can_takeover_bot: true,
    can_manage_leads: true,
    can_manage_appointments: true,
    can_manage_quotations: true,
    can_manage_automations: false,
    can_manage_settings: false,
    can_view_audit_logs: false,
  },
  agent: {
    can_manage_contacts: true,
    can_manage_chats: true,
    can_takeover_bot: true,
    can_manage_leads: true,
    can_manage_appointments: true,
    can_manage_quotations: false,
    can_manage_automations: false,
    can_manage_settings: false,
    can_view_audit_logs: false,
  },
  observer: {
    can_manage_contacts: false,
    can_manage_chats: false,
    can_takeover_bot: false,
    can_manage_leads: false,
    can_manage_appointments: false,
    can_manage_quotations: false,
    can_manage_automations: false,
    can_manage_settings: false,
    can_view_audit_logs: false,
  },
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        members: [DEFAULT_SUPERADMIN],
        role_definitions: DEFAULT_ROLES_PERMISSIONS,
      });
    }

    const { data: settingRow } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'team_members')
      .maybeSingle();

    let teamMembers: TeamMember[] = [DEFAULT_SUPERADMIN];
    if (settingRow?.value && Array.isArray(settingRow.value) && settingRow.value.length > 0) {
      // Ensure superadmin is present at the front
      const customMembers = settingRow.value.filter((m: TeamMember) => m.email !== DEFAULT_SUPERADMIN.email);
      teamMembers = [DEFAULT_SUPERADMIN, ...customMembers];
    }

    return NextResponse.json({
      success: true,
      members: teamMembers,
      role_definitions: DEFAULT_ROLES_PERMISSIONS,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error fetching team members' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { action, member } = body;

    const { data: settingRow } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'team_members')
      .maybeSingle();

    let currentMembers: TeamMember[] = (settingRow?.value as TeamMember[]) || [DEFAULT_SUPERADMIN];

    if (action === 'add') {
      if (!member?.email || !member?.name) {
        return NextResponse.json(
          { success: false, error: 'Name and valid email are required' },
          { status: 400 }
        );
      }

      const role: TeamRole = member.role || 'agent';
      const newMember: TeamMember = {
        id: crypto.randomUUID(),
        email: member.email.toLowerCase().trim(),
        name: member.name.trim(),
        role,
        phone: member.phone || '',
        avatar: member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'TB',
        added_at: new Date().toISOString(),
        status: 'active',
        permissions: member.permissions || DEFAULT_ROLES_PERMISSIONS[role],
      };

      currentMembers.push(newMember);

      await supabase.from('admin_settings').upsert({
        key: 'team_members',
        value: currentMembers,
        updated_at: new Date().toISOString(),
      });

      await recordAuditLog({
        action: 'TEAM_MEMBER_ADD',
        targetEntity: 'TEAM',
        targetId: newMember.email,
        metadata: { name: newMember.name, role: newMember.role },
      });

      return NextResponse.json({ success: true, member: newMember });
    }

    if (action === 'update') {
      const idx = currentMembers.findIndex((m) => m.id === member.id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
      }

      // Safeguard superadmin
      if (currentMembers[idx].email === DEFAULT_SUPERADMIN.email && member.role !== 'superadmin') {
        return NextResponse.json(
          { success: false, error: 'Cannot downgrade principal Superadmin' },
          { status: 403 }
        );
      }

      currentMembers[idx] = {
        ...currentMembers[idx],
        ...member,
        permissions: member.permissions || DEFAULT_ROLES_PERMISSIONS[member.role as TeamRole] || currentMembers[idx].permissions,
      };

      await supabase.from('admin_settings').upsert({
        key: 'team_members',
        value: currentMembers,
        updated_at: new Date().toISOString(),
      });

      await recordAuditLog({
        action: 'TEAM_MEMBER_UPDATE',
        targetEntity: 'TEAM',
        targetId: currentMembers[idx].email,
        metadata: { role: currentMembers[idx].role },
      });

      return NextResponse.json({ success: true, member: currentMembers[idx] });
    }

    if (action === 'remove') {
      const memberToRemove = currentMembers.find((m) => m.id === member.id);
      if (memberToRemove?.email === DEFAULT_SUPERADMIN.email) {
        return NextResponse.json(
          { success: false, error: 'Cannot remove principal Superadmin' },
          { status: 403 }
        );
      }

      currentMembers = currentMembers.filter((m) => m.id !== member.id);

      await supabase.from('admin_settings').upsert({
        key: 'team_members',
        value: currentMembers,
        updated_at: new Date().toISOString(),
      });

      await recordAuditLog({
        action: 'TEAM_MEMBER_REMOVE',
        targetEntity: 'TEAM',
        targetId: memberToRemove?.email || member.id,
      });

      return NextResponse.json({ success: true, message: 'Member removed successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error managing team' },
      { status: 500 }
    );
  }
}
