import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActionSheetIOS,
  Share,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Button, ProgressBar, Avatar } from '../../components';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { dealsApi, savedDealsApi, commentsApi, repostsApi, request } from '../../api/client';
import { useLocation } from '../../contexts/LocationContext';
import type { Deal } from '../../api/client';

const API_BASE = 'http://76.13.219.191:5000/api';

const MOCK_DEAL: Deal = {
  id: '1',
  title: 'Aneka Kuih Muih — Premium Ramadan Set A',
  description:
    'Premium quality kuih muih assortment perfect for Ramadan gatherings. Contains 12 varieties of traditional Malaysian kuih including kuih lapis, kuih kochi, onde-onde, and more. Freshly made daily.',
  category: 'Food',
  originalPrice: 38,
  groupPrice: 25,
  minMembers: 50,
  maxMembers: 100,
  membersJoined: 42,
  deadline: new Date(Date.now() + 216000000).toISOString(),
  pickupLocation: 'Pasar Malam Taman Melawati, Jln Hulu Kelang, 53100 Kuala Lumpur',
  imageUrls: [],
  status: 'Active',
  organizerName: 'Nur Aisyah Boutique',
  createdAt: new Date().toISOString(),
};

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

interface ReactionCounts {
  upvotes: number;
  likes: number;
}

