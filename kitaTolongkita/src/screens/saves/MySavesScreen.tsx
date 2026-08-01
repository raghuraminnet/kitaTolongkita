import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { savedDealsApi, SavedList, SavedDeal } from '../../api/client';

export const MySavesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [lists, setLists] = useState<SavedList[]>([]);
  const [selectedList, setSelectedList] = useState<SavedList | null>(null);
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLists(); }, []);

  const loadLists = async () => {
    setLoading(true);
    try {
      const data = await savedDealsApi.getMyLists();
      setLists(data);
      if (data.length > 0) selectList(data[0]);
      else setLoading(false);
    } catch {
      Alert.alert('Error', 'Could not load saved lists.');
      setLoading(false);
    }
  };

  const selectList = async (list: SavedList) => {
    setSelectedList(list);
    try {
      const data = await savedDealsApi.getSavedDeals(list.id);
      setDeals(data);
    } catch {
      setDeals([]);
    }
  };

  const handleCreateList = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'New List', 'Favorites'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) promptCreateList();
          else if (buttonIndex === 2) promptCreateAndAdd('Favorites');
        }
      );
    } else {
      Alert.alert('Create List', 'Enter list name', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'New List', onPress: promptCreateList },
        { text: 'Favorites', onPress: () => promptCreateAndAdd('Favorites') },
      ]);
    }
  };

  const promptCreateList = () => {
    Alert.prompt(
      'New List',
      'Enter a name for your list (max 30 chars)',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: async (name) => {
          if (!name?.trim()) return;
          try {
            const newList = await savedDealsApi.createList(name.trim());
            await loadLists();
            selectList(newList);
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not create list.');
          }
        }},
      ],
      'plain-text'
    );
  };

  const promptCreateAndAdd = async (listName: string) => {
    try {
      const newList = await savedDealsApi.createList(listName);
      await loadLists();
      selectList(newList);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not create list.');
    }
  };

  const handleDeleteList = (list: SavedList) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete List', 'Rename List'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) confirmDeleteList(list);
          else if (buttonIndex === 2) promptRenameList(list);
        }
      );
    } else {
      Alert.alert('List Options', list.name, [
        { text: 'Rename', onPress: () => promptRenameList(list) },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteList(list) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const confirmDeleteList = async (list: SavedList) => {
    try {
      await savedDealsApi.deleteList(list.id);
      await loadLists();
    } catch { Alert.alert('Error', 'Could not delete list.'); }
  };

  const promptRenameList = (list: SavedList) => {
    Alert.prompt(
      'Rename List',
      'Enter new name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name) => {
            if (!name?.trim()) return;
            try {
              await savedDealsApi.updateList(list.id, { name: name.trim() });
              await loadLists();
            } catch { Alert.alert('Error', 'Could not rename list.'); }
          },
        },
      ],
      'plain-text',
      list.name
    );
  };

  const handleUnsave = async (deal: SavedDeal) => {
    try {
      await savedDealsApi.unsaveDeal(deal.dealId, deal.listId);
      setDeals((prev) => prev.filter((d) => d.id !== deal.id));
      // Refresh lists to update counts
      const updatedLists = await savedDealsApi.getMyLists();
      setLists(updatedLists);
    } catch { Alert.alert('Error', 'Could not remove from list.'); }
  };

  const handleTogglePublic = async (list: SavedList) => {
    try {
      await savedDealsApi.updateList(list.id, { isPublic: !list.isPublic });
      await loadLists();
    } catch { Alert.alert('Error', 'Could not update list.'); }
  };

  const renderListTab = ({ item }: { item: SavedList }) => {
    const isSelected = selectedList?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.listTab, isSelected && styles.listTabSelected]}
        onPress={() => selectList(item)}
        onLongPress={() => handleDeleteList(item)}
      >
        <Text style={[styles.listTabText, isSelected && styles.listTabTextSelected]} numberOfLines={1}>
          {item.isPublic ? '🌐 ' : '🔒 '}{item.name}
        </Text>
        <View style={[styles.listCountBadge, isSelected && styles.listCountBadgeSelected]}>
          <Text style={[styles.listCountText, isSelected && styles.listCountTextSelected]}>
            {item.dealCount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSavedDeal = ({ item }: { item: SavedDeal }) => {
    const d = item.deal;
    const discount = d.originalPrice > 0
      ? Math.round((1 - Number(d.groupPrice) / Number(d.originalPrice)) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.dealCard}
        onPress={() => navigation.navigate('DealDetail', { dealId: d.id })}
        activeOpacity={0.8}
      >
        <View style={styles.dealImageWrap}>
          {d.imageUrl ? (
            <View style={styles.dealImagePlaceholder}>
              <Text style={styles.dealImageEmoji}>🛒</Text>
            </View>
          ) : (
            <View style={styles.dealImagePlaceholder}>
              <Text style={styles.dealImageEmoji}>🛒</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.unsaveBtn}
            onPress={() => handleUnsave(item)}
          >
            <Text style={{ fontSize: 14 }}>📌</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dealInfo}>
          <Text style={styles.dealTitle} numberOfLines={2}>{d.title}</Text>
          <View style={styles.dealPriceRow}>
            <Text style={styles.dealPrice}>RM{Number(d.groupPrice).toFixed(2)}</Text>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
          </View>
          <View style={styles.dealMeta}>
            <Text style={styles.dealMetaText}>📍 {d.pickupLocation.split(',')[0]}</Text>
            <Text style={styles.dealMetaText}>
              👥 {d.membersJoined}/{d.minMembers} joined
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerRow}>
      <Text style={styles.sectionTitle}>My Saves</Text>
      <TouchableOpacity style={styles.addListBtn} onPress={handleCreateList}>
        <Text style={styles.addListBtnText}>+ New List</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Saves</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><Text style={styles.loadingText}>Loading...</Text></View>
      ) : lists.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🔖</Text>
          <Text style={styles.emptyTitle}>No saved deals yet</Text>
          <Text style={styles.emptyText}>
            Tap the 📌 button on any deal to save it here for later.
          </Text>
        </View>
      ) : (
        <>
          {/* List Tabs */}
          <FlatList
            horizontal
            data={lists}
            renderItem={renderListTab}
            keyExtractor={(item) => item.id}
            style={styles.listTabs}
            contentContainerStyle={styles.listTabsContent}
            showsHorizontalScrollIndicator={false}
            ListHeaderComponent={ListHeader}
          />

          {/* Privacy toggle */}
          {selectedList && (
            <View style={styles.privacyRow}>
              <TouchableOpacity onPress={() => handleTogglePublic(selectedList)}>
                <Text style={styles.privacyText}>
                  {selectedList.isPublic ? '🌐 Public — tap to make private' : '🔒 Private — tap to make public'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteList(selectedList)}>
                <Text style={styles.deleteText}>Delete list</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Deals */}
          <FlatList
            data={deals}
            renderItem={renderSavedDeal}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.dealsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No deals in this list yet.</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { ...typography['body-lg'], color: colors['on-surface-variant'] },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { ...typography['title-lg'], fontWeight: '700', color: colors['on-surface'], marginBottom: spacing.sm },
  emptyText: { ...typography['body-md'], color: colors['on-surface-variant'], textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: { fontSize: 28, color: colors['on-surface'] },
  headerTitle: { ...typography['title-lg'], fontWeight: '700', color: colors['on-surface'] },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  sectionTitle: { ...typography['title-md'], fontWeight: '700', color: colors['on-surface'] },
  addListBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  addListBtnText: { ...typography['label-sm'], color: colors.white, fontWeight: '700' },
  listTabs: { maxHeight: 90 },
  listTabsContent: { paddingHorizontal: spacing.md },
  listTab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors['surface-container'],
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, marginRight: spacing.sm,
  },
  listTabSelected: { backgroundColor: colors.primary },
  listTabText: { ...typography['label-sm'], color: colors['on-surface'] },
  listTabTextSelected: { color: colors.white, fontWeight: '700' },
  listCountBadge: {
    backgroundColor: colors['surface-container-high'],
    borderRadius: borderRadius.full, paddingHorizontal: 6, paddingVertical: 1,
  },
  listCountBadgeSelected: { backgroundColor: 'rgba(255,255,255,0.3)' },
  listCountText: { ...typography['label-xs'], color: colors['on-surface-variant'] },
  listCountTextSelected: { color: colors.white },
  privacyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors['surface-container'],
  },
  privacyText: { ...typography['label-sm'], color: colors['on-surface-variant'] },
  deleteText: { ...typography['label-sm'], color: colors.error },
  dealsList: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  dealCard: {
    flexDirection: 'row', backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden',
    minHeight: 100,
  },
  dealImageWrap: { width: 100, height: 100, position: 'relative' },
  dealImagePlaceholder: {
    width: 100, height: 100, backgroundColor: colors['surface-container'],
    alignItems: 'center', justifyContent: 'center',
  },
  dealImageEmoji: { fontSize: 32 },
  unsaveBtn: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  dealInfo: { flex: 1, padding: spacing.sm, justifyContent: 'space-between' },
  dealTitle: { ...typography['body-md'], fontWeight: '600', color: colors['on-surface'], marginBottom: 4 },
  dealPriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dealPrice: { ...typography['title-md'], color: colors.primary, fontWeight: '800' },
  discountBadge: {
    backgroundColor: colors.secondary, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  discountText: { ...typography['label-xs'], color: colors.white, fontWeight: '700' },
  dealMeta: { gap: 2 },
  dealMetaText: { ...typography['label-xs'], color: colors['on-surface-variant'] },
});
