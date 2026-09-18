import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Friendship, PardnerStatus } from '../types';

export class FriendshipService {
  private static instance: FriendshipService;
  private friendshipsCache: Map<string, Friendship> = new Map();
  private subscribers = new Set<(friendships: Friendship[]) => void>();
  private unsubscribeListener: (() => void) | null = null;

  public static getInstance(): FriendshipService {
    if (!FriendshipService.instance) {
      FriendshipService.instance = new FriendshipService();
    }
    return FriendshipService.instance;
  }

  constructor() {
    this.initRealtimeListener();
  }

  public getOrCreateProspectorId(): string {
    let id = localStorage.getItem('superstition_prospector_id');
    if (!id) {
      id = 'prospector_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('superstition_prospector_id', id);
    }
    return id;
  }

  public getProspectorName(): string {
    return localStorage.getItem('prospector_name') || 'Canyon Jack';
  }

  public setProspectorName(name: string) {
    const trimmed = name.trim();
    if (trimmed) {
      localStorage.setItem('prospector_name', trimmed);
      this.notifySubscribers(Array.from(this.friendshipsCache.values()));
    }
  }

  public getAcceptedPardners(): { pardnerId: string; pardnerName: string; friendship: Friendship }[] {
    const selfId = this.getOrCreateProspectorId();
    const selfName = this.getProspectorName().toLowerCase();
    const pardners: { pardnerId: string; pardnerName: string; friendship: Friendship }[] = [];

    for (const f of this.friendshipsCache.values()) {
      if (f.status !== 'accepted') continue;
      const isSender = f.senderId === selfId || f.senderName.toLowerCase() === selfName;
      const isReceiver = f.receiverId === selfId || f.receiverName.toLowerCase() === selfName;

      if (isSender) {
        pardners.push({
          pardnerId: f.receiverId,
          pardnerName: f.receiverName,
          friendship: f,
        });
      } else if (isReceiver) {
        pardners.push({
          pardnerId: f.senderId,
          pardnerName: f.senderName,
          friendship: f,
        });
      }
    }
    return pardners;
  }

