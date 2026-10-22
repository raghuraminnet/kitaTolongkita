import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { savedDealsApi, SavedList, SavedDeal } from '../../api/client';
import {
  ArrowLeft,
  Bookmark,
  Plus,
  Package,
  MapPin,
  Users,
  Globe,
  Lock,
  Trash2,
  Edit2,
  X,
} from 'lucide-react-native';

export const MySavesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [lists, setLists] = useState<SavedList[]>([]);
  const [selectedList, setSelectedList] = useState<SavedList | null>(null);
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom modal for list creation/rename (cross-platform Android + iOS)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('New List');
  const [listNameInput, setListNameInput] = useState('');
  const [editingList, setEditingList] = useState<SavedList | null>(null);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    setLoading(true);
    try {
      const data = await savedDealsApi.getMyLists();
      const loaded = Array.isArray(data) ? data : [];
      setLists(loaded);
      if (loaded.length > 0) {
        selectList(loaded[0]);
      } else {
        setLoading(false);
      }
    } catch {
      // Graceful fallback without intrusive modal alert
      setLists([]);
      setLoading(false);
    }
  };

  const selectList = async (list: SavedList) => {
    setSelectedList(list);
    try {
      const data = await savedDealsApi.getSavedDeals(list.id);
      setDeals(Array.isArray(data) ? data : []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingList(null);
    setModalTitle('Create New Saved List');
    setListNameInput('');
    setModalVisible(true);
  };

  const handleOpenRenameModal = (list: SavedList) => {
    setEditingList(list);
    setModalTitle('Rename List');
    setListNameInput(list.name);
    setModalVisible(true);
  };

  const handleSaveModal = async () => {
    const trimmed = listNameInput.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a list name.');
      return;
    }
    setModalVisible(false);
    try {
      if (editingList) {
        await savedDealsApi.updateList(editingList.id, { name: trimmed });
      } else {
        const newList = await savedDealsApi.createList(trimmed);
        selectList(newList);
      }
      await loadLists();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save list.');
    }
  };

  const handleDeleteList = (list: SavedList) => {
    Alert.alert(list.name, 'Choose an option', [
      { text: 'Rename', onPress: () => handleOpenRenameModal(list) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteList(list) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDeleteList = async (list: SavedList) => {
    try {
      await savedDealsApi.deleteList(list.id);
      await loadLists();
    } catch {
      Alert.alert('Error', 'Could not delete list.');
    }
  };

  const handleUnsave = async (deal: SavedDeal) => {
    try {
      await savedDealsApi.unsaveDeal(deal.dealId, deal.listId);
      setDeals((prev) => prev.filter((d) => d.id !== deal.id));
      const updatedLists = await savedDealsApi.getMyLists();
      setLists(Array.isArray(updatedLists) ? updatedLists : []);
    } catch {
      Alert.alert('Error', 'Could not remove from list.');
    }
  };

  const handleTogglePublic = async (list: SavedList) => {
    try {
      await savedDealsApi.updateList(list.id, { isPublic: !list.isPublic });
      await loadLists();
    } catch {
      Alert.alert('Error', 'Could not update list.');
    }
  };

  const renderListTab = ({ item }: { item: SavedList }) => {
    const isSelected = selectedList?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.listTab, isSelected && styles.listTabSelected]}
        onPress={() => selectList(item)}
        onLongPress={() => handleDeleteList(item)}
        activeOpacity={0.7}
      >
        <View style={{ marginRight: 6 }}>
          {item.isPublic ? (
            <Globe size={13} color={isSelected ? colors.white : colors['on-surface-variant']} strokeWidth={2} />
          ) : (
            <Lock size={13} color={isSelected ? colors.white : colors['on-surface-variant']} strokeWidth={2} />
          )}
        </View>
        <Text style={[styles.listTabText, isSelected && styles.listTabTextSelected]} numberOfLines={1}>
          {item.name}
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
    const discount =
      d.originalPrice > 0
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
            <Image source={{ uri: d.imageUrl }} style={styles.dealImage} resizeMode="cover" />
          ) : (
            <View style={styles.dealImagePlaceholder}>
              <Package size={30} color={colors['on-surface-variant']} strokeWidth={1.5} />
            </View>
          )}
          <TouchableOpacity
            style={styles.unsaveBtn}
            onPress={() => handleUnsave(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bookmark size={14} color={colors['primary-container']} fill={colors['primary-container']} />
          </TouchableOpacity>
        </View>
        <View style={styles.dealInfo}>
          <Text style={styles.dealTitle} numberOfLines={2}>
            {d.title}
          </Text>
          <View style={styles.dealPriceRow}>
            <Text style={styles.dealPrice}>RM{Number(d.groupPrice).toFixed(2)}</Text>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
          </View>
          <View style={styles.dealMeta}>
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors['on-surface-variant']} strokeWidth={2} />
              <Text style={styles.dealMetaText} numberOfLines={1}>
                Community Hub Pickup
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Users size={12} color={colors['on-surface-variant']} strokeWidth={2} />
              <Text style={styles.dealMetaText}>
                {d.membersJoined}/{d.minMembers} joined
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerRow}>
      <Text style={styles.sectionTitle}>My Saved Collections</Text>
      <TouchableOpacity
        style={styles.addListBtn}
        onPress={handleOpenCreateModal}
        activeOpacity={0.8}
      >
        <Plus size={14} color={colors.white} strokeWidth={2.5} />
        <Text style={styles.addListBtnText}>New List</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors['on-surface']} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Saves</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading saves...</Text>
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconCircle}>
            <Bookmark size={36} color={colors['primary-container']} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>No saved deals yet</Text>
          <Text style={styles.emptyText}>
            Save deals by tapping the bookmark button to organize your group orders and community buys.
          </Text>
          <TouchableOpacity
            style={styles.createFirstBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.85}
          >
            <Plus size={16} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.createFirstBtnText}>Create a Saved List</Text>
          </TouchableOpacity>
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
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={() => handleTogglePublic(selectedList)}
              >
                {selectedList.isPublic ? (
                  <Globe size={14} color={colors['primary-container']} strokeWidth={2} />
                ) : (
                  <Lock size={14} color={colors['on-surface-variant']} strokeWidth={2} />
                )}
                <Text style={styles.privacyText}>
                  {selectedList.isPublic
                    ? 'Public list • Visible to community'
                    : 'Private list • Only visible to you'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteList(selectedList)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Trash2 size={15} color={colors.error} strokeWidth={1.8} />
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
                <View style={[styles.emptyIconCircle, { width: 56, height: 56, borderRadius: 28 }]}>
                  <Package size={26} color={colors['on-surface-variant']} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyText}>No deals in this list yet.</Text>
              </View>
            }
          />
        </>
      )}

      {/* Cross-platform Modal for Create / Rename */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors['on-surface-variant']} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Weekly Groceries, Ramadan Buys"
              placeholderTextColor={colors['on-surface-variant']}
              value={listNameInput}
              onChangeText={setListNameInput}
              autoFocus
              maxLength={35}
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveModal}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { ...typography['body-lg'], color: colors['on-surface-variant'] },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors['surface-container'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography['title-md'],
    fontWeight: '700',
    color: colors['on-surface'],
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography['body-md'],
    color: colors['on-surface-variant'],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors['primary-container'],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  createFirstBtnText: {
    ...typography['label-sm'],
    fontWeight: '700',
    color: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors['outline-variant'],
  },
  headerTitle: { ...typography['title-md'], fontWeight: '700', color: colors['on-surface'] },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { ...typography['title-md'], fontWeight: '700', color: colors['on-surface'] },
  addListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors['primary-container'],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  addListBtnText: { ...typography['label-sm'], color: colors.white, fontWeight: '700' },
  listTabs: { maxHeight: 85 },
  listTabsContent: { paddingHorizontal: spacing.md, alignItems: 'center' },
  listTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors['surface-container'],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  listTabSelected: { backgroundColor: colors['primary-container'] },
  listTabText: { ...typography['label-sm'], color: colors['on-surface'] },
  listTabTextSelected: { color: colors.white, fontWeight: '700' },
  listCountBadge: {
    backgroundColor: colors['surface-container-high'],
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  listCountBadgeSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
  listCountText: { ...typography['label-sm'], color: colors['on-surface-variant'], fontSize: 11 },
  listCountTextSelected: { color: colors.white },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors['surface-container'],
  },
  privacyText: { ...typography['label-sm'], color: colors['on-surface-variant'] },
  dealsList: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  dealCard: {
    flexDirection: 'row',
    backgroundColor: colors['surface-container-lowest'],
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  dealImageWrap: { width: 100, height: 100, position: 'relative' },
  dealImage: { width: 100, height: 100 },
  dealImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: colors['surface-container'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsaveBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  dealInfo: { flex: 1, padding: spacing.sm, justifyContent: 'space-between' },
  dealTitle: { ...typography['body-md'], fontWeight: '600', color: colors['on-surface'], marginBottom: 4 },
  dealPriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dealPrice: { ...typography['title-md'], color: colors['primary-container'], fontWeight: '800' },
  discountBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  discountText: { ...typography['label-sm'], color: colors.white, fontWeight: '700' },
  dealMeta: { gap: 4, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dealMetaText: { ...typography['label-sm'], color: colors['on-surface-variant'], fontSize: 11 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography['title-md'], fontWeight: '700', color: colors['on-surface'] },
  modalInput: {
    backgroundColor: colors['surface-container'],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors['on-surface'],
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  modalCancelText: { ...typography['label-sm'], color: colors['on-surface-variant'], fontWeight: '600' },
  modalConfirmBtn: {
    backgroundColor: colors['primary-container'],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  modalConfirmText: { ...typography['label-sm'], color: colors.white, fontWeight: '700' },
});
