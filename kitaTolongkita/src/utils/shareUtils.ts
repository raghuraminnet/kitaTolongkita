import { Linking, Platform, Share } from 'react-native';

export interface DealShareData {
  id: string;
  title: string;
  groupPrice: number;
  originalPrice?: number;
  minMembers: number;
  membersJoined: number;
  pickupLocation: string;
  deadline?: string;
}

/**
 * Generates viral Malaysian 'Gotong Royong' WhatsApp share text.
 */
export function formatWhatsAppDealMessage(deal: DealShareData): string {
  const spotsRemaining = Math.max(deal.minMembers - deal.membersJoined, 0);
  const discount = deal.originalPrice && deal.originalPrice > deal.groupPrice
    ? ` (~RM${deal.originalPrice.toFixed(0)}~)`
    : '';

  const quorumCall = spotsRemaining > 0
    ? `🔥 *Hanya perlu ${spotsRemaining} orang lagi* untuk unlock harga kilang ni!`
    : `🎉 *Target tercapai!* Masih ada kekosongan terhad untuk join.`;

  return [
    `🤝 *Gotong Royong KitaTolongKita* 🇲🇾`,
    ``,
    `Tawaran Berjemaah: *${deal.title}*`,
    `💰 *Harga Jimat: RM ${deal.groupPrice.toFixed(0)}*${discount}`,
    `${quorumCall}`,
    `📍 Lokasi Ambil: ${deal.pickupLocation}`,
    ``,
    `Jom jimat bersama jiran tetangga sebelum slot penuh! Klik untuk sertai:`,
    `https://kitatolong.my/deal/${deal.id}`,
  ].join('\n');
}

/**
 * Directly opens WhatsApp with the formatted Gotong Royong group buy invite.
 */
export async function shareToWhatsApp(deal: DealShareData): Promise<boolean> {
  const message = formatWhatsAppDealMessage(deal);
  const encodedText = encodeURIComponent(message);
  const nativeUrl = `whatsapp://send?text=${encodedText}`;
  const webUrl = `https://wa.me/?text=${encodedText}`;

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return true;
    } else {
      await Linking.openURL(webUrl);
      return true;
    }
  } catch (err) {
    // Fall back to standard native system share
    try {
      await Share.share({
        message,
        title: deal.title,
      });
      return true;
    } catch {
      return false;
    }
  }
}