export const DealDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { latitude: userLat, longitude: userLon } = useLocation();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvotes, setUpvotes] = useState(0);
  const [likes, setLikes] = useState(0);
  const [userUpvoted, setUserUpvoted] = useState(false);
  const [userLiked, setUserLiked] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savedListIds, setSavedListIds] = useState<string[]>([]);
  const [myLists, setMyLists] = useState<{ id: string; name: string }[]>([]);

  // ── Comments ────────────────────────────────────────────────────────────
  const [comments, setComments] = useState<any[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // ── Repost ────────────────────────────────────────────────────────────────
  const [hasReposted, setHasReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);

  const dealId = route.params?.dealId;
  const dealParam = route.params?.deal;

  // ── Helpers (all defined before useEffect) ───────────────────────────────

  const loadDeal = async () => {
    try {
      if (dealId) {
        const data = await dealsApi.getById(dealId);
        setDeal(data);
        if (data.hashtags) setHashtags(data.hashtags);
      } else {
        setDeal(dealParam ?? MOCK_DEAL);
        if ((dealParam ?? MOCK_DEAL).hashtags) {
          setHashtags((dealParam ?? MOCK_DEAL).hashtags as any);
        }
      }
    } catch {
      setDeal(dealParam ?? MOCK_DEAL);
    } finally {
      setLoading(false);
    }
  };

  const loadReactions = async () => {
    if (!dealId) return;
    try {
      const res = await fetch(`${API_BASE}/deals/${dealId}/reactions`);
      if (res.ok) {
        const data = await res.json();
        setUpvotes(data.upvotes ?? data.upvoteCount ?? 0);
        setLikes(data.likes ?? data.likeCount ?? 0);
      }
    } catch { /* ignore */ }
  };

  const loadSavedState = async () => {
    if (!dealId) return;
    try {
      const [lists, savedListIdsResult] = await Promise.all([
        savedDealsApi.getMyLists(),
        savedDealsApi.checkSaved(dealId),
      ]);
      setMyLists(lists);
      setSavedListIds(savedListIdsResult);
      setIsSaved(savedListIdsResult.length > 0);
    } catch { /* ignore */ }
  };

  // ── Comments ─────────────────────────────────────────────────────────────
  const loadComments = async () => {
    if (!dealId) return;
    setCommentsLoading(true);
    try {
      const res: any = await commentsApi.getComments(dealId, 1, 20);
      setComments(res?.comments ?? []);
      setCommentsTotal(res?.total ?? 0);
    } catch { /* ignore */ }
    finally { setCommentsLoading(false); }
  };

  const handlePostComment = async () => {
    if (!dealId || !newComment.trim()) return;
    setPostingComment(true);
    try {
      const res: any = await commentsApi.addComment(dealId, newComment.trim());
      if (res?.comment) {
        setComments(prev => [res.comment, ...prev]);
        setCommentsTotal(n => n + 1);
        setNewComment('');
      }
    } catch { Alert.alert('Error', 'Could not post comment'); }
    finally { setPostingComment(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!commentId) return;
    try {
      await commentsApi.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentsTotal(n => n - 1);
    } catch { Alert.alert('Error', 'Could not delete comment'); }
  };

  // ── Repost ────────────────────────────────────────────────────────────────
  const loadRepostStatus = async () => {
    if (!dealId) return;
    try {
      const res: any = await repostsApi.getRepostStatus(dealId);
      setHasReposted(res?.hasReposted ?? false);
      setRepostCount(res?.repostCount ?? 0);
    } catch { /* ignore */ }
  };

  const handleRepost = async () => {
    if (!dealId) return;
    try {
      if (hasReposted) {
        await repostsApi.unrepost(dealId);
        setHasReposted(false);
        setRepostCount(n => n - 1);
      } else {
        await repostsApi.repost(dealId);
        setHasReposted(true);
        setRepostCount(n => n + 1);
      }
    } catch { Alert.alert('Error', 'Could not repost'); }
  };

  const handleUpvote = async () => {
    if (!dealId) return;
    setUpvotes((n) => n + (userUpvoted ? -1 : 1));
    setUserUpvoted((v) => !v);
    try {
      await request('POST', `/deals/${dealId}/upvote`, undefined, true);
      loadReactions();
    } catch { /* ignore */ }
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    loadDeal();
    loadReactions();
    loadSavedState();
    if (dealId) {
      loadComments();
      loadRepostStatus();
    }
  }, []);

  const handleLike = async () => {
    if (!dealId) return;
    // Optimistic update
    setLikes((n) => n + (userLiked ? -1 : 1));
    setUserLiked((v) => !v);
    try {
      await request('POST', `/deals/${dealId}/like`, undefined, true);
      loadReactions();
    } catch {
      // Rollback
      setLikes((n) => n + (userLiked ? 1 : -1));
      setUserLiked((v) => !v);
      Alert.alert('Error', 'Could not register like. Please try again.');
    }
  };

  const handleVerify = async (answer: 'yes' | 'no' | 'not_sure') => {
    if (!dealId) return;
    setShowVerifyPrompt(false);
    try {
      const offerStillAvailable = answer === 'yes';
      await request('POST', `/deals/${dealId}/verify`, { offerStillAvailable }, true);
      Alert.alert('Thanks!', 'Your response helps the community.');
    } catch {
      Alert.alert('Error', 'Could not submit verification. Please try again.');
    }
  };

  const handleShare = async () => {
    const deal = displayDeal;
    const shareUrl = `kitatolong://deal/${dealId ?? deal.id}`;
    const message = `Check out this deal: ${deal.title} for RM${deal.groupPrice}!\n${shareUrl}`;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share Deal', 'Save to List', 'Report this Deal'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await Share.share({ message });
          } else if (buttonIndex === 2) {
            handleSave();
          } else if (buttonIndex === 3) {
            navigation.navigate('ReportForm', {
              type: 'Deal',
              targetId: dealId!,
              targetTitle: deal.title,
            });
          }
        }
      );
    } else {
      Alert.alert('Deal Options', `\"${deal.title}\"`, [
        { text: 'Share Deal', onPress: async () => { try { await Share.share({ message }); } catch {} } },
        { text: 'Save to List', onPress: handleSave },
        { text: 'Report this Deal', style: 'destructive', onPress: () => {
          navigation.navigate('ReportForm', { type: 'Deal', targetId: dealId!, targetTitle: deal.title });
        }},
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleSave = () => {
    if (myLists.length === 0) {
      // No lists yet — offer to create one
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ['Cancel', 'Create New List'], cancelButtonIndex: 0 },
          async (buttonIndex) => {
            if (buttonIndex === 1) handleCreateListAndSave();
          }
        );
      } else {
        Alert.alert('Save Deal', 'You have no lists yet. Create one first?', [
          { text: 'Create List', onPress: handleCreateListAndSave },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
      return;
    }

    const options = ['Cancel', ...myLists.map((l) => (savedListIds.includes(l.id) ? `✓ ${l.name}` : l.name)), 'Create New List'];
    const destructiveIndex = savedListIds.length > 0 ? options.length : undefined;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0, destructiveButtonIndex: destructiveIndex },
        async (buttonIndex) => {
          if (buttonIndex === 0) return;
          const selected = options[buttonIndex];
          if (selected === 'Create New List') { handleCreateListAndSave(); return; }
          const list = myLists.find((l) => `✓ ${l.name}` === selected || l.name === selected);
          if (!list) return;
          if (savedListIds.includes(list.id)) {
            // Unsave
            try {
              await savedDealsApi.unsaveDeal(dealId!, list.id);
              setSavedListIds((prev) => prev.filter((id) => id !== list.id));
              setIsSaved(savedListIds.filter((id) => id !== list.id).length > 0);
            } catch { Alert.alert('Error', 'Could not remove from list.'); }
          } else {
            // Save
            try {
              await savedDealsApi.saveDeal(dealId!, list.id);
              setSavedListIds((prev) => [...prev, list.id]);
              setIsSaved(true);
            } catch { Alert.alert('Error', 'Could not save deal.'); }
          }
        }
      );
    } else {
      Alert.alert('Save to List', 'Choose a list', [
        ...myLists.map((l) => ({
          text: savedListIds.includes(l.id) ? `✓ ${l.name}` : l.name,
          onPress: async () => {
            if (savedListIds.includes(l.id)) {
              try {
                await savedDealsApi.unsaveDeal(dealId!, l.id);
                setSavedListIds((prev) => prev.filter((id) => id !== l.id));
                setIsSaved(savedListIds.filter((id) => id !== l.id).length > 0);
              } catch { Alert.alert('Error', 'Could not remove from list.'); }
            } else {
              try {
                await savedDealsApi.saveDeal(dealId!, l.id);
                setSavedListIds((prev) => [...prev, l.id]);
                setIsSaved(true);
              } catch { Alert.alert('Error', 'Could not save deal.'); }
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleCreateListAndSave = () => {
    const isAlreadySaved = savedListIds.length > 0;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Save to Favorites'], cancelButtonIndex: 0 },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            try {
              await savedDealsApi.saveDeal(dealId!, undefined, 'Favorites');
              await loadSavedState();
            } catch { Alert.alert('Error', 'Could not save deal.'); }
          }
        }
      );
    } else {
      Alert.alert('Create List', 'Enter a name for your new list', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create "Favorites"',
          onPress: async () => {
            try {
              await savedDealsApi.saveDeal(dealId!, undefined, 'Favorites');
              await loadSavedState();
            } catch { Alert.alert('Error', 'Could not save deal.'); }
          },
        },
      ]);
    }
  };

  const handleOpenDirections = () => {
    if (!dealLat || !dealLon) {
      Alert.alert('No Coordinates', 'This deal does not have location coordinates yet.');
      return;
    }
    const label = encodeURIComponent(displayDeal.title);
    const coords = `${dealLat},${dealLon}`;

    if (Platform.OS === 'ios') {
      Linking.openURL(`http://maps.apple.com/?daddr=${coords}&q=${label}`);
    } else {
      // Android — offer choice between Google Maps and default
      Linking.openURL(`geo:${dealLat},${dealLon}?q=${coords}(${label})`);
    }
  };

  const handleOpenGoogleMaps = () => {
    if (!dealLat || !dealLon) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dealLat},${dealLon}`;
    Linking.openURL(url);
  };

  const handleOpenWaze = () => {
    if (!dealLat || !dealLon) return;
    const url = `https://waze.com/ul?ll=${dealLat},${dealLon}&navigate=yes`;
    Linking.openURL(url);
  };

  const handleShowMapOptions = () => {
    if (!dealLat || !dealLon) {
      Alert.alert('No Coordinates', 'This deal does not have location coordinates yet.');
      return;
    }
    Alert.alert(
      'Open in Maps',
      'Choose an app to navigate to this pickup location',
      [
        { text: 'Apple Maps', onPress: handleOpenDirections },
        { text: 'Google Maps', onPress: handleOpenGoogleMaps },
        { text: 'Waze', onPress: handleOpenWaze },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const displayDeal = deal ?? MOCK_DEAL;
  const discount = Math.round((1 - displayDeal.groupPrice / displayDeal.originalPrice) * 100);
  const countdown = getCountdown(displayDeal.deadline);
  const spotsLeft = displayDeal.maxMembers - displayDeal.membersJoined;

  const dealLat = (displayDeal as any).latitude ?? null;
  const dealLon = (displayDeal as any).longitude ?? null;
  const distanceFromUser =
    userLat != null && userLon != null && dealLat != null && dealLon != null
      ? calcDistance(userLat, userLon, dealLat, dealLon)
      : null;
  const isNearby = distanceFromUser != null && distanceFromUser <= 0.5;

  // Show verify prompt if close enough
  useEffect(() => {
    if (isNearby && !showVerifyPrompt) {
      setShowVerifyPrompt(true);
    }
  }, [isNearby]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {displayDeal.imageUrls?.[0] ? (
            <Image source={{ uri: displayDeal.imageUrls[0] }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>🛒</Text>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { top: insets.top + 8, right: spacing.md + 48 }]}
            onPress={handleSave}
          >
            <Text style={{ fontSize: 18 }}>{isSaved ? '📌' : '🔖'}</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={[styles.shareBtn, { top: insets.top + 8 }]} onPress={handleShare}>
            <Text style={{ fontSize: 18 }}>📤</Text>
          </TouchableOpacity>
        </View>

        {/* Verify Prompt Banner */}
        {showVerifyPrompt && (
          <View style={styles.verifyBanner}>
            <Text style={styles.verifyText}>
              📍 You're near this deal — is it still available?
            </Text>
            <View style={styles.verifyBtns}>
              <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerify('yes')}>
                <Text style={styles.verifyBtnText}>{t('common.yes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.verifyBtn, styles.verifyBtnNo]} onPress={() => handleVerify('no')}>
                <Text style={[styles.verifyBtnText, { color: colors.error }]}>{t('common.no')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerify('not_sure')}>
                <Text style={styles.verifyBtnText}>{t('common.notSure')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Price & Title */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>RM {displayDeal.groupPrice.toFixed(2)}</Text>
            <Text style={styles.originalPrice}>RM {displayDeal.originalPrice.toFixed(2)}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          </View>

          <Text style={styles.title}>{displayDeal.title}</Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownIcon}>⏰</Text>
            <Text style={styles.countdownLabel}>Ends in: </Text>
            <Text style={styles.countdownValue}>{countdown}</Text>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Group Buy Progress</Text>
              <Text style={styles.progressValue}>
                {displayDeal.membersJoined} / {displayDeal.maxMembers} joined
              </Text>
            </View>
            <ProgressBar
              current={displayDeal.membersJoined}
              total={displayDeal.maxMembers}
              height={10}
              showText={false}
            />
            <Text style={styles.progressSubtext}>
              {spotsLeft > 0 ? `${spotsLeft} more needed to unlock deal` : 'Deal unlocked! 🥳'}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Seller Info */}
          <View style={styles.sellerSection}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <TouchableOpacity
              style={styles.sellerCard}
              onPress={() => {
                if (displayDeal.organizerId) {
                  navigation.navigate('PublicProfile', {
                    userId: displayDeal.organizerId,
                    userName: displayDeal.organizerName,
                  });
                }
              }}
              activeOpacity={0.8}
            >
              <Avatar name={displayDeal.organizerName} uri={displayDeal.organizerAvatar} size={48} verified />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{displayDeal.organizerName}</Text>
                <Text style={styles.sellerMeta}>📍 {displayDeal.pickupLocation?.split(',')[0] ?? 'Kuala Lumpur'}</Text>
              </View>
              <TouchableOpacity style={styles.messageBtn} onPress={() => navigation.navigate('ChatInbox')}>
                <Text style={{ fontSize: 18 }}>💬</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.hashtagsWrap}>
                  {hashtags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.hashtagChip}
                      onPress={() => navigation.navigate('Search', { hashtag: tag })}
                    >
                      <Text style={styles.hashtagChipText}>#{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Description */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{displayDeal.description}</Text>
          </View>

          {/* Pickup Location */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Location</Text>
            <View style={styles.locationCard}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{displayDeal.pickupLocation.split(',')[0]}</Text>
                <Text style={styles.locationAddress}>{displayDeal.pickupLocation}</Text>
                {distanceFromUser != null && (
                  <Text style={styles.locationDistance}>
                    {distanceFromUser < 1
                      ? `${(distanceFromUser * 1000).toFixed(0)}m from you`
                      : `${distanceFromUser.toFixed(1)} km from you`}
                  </Text>
                )}
              </View>
              {dealLat && dealLon && (
                <TouchableOpacity style={styles.directionsBtn} onPress={handleShowMapOptions}>
                  <Text style={styles.directionsBtnText}>🧭</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Comments */}
          <View style={styles.divider} />
          <View style={styles.section}>
            <View style={styles.commentsHeader}>
              <Text style={styles.sectionTitle}>💬 Comments ({commentsTotal})</Text>
              {/* Repost button */}
              <TouchableOpacity
                style={[styles.repostBtn, hasReposted && styles.repostBtnActive]}
                onPress={handleRepost}
              >
                <Text style={[styles.repostBtnText, hasReposted && styles.repostBtnTextActive]}>
                  🔁 {repostCount > 0 ? repostCount : ''} Repost
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comment input */}
            <View style={styles.commentInputRow}>
              <View style={styles.commentInputWrap}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={colors['on-surface-variant']}
                  value={newComment}
                  onChangeText={setNewComment}
                  maxLength={500}
                  multiline
                />
                <Text style={styles.charCount}>{newComment.length}/500</Text>
              </View>
              <TouchableOpacity
                style={[styles.commentSendBtn, (!newComment.trim() || postingComment) && styles.commentSendBtnDisabled]}
                onPress={handlePostComment}
                disabled={!newComment.trim() || postingComment}
              >
                {postingComment
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.commentSendBtnText}>➤</Text>}
              </TouchableOpacity>
            </View>

            {/* Comments list */}
            {commentsLoading ? (
              <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} />
            ) : comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
            ) : (
              comments.map(comment => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.userFullName?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.userFullName}</Text>
                      <Text style={styles.commentTime}>
                        {new Date(comment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={styles.commentContent}>{comment.content}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Upvote + Like */}
        <View style={styles.reactionRow}>
          <TouchableOpacity
            style={[styles.reactionBtn, userUpvoted && styles.reactionBtnActive]}
            onPress={handleUpvote}
          >
            <Text style={styles.reactionIcon}>👍</Text>
            <Text style={[styles.reactionLabel, userUpvoted && styles.reactionLabelActive]}>
              {t('deals.upvote')} ({upvotes})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reactionBtn, userLiked && styles.reactionBtnActive]}
            onPress={handleLike}
          >
            <Text style={styles.reactionIcon}>❤️</Text>
            <Text style={[styles.reactionLabel, userLiked && styles.reactionLabelActive]}>
              {t('deals.like')} ({likes})
            </Text>
          </TouchableOpacity>
        </View>
        {/* CTA */}
        <View style={styles.ctaRow}>
          <View style={styles.ctaLeft}>
            <Text style={styles.ctaPrice}>RM {displayDeal.groupPrice.toFixed(2)}</Text>
            <Text style={styles.ctaLabel}>per pack</Text>
          </View>
          <Button
            title={t('deals.joinDeal')}
            onPress={() => navigation.navigate('Checkout', { deal: displayDeal })}
            variant="primary"
            style={styles.ctaButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography['body-lg'], color: colors['on-surface-variant'] },
  scrollContent: { paddingBottom: 160 },
  imageContainer: { height: 300, backgroundColor: colors['surface-container'], position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors['surface-container-high'],
  },
  placeholderEmoji: { fontSize: 64 },
  backBtn: {
    position: 'absolute', left: spacing.md, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 20, fontWeight: '600', color: colors['on-surface'] },
  saveBtn: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    position: 'absolute', right: spacing.md, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  // Verify prompt
  verifyBanner: {
    backgroundColor: colors['secondary-container'],
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  verifyText: { ...typography['body-md'], color: colors['on-secondary-container'], marginBottom: spacing.sm },
  verifyBtns: { flexDirection: 'row', gap: spacing.sm },
  verifyBtn: {
    flex: 1, paddingVertical: spacing.xs, borderRadius: borderRadius.md,
    backgroundColor: colors['primary-container'], alignItems: 'center',
  },
  verifyBtnNo: { backgroundColor: colors['surface-container'] },
  verifyBtnText: { ...typography['label-sm'], color: colors.white, fontWeight: '700' },
  // Content
  content: { padding: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  price: { fontFamily: 'NunitoSans_800ExtraBold', fontSize: 32, fontWeight: '800', color: colors['primary-container'] },
  originalPrice: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 20, fontWeight: '700',
    color: colors['on-surface-variant'], textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.error, paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.sm, marginLeft: spacing.xs,
  },
  discountText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '700', color: colors.white },
  title: {
    fontFamily: 'NunitoSans_700Bold', fontSize: 22, fontWeight: '700',
    color: colors['on-background'], marginBottom: spacing.md, lineHeight: 30,
  },
  countdownContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors['secondary-container'], paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
  },
  countdownIcon: { fontSize: 16, marginRight: spacing.xs },
  countdownLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-secondary-container'] },
  countdownValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '700', color: colors['on-secondary-container'] },
  progressSection: { marginBottom: spacing.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface'], fontWeight: '600' },
  progressValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '700', color: colors.secondary },
  progressSubtext: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'], marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors['outline-variant'], marginVertical: spacing.lg },
  sellerSection: { marginBottom: 0 },
  sectionTitle: { fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700', color: colors['on-background'], marginBottom: spacing.md },
  sellerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors['surface-container-lowest'], padding: spacing.md, borderRadius: borderRadius.lg,
    ...shadows.card,
  },
  sellerInfo: { flex: 1, marginLeft: spacing.md },
  sellerName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', color: colors['on-surface'], marginBottom: 2 },
  sellerMeta: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors['on-surface-variant'] },
  messageBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors['surface-container'], alignItems: 'center', justifyContent: 'center',
  },
  section: { marginBottom: 0 },
  // Hashtags
  hashtagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  hashtagChip: {
    backgroundColor: colors['primary-container'], paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  hashtagChipText: { ...typography['label-sm'], color: colors.white },
  description: { fontFamily: 'Inter_400Regular', fontSize: 16, color: colors['on-surface'], lineHeight: 26 },
  // Location
  locationCard: {
    flexDirection: 'row', backgroundColor: colors['surface-container-lowest'], padding: spacing.md,
    borderRadius: borderRadius.lg, ...shadows.card,
  },
  locationIcon: { fontSize: 24, marginRight: spacing.md },
  locationInfo: { flex: 1 },
  locationName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '600', color: colors['on-surface'], marginBottom: 2 },
  locationAddress: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors['on-surface-variant'], lineHeight: 20 },
  locationDistance: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors['primary-container'], marginTop: 4 },
  directionsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors['primary-container'], alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  directionsBtnText: { fontSize: 18 },
  // Bottom CTA
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors['surface-container-lowest'], ...shadows.modal,
    paddingTop: spacing.md, paddingHorizontal: spacing.md,
  },
  reactionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  reactionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    backgroundColor: colors['surface-container'], gap: spacing.xs,
    borderWidth: 1, borderColor: colors['outline-variant'],
  },
  reactionBtnActive: { backgroundColor: colors['primary-container'], borderColor: colors['primary-container'] },
  reactionIcon: { fontSize: 16 },
  reactionLabel: { ...typography['label-sm'], color: colors['on-surface'] },
  reactionLabelActive: { color: colors.white, fontWeight: '700' },
  ctaRow: { flexDirection: 'row', alignItems: 'center' },
  ctaLeft: { marginRight: spacing.lg },
  ctaPrice: { fontFamily: 'NunitoSans_700Bold', fontSize: 18, fontWeight: '700', color: colors['on-surface'] },
  ctaLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors['on-surface-variant'] },
  ctaButton: { flex: 1 },

  // ── Comments ────────────────────────────────────────────────────────────────
  commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  repostBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.primary,
  },
  repostBtnActive: { backgroundColor: colors.primary },
  repostBtnText: { ...typography['label-sm'], color: colors.primary, fontWeight: '700' },
  repostBtnTextActive: { color: colors.white },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  commentInputWrap: { flex: 1, borderWidth: 1, borderColor: colors['outline-variant'], borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  commentInput: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface'], minHeight: 40, maxHeight: 100 },
  charCount: { fontSize: 11, color: colors['on-surface-variant'], textAlign: 'right' },
  commentSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  commentSendBtnDisabled: { backgroundColor: colors['outline-variant'] },
  commentSendBtnText: { fontSize: 16, color: colors.white },
  noCommentsText: { ...typography['body-md'], color: colors['on-surface-variant'], textAlign: 'center', paddingVertical: spacing.lg },
  commentItem: { flexDirection: 'row', marginBottom: spacing.md },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors['primary-container'], alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  commentAvatarText: { fontSize: 14, fontWeight: '700', color: colors.white },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  commentAuthor: { ...typography['label-sm'], color: colors['on-surface'], fontWeight: '700' },
  commentTime: { fontSize: 11, color: colors['on-surface-variant'] },
  commentContent: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors['on-surface'], lineHeight: 20 },
});
