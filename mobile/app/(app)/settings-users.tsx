import { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Button, EmptyState, ErrorState, Sheet, SearchField, SkeletonList } from '@/components/ui';
import { Pressable } from '@/components/ui/Pressable';
import { StackHeader } from '@/components/StackHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { apiConfigured, getJson, sendJson } from '@/lib/api';
import { PAGE_GROUPS, PAGE_KEYS, assignableRoles, canManageRole, defaultPagesForRole, roleLabel, roleMeta } from '@shared/permissions';
import { matchesAllWords } from '@shared/search';
import { radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';
import { useShallow } from 'zustand/react/shallow';

/*
 * Settings → Users — web settings/tabs/users.js + _components/userData.js + pagePermissions.js.
 * The members of this workspace with their role and what they can see; add one, change a
 * name, email, phone, password, role or page list, or remove one. The rules — same
 * workspace, only a lower rank, never yourself, never the workspace owner — are enforced
 * by the server (web /api/users → actions/pass.js); the buttons here only mirror them so a
 * refusal is explained before anyone taps.
 */

interface Member {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  role: string;
  pages: string[];
  customPages: boolean;
  isOwner: boolean;
  isSelf: boolean;
  userCreated: string | null;
  lastLogedIn: string | null;
}

type Form = { uid: string; displayName: string; phoneNumber: string; email: string; password: string; password1: string; role: string; pages: string[] };
const blankForm = (): Form => ({ uid: '', displayName: '', phoneNumber: '', email: '', password: '', password1: '', role: 'user', pages: [...defaultPagesForRole('user')] });

const MUST_FILL = 'Field must be filled';

// web dateFormat(value, 'dd.mm.yy')
const ddmmyy = (v: string | null) => {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
};

/** web roleChip — Super Admin blue with a shield, Admin green, Accounting amber, User gray. */
function RoleChip({ role }: { role: string }) {
  const { colors } = useTheme();
  const tone = role === 'superadmin' ? colors.info : role === 'admin' ? colors.positive : role === 'accounting' ? colors.warn : colors.textMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: tone + '40', backgroundColor: tone + '14' }}>
      {role === 'superadmin' && <Ionicons name="shield-checkmark" size={11} color={tone} />}
      <Text variant="captionMedium" style={{ color: tone }}>{roleLabel(role)}</Text>
    </View>
  );
}

function CheckRow({ label, checked, onPress, disabled }: { label: string; checked: boolean; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => { haptics.selection(); onPress(); }}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, width: '50%', paddingRight: 6 }}
    >
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? colors.primary : colors.textFaint} />
      <Text variant="body" numberOfLines={1} style={{ flex: 1, color: checked ? colors.text : colors.textMuted }}>{label}</Text>
    </Pressable>
  );
}

