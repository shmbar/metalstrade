import { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Button, EmptyState, IconButton, Sheet, SearchField, SkeletonList } from '@/components/ui';
import { Pressable } from '@/components/ui/Pressable';
import { StackHeader } from '@/components/StackHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { loadGrades } from '@/data/firestore';
import { newId } from '@/data/writes';
import { saveGrades } from '@/features/settings/gradesStore';
import { aliasKey, assignAliases, findGradeByName, formatAssay, hasAssay, makeGrade, parseAssay } from '@shared/grades';
import { matchesAllWords } from '@shared/search';
import { spacing, layout } from '@/theme/tokens';

/*
 * Settings → Grades — web settings/tabs/grades.js. The grade registry, for editing: rename
 * a grade, set its nominal spec, pull a spelling that landed in the wrong grade out. The
 * list is shared by IMS and GIS. Every step of commit() below is web's, in web's order,
 * including taking a spelling off whichever grade held it before (assignAliases), so a
 * spelling can never sit on two grades.
 */

type Form = { id: string; name: string; spec: string; aliases: string[]; lineIds: string[] };
const blank = (): Form => ({ id: '', name: '', spec: '', aliases: [], lineIds: [] });

export default function SettingsGrades() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useAuth((s) => s.currentUser);
  const qc = useQueryClient();
  const { data: all = [], isLoading } = useQuery({ queryKey: ['grades'], queryFn: loadGrades, staleTime: 60_000 });

  const grades = useMemo(() => all.filter((g: any) => !g.deleted), [all]);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank());
  const [aliasInput, setAliasInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return grades
      .filter((g: any) => !q || matchesAllWords([g.name, g.aliases], q))
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' }));
  }, [grades, filter]);

  // Which grade each spelling belongs to today — to warn before a save moves one.
  const owners = useMemo(() => {
    const m = new Map<string, any>();
    grades.forEach((g: any) => (g.aliases || []).forEach((a: string) => m.set(aliasKey(a), g)));
    return m;
  }, [grades]);

  const select = (g: any) => {
    setForm({ id: g.id, name: g.name, spec: g.spec || '', aliases: [...(g.aliases || [])], lineIds: [...(g.lineIds || [])] });
    setError('');
    setAliasInput('');
    setOpen(true);
  };
  const startNew = () => {
    setForm(blank());
    setError('');
    setAliasInput('');
    setOpen(true);
  };
  const clearForm = () => {
    setForm(blank());
    setError('');
    setAliasInput('');
  };

  const addAlias = () => {
    const s = aliasInput.trim();
    if (!s) return;
    if (!form.aliases.some((a) => aliasKey(a) === aliasKey(s))) setForm((f) => ({ ...f, aliases: [...f.aliases, s] }));
    setAliasInput('');
  };
  const removeAlias = (a: string) => setForm((f) => ({ ...f, aliases: f.aliases.filter((x) => x !== a) }));

  const refresh = () => qc.invalidateQueries({ queryKey: ['grades'] });

  const commit = async (isNew: boolean) => {
    const name = form.name.trim();
    if (!name) {
      setError('A grade needs a name.');
      return;
    }
    const clash: any = findGradeByName(grades, name);
    if (clash && clash.id !== form.id) {
      setError(`"${clash.name}" already exists.`);
      return;
    }
    const id = isNew ? newId() : form.id;
    const orig = (!isNew && all.find((g: any) => g.id === id)) || makeGrade(id, { name });
    const next = { ...orig, name, spec: form.spec.trim(), lineIds: form.lineIds, aliases: [], deleted: false };
    const moved: any[] = assignAliases([...all.filter((g: any) => g.id !== id), next], id, form.aliases);
    const byId = new Map<string, any>(moved.map((g) => [g.id, g]));
    if (!byId.has(id)) byId.set(id, next);

    setBusy(true);
    try {
      await saveGrades([...byId.values()], currentUser?.email || '');
      const saved = byId.get(id);
      setForm({ id, name: saved.name, spec: saved.spec || '', aliases: [...(saved.aliases || [])], lineIds: [...(saved.lineIds || [])] });
      setError('');
      toast.success(isNew ? `Grade "${name}" added` : `Grade "${name}" updated`);
      refresh();
    } catch (e: any) {
      toast.error(`Not saved: ${e?.code || e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const g: any = all.find((x: any) => x.id === form.id);
    if (!g) return;
    Alert.alert('Delete grade?', 'Its spellings become unclassified again. Stock, contracts and invoices are not touched.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await saveGrades([{ ...g, deleted: true }], currentUser?.email || '');
            toast.success(`Grade "${g.name}" deleted — its spellings are unclassified again`);
            clearForm();
            setOpen(false);
            refresh();
          } catch (e: any) {
            toast.error(`Not deleted: ${e?.code || e?.message || e}`);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const parsedSpec = parseAssay(form.spec);

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader
        title="Grades"
        subtitle={`${grades.length} grade${grades.length === 1 ? '' : 's'} · shared by IMS and GIS`}
        right={<IconButton icon="add" variant="primary" accessibilityLabel="Add a new grade" onPress={startNew} />}
      />
      <SearchField value={filter} onChangeText={setFilter} placeholder="Find grade or spelling" />
      <View style={{ height: 8 }} />

      {isLoading ? (
        <SkeletonList count={5} />
      ) : list.length === 0 ? (
        <EmptyState
          title={filter ? 'Nothing matches' : 'No grades yet'}
          message={filter ? 'Try another name or spelling.' : 'Add one here, or merge rows on the Stocks page.'}
          icon={<Ionicons name="pricetags-outline" size={24} color={colors.textFaint} />}
        />
      ) : (
        <Card padded={false}>
          {list.map((g: any, i: number) => (
            <Pressable
              key={g.id}
              onPress={() => select(g)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: layout.cardInset, paddingVertical: layout.rowPad, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium" numberOfLines={1}>{g.name}</Text>
                {g.spec ? <Text variant="caption" tone="faint" numberOfLines={1}>{g.spec}</Text> : null}
              </View>
              <Text variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                {(g.aliases || []).length} spelling{(g.aliases || []).length === 1 ? '' : 's'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </Card>
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={form.id ? form.name || 'Grade' : 'New grade'}
        subtitle="Grades are shared by IMS and GIS"
        footer={
          <View style={{ gap: 10 }}>
            {form.id ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Update" loading={busy} onPress={() => commit(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Delete" variant="danger" disabled={busy} onPress={remove} />
                </View>
              </View>
            ) : (
              <Button title="Add" loading={busy} onPress={() => commit(true)} />
            )}
            <Button title="Clear" variant="ghost" onPress={clearForm} />
          </View>
        }
      >
        <View style={{ gap: spacing.md }}>
          <TextField
            label="Name"
            value={form.name}
            placeholder="e.g. 40Ni"
            onChangeText={(t) => {
              setForm((f) => ({ ...f, name: t }));
              setError('');
            }}
            error={error || undefined}
          />
          <View style={{ gap: 4 }}>
            <TextField
              label="Nominal spec"
              value={form.spec}
              placeholder="e.g. 42Ni 12Cr 3Mo 3Nb 6Co 2Ti"
              onChangeText={(t) => setForm((f) => ({ ...f, spec: t }))}
              autoCapitalize="none"
            />
            {form.spec.trim() ? (
              <Text variant="caption" tone="faint">
                {hasAssay(parsedSpec) ? `Reads as ${formatAssay(parsedSpec)}` : 'No elements recognised — kept as written'}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            <Text variant="label" tone="muted">Spellings that mean this grade</Text>
            {form.aliases.length === 0 ? (
              <Text variant="caption" tone="faint">None yet.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {form.aliases.map((a) => {
                  const owner = owners.get(aliasKey(a));
                  const movesFrom = owner && owner.id !== form.id ? owner.name : '';
                  return (
                    <View
                      key={a}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 4, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, maxWidth: '100%' }}
                    >
                      <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>{a}</Text>
                      {movesFrom ? <Text variant="caption" style={{ color: colors.warn }}>· moves from {movesFrom}</Text> : null}
                      <Pressable onPress={() => removeAlias(a)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${a}`} style={{ padding: 2 }}>
                        <Ionicons name="close" size={14} color={colors.textFaint} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={aliasInput}
                  placeholder="Add a spelling, e.g. 40Ni Refinery Turnings"
                  onChangeText={setAliasInput}
                  onSubmitEditing={addAlias}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
              </View>
              <Button title="Add" variant="secondary" disabled={!aliasInput.trim()} onPress={addAlias} />
            </View>
          </View>

          {form.lineIds.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Text variant="caption" style={{ flex: 1 }}>
                {form.lineIds.length} PO line{form.lineIds.length === 1 ? ' is' : 's are'} set to this grade individually
                <Text variant="caption" tone="faint"> — spelled like another grade, but really this one.</Text>
              </Text>
              <Button title="Clear" variant="ghost" onPress={() => setForm((f) => ({ ...f, lineIds: [] }))} />
            </View>
          )}

          <Text variant="caption" tone="faint">
            Grades are shared by IMS and GIS. Changes apply everywhere at once, including stock already received. Save with Update after editing spellings.
          </Text>
        </View>
      </Sheet>
    </Screen>
  );
}