  private initRealtimeListener() {
    const path = 'friendships';
    try {
      this.unsubscribeListener = onSnapshot(
        collection(db, path),
        (snapshot) => {
          this.friendshipsCache.clear();
          snapshot.forEach((d) => {
            const data = d.data() as Friendship;
            this.friendshipsCache.set(data.id, data);
          });
          const list = Array.from(this.friendshipsCache.values());
          this.notifySubscribers(list);
        },
        (error) => {
          console.warn('[FriendshipService] Firestore subscription notice:', error.message);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } catch (err) {
      console.warn('[FriendshipService] Error initializing snapshot listener:', err);
    }
  }

  public subscribe(fn: (friendships: Friendship[]) => void): () => void {
    this.subscribers.add(fn);
    fn(Array.from(this.friendshipsCache.values()));
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notifySubscribers(list: Friendship[]) {
    this.subscribers.forEach((fn) => {
      try {
        fn(list);
      } catch (err) {
        console.error(err);
      }
    });
  }

  public getAllFriendships(): Friendship[] {
    return Array.from(this.friendshipsCache.values());
  }

  /**
   * Determine the relationship status between the local prospector and another player.
   */
  public getPardnerStatus(otherPlayerId: string, otherPlayerName?: string): {
    status: PardnerStatus;
    friendship?: Friendship;
  } {
    const selfId = this.getOrCreateProspectorId();
    const selfName = this.getProspectorName().toLowerCase();
    const targetName = otherPlayerName?.toLowerCase();

    for (const f of this.friendshipsCache.values()) {
      // Direct ID match or fallback to name match if IDs were regenerated across sessions
      const isSender = f.senderId === selfId || (targetName && f.receiverName.toLowerCase() === targetName && f.senderName.toLowerCase() === selfName);
      const isReceiver = f.receiverId === selfId || (targetName && f.senderName.toLowerCase() === targetName && f.receiverName.toLowerCase() === selfName);

      const matchesTarget =
        (isSender && (f.receiverId === otherPlayerId || (targetName && f.receiverName.toLowerCase() === targetName))) ||
        (isReceiver && (f.senderId === otherPlayerId || (targetName && f.senderName.toLowerCase() === targetName)));

      if (matchesTarget) {
        if (f.status === 'accepted') {
          return { status: 'pardner', friendship: f };
        }
        if (f.status === 'pending') {
          if (isSender) {
            return { status: 'pending_sent', friendship: f };
          } else {
            return { status: 'pending_received', friendship: f };
          }
        }
      }
    }

    return { status: 'none' };
  }

  /**
   * Send a Pardner Request to a fellow prospector.
   */
  public async sendPardnerRequest(targetId: string, targetName: string): Promise<{ success: boolean; message: string }> {
    const selfId = this.getOrCreateProspectorId();
    const selfName = this.getProspectorName();

    if (selfId === targetId || selfName.toLowerCase() === targetName.toLowerCase()) {
      return { success: false, message: "You cannot make a pardnership with yourself!" };
    }

    // Check if an alliance already exists
    const current = this.getPardnerStatus(targetId, targetName);
    if (current.status === 'pardner') {
      return { success: true, message: `You and ${targetName} are already loyal trail pardners!` };
    }
    if (current.status === 'pending_sent') {
      return { success: true, message: `Pardner pact already telegraphed to ${targetName}. Awaiting their handshake!` };
    }
    if (current.status === 'pending_received' && current.friendship) {
      // Auto-accept if they already sent one
      await this.acceptPardnerRequest(current.friendship.id);
      return { success: true, message: `Handshake sealed! You and ${targetName} are now official Pardners!` };
    }

    const friendshipId = `pardner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newFriendship: Friendship = {
      id: friendshipId,
      senderId: selfId,
      senderName: selfName,
      receiverId: targetId,
      receiverName: targetName,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const path = `friendships/${friendshipId}`;
    try {
      await setDoc(doc(db, 'friendships', friendshipId), newFriendship);
      this.friendshipsCache.set(friendshipId, newFriendship);
      this.notifySubscribers(Array.from(this.friendshipsCache.values()));
      return {
        success: true,
        message: `🤝 Sent Pardner Invitation to ${targetName}! Awaiting frontier handshake.`,
      };
    } catch (err) {
      console.warn('[FriendshipService] Failed to send friendship request:', err);
      handleFirestoreError(err, OperationType.CREATE, path);
      return { success: false, message: 'Failed to dispatch pardner invitation via telegraph.' };
    }
  }

  /**
   * Accept a pending Pardner Request.
   */
  public async acceptPardnerRequest(friendshipId: string): Promise<boolean> {
    const path = `friendships/${friendshipId}`;
    try {
      await updateDoc(doc(db, 'friendships', friendshipId), {
        status: 'accepted',
        updatedAt: Date.now(),
      });
      const cached = this.friendshipsCache.get(friendshipId);
      if (cached) {
        cached.status = 'accepted';
        cached.updatedAt = Date.now();
        this.notifySubscribers(Array.from(this.friendshipsCache.values()));
      }
      return true;
    } catch (err) {
      console.warn('[FriendshipService] Failed to accept friendship:', err);
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * Decline or dissolve a Pardner alliance.
   */
  public async dissolvePardnership(friendshipId: string): Promise<boolean> {
    const path = `friendships/${friendshipId}`;
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
      this.friendshipsCache.delete(friendshipId);
      this.notifySubscribers(Array.from(this.friendshipsCache.values()));
      return true;
    } catch (err) {
      console.warn('[FriendshipService] Failed to dissolve friendship:', err);
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  public cleanup() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }
  }
}

export const friendshipService = FriendshipService.getInstance();