/** web PagePermissions — the checklist grouped like the sidebar, with All · None · Reset. */
function PagePermissions({ role, pages, setPages }: { role: string; pages: string[]; setPages: (p: string[]) => void }) {
  const { colors } = useTheme();
  const meta = roleMeta(role);
  const locked = meta.key === 'superadmin';
  const selected = new Set(locked ? PAGE_KEYS : pages || []);
  const canonical = (next: Set<string>) => PAGE_KEYS.filter((k) => next.has(k));

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setPages(canonical(next));
  };
  const toggleGroup = (keys: string[]) => {
    const allOn = keys.every((k) => selected.has(k));
    const next = new Set(selected);
    keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
    setPages(canonical(next));
  };
  const dflt = defaultPagesForRole(role);
  const isDefault = dflt.length === selected.size && dflt.every((k) => selected.has(k));
  const link = (title: string, onPress: () => void) => (
    <Pressable onPress={() => { haptics.selection(); onPress(); }} hitSlop={6} accessibilityRole="button">
      <Text variant="captionStrong" style={{ color: colors.primary }}>{title}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" tone="muted">Can see</Text>
      {!locked && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {link('All', () => setPages([...PAGE_KEYS]))}
          <Text variant="caption" tone="faint">·</Text>
          {link('None', () => setPages([]))}
          <Text variant="caption" tone="faint">·</Text>
          {link(`Reset to ${meta.label} default`, () => setPages([...dflt]))}
        </View>
      )}
      <Text variant="caption" tone="muted">
        {locked
          ? 'A Super Admin always has access to every page — this cannot be narrowed.'
          : isDefault
            ? `Standard ${meta.label} access. Tick or untick a page to make it specific to this person.`
            : `Custom access — ${selected.size} of ${PAGE_KEYS.length} pages.`}
      </Text>
      <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, padding: 10, gap: 8, opacity: locked ? 0.6 : 1 }}>
        {PAGE_GROUPS.map((group) => {
          const keys = group.pages.map((p) => p.key);
          return (
            <View key={group.ttl}>
              <Pressable onPress={() => { haptics.selection(); toggleGroup(keys); }} disabled={locked} accessibilityRole="button" accessibilityLabel={`Toggle ${group.ttl}`} style={{ alignSelf: 'flex-start', paddingVertical: 2 }}>
                <Text variant="overline" tone="muted">{group.ttl}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {group.pages.map((p) => (
                  <CheckRow key={p.key} label={p.label} checked={selected.has(p.key)} disabled={locked} onPress={() => toggle(p.key)} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      {!locked && selected.size === 0 && (
        <Text variant="caption" style={{ color: colors.negative }}>No pages selected — this person will be able to sign in but not open anything.</Text>
      )}
    </View>
  );
}

export default function SettingsUsers() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { me, claims, canManageUsers, uidCollection } = useAuth(useShallow((s) => ({ me: s.user, claims: s.claims, canManageUsers: s.isAdmin, uidCollection: s.uidCollection })));
  const myUid = me?.uid || '';

  const usersQuery = useQuery({
    queryKey: ['users', uidCollection],
    queryFn: () => getJson<{ users: Member[] }>('/api/users').then((r) => r.users || []),
    enabled: !!uidCollection && canManageUsers && apiConfigured(),
  });
  const members = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(blankForm());
  const [setPassword, setSetPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const isNew = !form.uid;
  // Only roles the signed-in admin outranks, so the form cannot express a promotion they may not make.
  const roles = useMemo(() => assignableRoles(claims || {}, myUid), [claims, myUid]);
  const roleLocked = roles.length === 0;

  const mayTouch = (u: Member) => canManageUsers && u.uid !== myUid && !u.isOwner && canManageRole(claims || {}, u.role, myUid);
  const whyNot = (u: Member) =>
    u.uid === myUid ? 'You cannot change your own account here' : u.isOwner ? 'The workspace owner account is protected' : `You do not have permission to modify a ${roleLabel(u.role)}`;

  const list = useMemo(() => {
    const q = filter.trim();
    return members.filter((u) => !q || matchesAllWords([u.displayName, u.email, u.phoneNumber, roleLabel(u.role)], q));
  }, [members, filter]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  const save = useMutation({
    meta: { success: (_d: any, v: { isNew: boolean }) => (v.isNew ? 'User is successfully added!' : 'User is successfully updated!') },
    mutationFn: async ({ isNew: creating, payload }: { isNew: boolean; payload: Record<string, any> }) =>
      sendJson(creating ? 'POST' : 'PATCH', '/api/users', payload),
    onSuccess: () => {
      refresh();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Something went wrong.'),
  });

  const del = useMutation({
    meta: { success: 'User is successfully deleted!' },
    mutationFn: (uid: string) => sendJson('DELETE', '/api/users', { uid }),
    onSuccess: (_d, uid) => {
      qc.setQueryData<Member[]>(['users', uidCollection], (prev) => (prev || []).filter((x) => x.uid !== uid));
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || 'Something went wrong.'),
  });

  const addNew = () => {
    setForm(blankForm());
    setSetPassword(true); // web: a new user always gets a password
    setErrors({});
    setOpen(true);
  };

  const edit = (u: Member) => {
    if (!mayTouch(u)) {
      toast.error(`${whyNot(u)}.`);
      return;
    }
    setForm({ uid: u.uid, displayName: u.displayName, phoneNumber: u.phoneNumber, email: u.email, password: '', password1: '', role: u.role, pages: [...(u.pages || [])] });
    setSetPassword(false);
    setErrors({});
    setOpen(true);
  };

  const remove = (u: Member) =>
    Alert.alert('Delete Confirmation', 'The user will be deleted. Please confirm to proceed', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(u.uid) },
    ]);

  const set = (k: keyof Form) => (t: string) => {
    setForm((f) => ({ ...f, [k]: t }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: false }));
  };
  // Switching role re-baselines the page list, so a demoted Admin can't keep Margins by accident.
  const changeRole = (role: string) => setForm((f) => ({ ...f, role, pages: [...defaultPagesForRole(role)] }));

  // web userData.SaveUser — the same checks, in the same order, with the same messages.
  const submit = () => {
    const required: (keyof Form)[] = setPassword ? ['displayName', 'email', 'password', 'password1', 'role'] : ['displayName', 'email', 'role'];
    const errs: Record<string, boolean> = {};
    required.forEach((k) => (errs[k] = !String(form[k] ?? '').trim()));
    setErrors(errs);
    if (Object.values(errs).includes(true)) return toast.error('Some fields are missing!');
    if (form.displayName.length < 3) return toast.error('Name must be more than two letters!');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error('Wrong email address!');
    if (setPassword) {
      if (form.password.length < 6) return toast.error('Password must be more at least 6 letters!');
      if (form.password !== form.password1) return toast.error('The verification password doesn`t match the password!');
    }
    const payload: Record<string, any> = {
      uid: form.uid,
      email: form.email.trim(),
      displayName: form.displayName,
      phoneNumber: form.phoneNumber,
      role: form.role,
      pages: form.pages,
    };
    if (setPassword && form.password) payload.password = form.password;
    save.mutate({ isNew, payload });
  };

  const canSee = (u: Member) =>
    u.role === 'superadmin' ? 'All pages' : !u.customPages ? `${roleLabel(u.role)} default` : `${u.pages?.length || 0} of ${PAGE_KEYS.length} pages`;

  const body = !canManageUsers ? (
    <EmptyState
      title="No access"
      message="You do not have permission to manage users."
      icon={<Ionicons name="lock-closed-outline" size={40} color={colors.textFaint} />}
    />
  ) : !apiConfigured() ? (
    <EmptyState
      title="Backend not configured"
      message="Set EXPO_PUBLIC_API_BASE_URL to your deployed web app URL to manage users."
      icon={<Ionicons name="cloud-offline-outline" size={40} color={colors.textFaint} />}
    />
  ) : usersQuery.isLoading ? (
    <SkeletonList count={4} />
  ) : usersQuery.isError ? (
    <ErrorState
      message={
        /\(404\)/.test(String((usersQuery.error as any)?.message))
          ? 'The web app this phone talks to does not have user management yet — deploy the latest web version, then retry.'
          : (usersQuery.error as any)?.message || 'Could not load users.'
      }
      onRetry={() => usersQuery.refetch()}
    />
  ) : list.length === 0 ? (
    <EmptyState
      title={filter ? 'Nothing matches' : 'No users yet'}
      message={filter ? 'Try another name or email.' : 'Add the first member below.'}
      icon={<Ionicons name="people-outline" size={40} color={colors.textFaint} />}
    />
  ) : (
    <Card padded={false}>
      {list.map((u, i) => {
        const touchable = mayTouch(u);
        return (
          <Pressable
            key={u.uid}
            onPress={() => edit(u)}
            accessibilityRole="button"
            accessibilityLabel={`User ${u.displayName || u.email}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 6, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>{u.displayName || '—'}</Text>
                <RoleChip role={u.role} />
                {u.isSelf && <Text variant="caption" tone="faint">You</Text>}
              </View>
              <Text variant="caption" tone="muted" numberOfLines={1}>{u.email}{u.phoneNumber ? ` · ${u.phoneNumber}` : ''}</Text>
              <Text variant="caption" tone="faint" numberOfLines={1}>
                Can see: {canSee(u)} · Created {ddmmyy(u.userCreated)} · Last login {ddmmyy(u.lastLogedIn)}
              </Text>
            </View>
            {touchable ? (
              <Pressable
                onPress={() => remove(u)}
                hitSlop={4}
                disabled={del.isPending}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${u.displayName || u.email}`}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.negative} />
              </Pressable>
            ) : (
              <View style={{ width: 40, alignItems: 'center' }} accessibilityLabel={whyNot(u)}>
                <Text tone="faint">—</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </Card>
  );

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader
        title="Users"
        subtitle={canManageUsers && members.length ? `${members.length} member${members.length === 1 ? '' : 's'} · roles and page access` : 'Roles and page access'}
      />
      {canManageUsers && apiConfigured() && members.length > 3 && (
        <View style={{ marginBottom: 12 }}>
          <SearchField value={filter} onChangeText={setFilter} placeholder="Find name, email or role" />
        </View>
      )}
      {body}
      {canManageUsers && apiConfigured() && !usersQuery.isLoading && (
        <View style={{ marginTop: spacing.lg, alignItems: 'flex-start' }}>
          <Button title="Add New User" onPress={addNew} />
        </View>
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={isNew ? 'New User' : `User: ${form.displayName}`}
        footer={<Button title="Save" loading={save.isPending} onPress={submit} />}
      >
        <View style={{ gap: spacing.md }}>
          <TextField label="Name" value={form.displayName} placeholder="User Name" onChangeText={set('displayName')} error={errors.displayName ? MUST_FILL : undefined} />
          <TextField label="Phone Number" value={form.phoneNumber} placeholder="Phone Number" onChangeText={set('phoneNumber')} keyboardType="phone-pad" />
          <TextField
            label="Email"
            value={form.email}
            placeholder="Email Address"
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email ? MUST_FILL : undefined}
          />
          <Pressable
            onPress={() => {
              haptics.selection();
              setSetPassword((v) => !v);
              setErrors((e) => ({ ...e, password: false, password1: false }));
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: setPassword }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 2 }}
          >
            <Ionicons name={setPassword ? 'checkbox' : 'square-outline'} size={20} color={setPassword ? colors.primary : colors.textFaint} />
            <Text variant="body">{isNew ? 'Set password' : 'Change password'}</Text>
          </Pressable>
          <TextField
            label="Password"
            value={form.password}
            placeholder="Password"
            onChangeText={set('password')}
            secureTextEntry
            autoCapitalize="none"
            editable={setPassword}
            style={{ opacity: setPassword ? 1 : 0.5 }}
            error={errors.password ? MUST_FILL : undefined}
          />
          <TextField
            label="Password Verification"
            value={form.password1}
            placeholder="Repeat Password"
            onChangeText={set('password1')}
            secureTextEntry
            autoCapitalize="none"
            editable={setPassword}
            style={{ opacity: setPassword ? 1 : 0.5 }}
            error={errors.password1 ? MUST_FILL : undefined}
          />

          {/* web RolePicker — cards, not a dropdown: the point is comparing what each level means. */}
          <View style={{ gap: 6 }}>
            <Text variant="label" tone="muted">Role</Text>
            {roles.map((r) => {
              const selected = r.key === form.role;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => { if (!selected) haptics.selection(); changeRole(r.key); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={{ borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '14' : colors.card }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {r.key === 'superadmin' && <Ionicons name="shield-checkmark" size={14} color={selected ? colors.primary : colors.text} />}
                    <Text variant={selected ? 'bodyStrong' : 'bodyMedium'} style={{ color: selected ? colors.primary : colors.text }}>{r.label}</Text>
                  </View>
                  <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{r.blurb}</Text>
                </Pressable>
              );
            })}
            {errors.role && <Text variant="caption" style={{ color: colors.negative }}>{MUST_FILL}</Text>}
            {roleLocked && <Text variant="caption" tone="muted">You do not have permission to change this member&apos;s role.</Text>}
          </View>

          <PagePermissions role={form.role} pages={form.pages} setPages={(pages) => setForm((f) => ({ ...f, pages }))} />
        </View>
      </Sheet>
    </Screen>
  );
}
