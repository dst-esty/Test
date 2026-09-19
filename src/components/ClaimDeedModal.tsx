import React, { useState, useEffect } from 'react';
import {
  Award,
  Scroll,
  MapPin,
  Pickaxe,
  X,
  Edit2,
  Check,
  Hammer,
  Building2,
  DollarSign,
  Coins,
  ArrowRightLeft,
  Store,
  Tag,
  Clock,
  ShieldCheck,
  Send,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { BuiltStructure, ClaimInfo, PlayerState, TerritoryClaim, ClaimTradeOffer } from '../types';
import { territoryClaims } from '../services/territoryClaimService';
import { soundEngine } from '../audio/soundEffects';

interface ClaimDeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimInfo | null;
  playerState?: PlayerState;
  builtStructures?: BuiltStructure[];
  goldCount?: number;
  blocksDug?: number;
  onRenameClaim?: (newName: string) => void;
  onUpdateClaimName?: (newName: string) => void;
  onOpenBuilder?: () => void;
  onBuyClaim?: (claim: TerritoryClaim, payWith: 'cash' | 'gold') => void;
  onSellClaimToSyndicate?: (claimId: string, payout: number) => void;
  onListClaimForSale?: (claimId: string, priceDollars: number, priceGold: number, desc: string) => void;
  onCancelListing?: (claimId: string) => void;
  onTradeOfferResponse?: (offerId: string, accept: boolean) => void;
}

export const ClaimDeedModal: React.FC<ClaimDeedModalProps> = ({
  isOpen,
  onClose,
  claim,
  playerState,
  builtStructures = [],
  goldCount,
  blocksDug,
  onRenameClaim,
  onUpdateClaimName,
  onOpenBuilder,
  onBuyClaim,
  onSellClaimToSyndicate,
  onListClaimForSale,
  onCancelListing,
  onTradeOfferResponse,
}) => {
  const [activeTab, setActiveTab] = useState<'deed' | 'sell' | 'exchange'>('deed');
  const [isEditing, setIsEditing] = useState(false);
  const [claimNameInput, setClaimNameInput] = useState(claim?.name || "Jacob Waltz's Discovery Lode");

  // Listing state
  const [askingPriceDollars, setAskingPriceDollars] = useState<number>(250);
  const [askingPriceGold, setAskingPriceGold] = useState<number>(12.0);
  const [listingDescription, setListingDescription] = useState<string>('');

  // Exchange state
  const [allClaims, setAllClaims] = useState<TerritoryClaim[]>([]);
  const [allOffers, setAllOffers] = useState<ClaimTradeOffer[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'for_sale' | 'my_offers'>('for_sale');
  const [tradeModalTarget, setTradeModalTarget] = useState<TerritoryClaim | null>(null);
  const [tenderCash, setTenderCash] = useState<number>(100);
  const [tenderGold, setTenderGold] = useState<number>(5.0);
  const [includeBarterClaim, setIncludeBarterClaim] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const localProspectorId = territoryClaims.getOrCreateProspectorId();
  const localProspectorName = territoryClaims.getProspectorName();

  useEffect(() => {
    if (claim?.name) {
      setClaimNameInput(claim.name);
    }
  }, [claim?.name]);

  // Subscribe to all claims and trade offers in real-time
  useEffect(() => {
    if (!isOpen) return;
    const unsubClaims = territoryClaims.subscribe((claims) => {
      setAllClaims(claims);
    });
    const unsubOffers = territoryClaims.subscribeTradeOffers((offers) => {
      setAllOffers(offers);
    });
    return () => {
      unsubClaims();
      unsubOffers();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentGold = typeof goldCount === 'number' && !isNaN(goldCount)
    ? goldCount
    : typeof playerState?.goldFound === 'number' && !isNaN(playerState.goldFound)
    ? playerState.goldFound
    : 0;

  const currentBlocksDug = typeof blocksDug === 'number' && !isNaN(blocksDug)
    ? blocksDug
    : typeof playerState?.blocksDug === 'number' && !isNaN(playerState.blocksDug)
    ? playerState.blocksDug
    : 0;

  const currentCash = playerState?.cashDollars || 0;

  // Find matching TerritoryClaim for activeClaim if available
  const matchingTerritoryClaim = allClaims.find(
    (c) =>
      c.id === (claim as any)?.id ||
      c.name === claim?.name ||
      (Math.abs(c.x - (claim?.position?.x || 0)) < 2.0 && Math.abs(c.z - (claim?.position?.z || 0)) < 2.0)
  );

  const isClaimListed = matchingTerritoryClaim?.forSale || false;

  const handleSaveName = () => {
    const trimmed = claimNameInput.trim();
    if (trimmed) {
      if (onRenameClaim) onRenameClaim(trimmed);
      else if (onUpdateClaimName) onUpdateClaimName(trimmed);
    }
    setIsEditing(false);
  };

  // Appraisal Calculation
  const appraisal = territoryClaims.calculateAppraisedValue({
    extractedGold: currentGold,
    blocksDug: currentBlocksDug,
    radius: claim?.size || 40,
    isWildcatOrigin: claim?.isWildcatOrigin,
  });

  const handleSellToSyndicate = async () => {
    let targetClaimId = matchingTerritoryClaim?.id;
    if (!targetClaimId && claim) {
      const reg = await territoryClaims.stakeClaim({
        name: claim.name,
        position: claim.position,
        ownerId: localProspectorId,
        ownerName: localProspectorName,
        isWildcatOrigin: claim.isWildcatOrigin,
      });
      targetClaimId = reg.claim?.id;
    }
    if (!targetClaimId) {
      setStatusNotice('Deed record not found on territory registry.');
      return;
    }
    if (onSellClaimToSyndicate) {
      onSellClaimToSyndicate(targetClaimId, appraisal.dollars);
      soundEngine.playCoins();
      setStatusNotice(`Claim successfully surrendered to the Territorial Mining Syndicate for $${appraisal.dollars}!`);
      setTimeout(() => {
        onClose();
      }, 1800);
    }
  };

  const handlePostListing = async () => {
    let targetClaimId = matchingTerritoryClaim?.id;
    if (!targetClaimId && claim) {
      const reg = await territoryClaims.stakeClaim({
        name: claim.name,
        position: claim.position,
        ownerId: localProspectorId,
        ownerName: localProspectorName,
        isWildcatOrigin: claim.isWildcatOrigin,
      });
      targetClaimId = reg.claim?.id;
    }
    if (!targetClaimId) {
      setStatusNotice('Must stake deed before listing on the open exchange.');
      return;
    }
    if (onListClaimForSale) {
      onListClaimForSale(
        targetClaimId,
        askingPriceDollars,
        askingPriceGold,
        listingDescription
      );
      soundEngine.playHammerStake();
      setStatusNotice('Claim deed posted to the Territorial Mining Exchange Board!');
    }
  };

  const handleCancelListing = () => {
    if (!matchingTerritoryClaim) return;
    if (onCancelListing) {
      onCancelListing(matchingTerritoryClaim.id);
      setStatusNotice('Listing withdrawn from the open market.');
    }
  };

  const handleDirectBuy = (target: TerritoryClaim, method: 'cash' | 'gold') => {
    const reqDollars = target.priceDollars || 150;
    const reqGold = target.priceGoldOunces || Math.round((reqDollars / 20.67) * 10) / 10;

    if (method === 'cash' && currentCash < reqDollars) {
      setStatusNotice(`Insufficient cash! Requires $${reqDollars}. Cash in gold ore at Tortilla Flat.`);
      return;
    }
    if (method === 'gold' && currentGold < reqGold) {
      setStatusNotice(`Insufficient raw gold! Requires ${reqGold} oz. Mine more paydirt.`);
      return;
    }

    if (onBuyClaim) {
      onBuyClaim(target, method);
      soundEngine.playCoins();
      setStatusNotice(`Deed acquired for "${target.name}"! Officially recorded in district archives.`);
      setTimeout(() => {
        setActiveTab('deed');
      }, 1500);
    }
  };

  const handleSubmitBarterTender = async () => {
    if (!tradeModalTarget) return;
    if (tenderCash > currentCash) {
      setStatusNotice("You cannot offer more cash than what's in your money pouch.");
      return;
    }
    if (tenderGold > currentGold) {
      setStatusNotice('You cannot offer more raw gold ore than your pouch contains.');
      return;
    }

    let barterClaimId = matchingTerritoryClaim?.id;
    let barterClaimName = matchingTerritoryClaim?.name || claim?.name;
    if (includeBarterClaim && claim && !barterClaimId) {
      const reg = await territoryClaims.stakeClaim({
        name: claim.name,
        position: claim.position,
        ownerId: localProspectorId,
        ownerName: localProspectorName,
        isWildcatOrigin: claim.isWildcatOrigin,
      });
      barterClaimId = reg.claim?.id;
      barterClaimName = claim.name;
    }

    const res = await territoryClaims.submitTradeOffer({
      claimId: tradeModalTarget.id,
      claimName: tradeModalTarget.name,
      targetOwnerId: tradeModalTarget.ownerId,
      buyerId: localProspectorId,
      buyerName: localProspectorName,
      cashOffered: tenderCash,
      goldOffered: tenderGold,
      offeredClaimId: includeBarterClaim && barterClaimId ? barterClaimId : undefined,
      offeredClaimName: includeBarterClaim && barterClaimName ? barterClaimName : undefined,
    });

    if (res.success) {
      soundEngine.playCoins();
      setStatusNotice(`Trade tender submitted to ${tradeModalTarget.ownerName}!`);
      setTradeModalTarget(null);
    } else {
      setStatusNotice(res.message || 'Failed to submit tender.');
    }
  };

  const myOffersList = allOffers.filter(
    (o) => o.buyerId === localProspectorId || o.targetOwnerId === localProspectorId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md select-none font-serif">
      <div className="relative w-full max-w-3xl bg-[#f4ebd0] text-[#332211] rounded-2xl p-6 sm:p-8 shadow-2xl border-4 border-[#8b6540] overflow-hidden">
        {/* Ornate Vintage Border Inset */}
        <div className="absolute inset-2 border-2 border-[#b8976b] pointer-events-none rounded-xl" />
        <div className="absolute inset-3 border border-[#d2b896] pointer-events-none rounded-lg" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#e2d0a8] text-[#553a20] transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-1">
            <div className="p-2.5 bg-[#e8d7b3] border-2 border-[#946e45] rounded-full shadow-inner">
              <Scroll className="w-7 h-7 text-[#663b15]" />
            </div>
          </div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#7a532d] font-sans font-bold">
            Territory of Arizona • Superstition Mining District
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#3e250f] mt-0.5 tracking-tight">
            Mineral Claims, Deeds & Trade Office
          </h2>
          <div className="w-40 h-0.5 bg-[#8b6540] mx-auto mt-2" />
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-[#bfa37b] mb-4 gap-2 font-sans text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('deed')}
            className={`pb-2 px-4 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'deed'
                ? 'border-[#7a4f27] text-[#4a2e15] font-black'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Scroll className="w-4 h-4" />
            1. Official Deed Patent
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`pb-2 px-4 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sell'
                ? 'border-[#7a4f27] text-[#4a2e15] font-black'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            2. Sell & Appraisal
          </button>
          <button
            onClick={() => setActiveTab('exchange')}
            className={`pb-2 px-4 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'exchange'
                ? 'border-[#7a4f27] text-[#4a2e15] font-black'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Store className="w-4 h-4" />
            3. District Claims Exchange ({allClaims.filter((c) => c.forSale).length})
          </button>
        </div>

        {/* Status notice flash */}
        {statusNotice && (
          <div className="mb-3 p-2 bg-amber-200/90 border border-amber-600 rounded text-center text-xs font-sans font-bold text-amber-950 animate-fade-in">
            {statusNotice}
          </div>
        )}

        {/* TAB 1: OFFICIAL DEED PATENT */}
        {activeTab === 'deed' && (
          <div>
            {!claim ? (
              <div className="text-center py-8">
                <div className="p-3 bg-[#e8d7b3] border-2 border-[#946e45] rounded-full w-14 h-14 mx-auto flex items-center justify-center mb-4">
                  <Pickaxe className="w-7 h-7 text-[#663b15]" />
                </div>
                <h3 className="text-xl font-bold text-[#3e250f] mb-2">No Active Claim Staked Yet</h3>
                <p className="text-sm text-stone-700 max-w-md mx-auto mb-5 font-sans leading-relaxed">
                  You do not currently hold an active mineral boundary deed. You can drive corner posts in the wild using your Survey Claim Stake [9], or purchase a proven patent right here from the <strong>District Claims Exchange</strong>!
                </p>
                <div className="flex justify-center gap-3 font-sans">
                  <button
                    onClick={() => setActiveTab('exchange')}
                    className="px-5 py-2.5 bg-[#8b6540] hover:bg-[#6e4e30] text-amber-100 font-bold text-xs uppercase tracking-wider rounded-lg shadow flex items-center gap-2 cursor-pointer"
                  >
                    <Store className="w-4 h-4" /> Browse District Claims for Sale
                  </button>
                  {onOpenBuilder && (
                    <button
                      onClick={onOpenBuilder}
                      className="px-5 py-2.5 bg-[#d8c29d] hover:bg-[#caa880] text-stone-900 font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Hammer className="w-4 h-4" /> Open Construction Depot
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Registered Title Banner */}
                <div className="bg-[#ede1c2] border border-[#bfa37b] rounded-lg p-3.5 mb-4 shadow-inner text-center">
                  <span className="text-[11px] uppercase text-[#735332] font-sans font-semibold">Registered Claim Title</span>
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <input
                        type="text"
                        value={claimNameInput}
                        onChange={(e) => setClaimNameInput(e.target.value)}
                        className="px-3 py-1 bg-[#fbf5e6] border-2 border-[#8b6540] rounded text-lg font-bold text-[#3e250f] focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        className="p-1.5 bg-[#8b6540] hover:bg-[#6e4e30] text-amber-100 rounded cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <h3 className="text-xl sm:text-2xl font-bold text-[#361e0b] italic">"{claim.name}"</h3>
                      <button
                        onClick={() => {
                          setClaimNameInput(claim.name);
                          setIsEditing(true);
                        }}
                        className="text-[#8b6540] hover:text-[#523519] p-1 cursor-pointer"
                        title="Rename Claim"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {isClaimListed && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-100 text-[10px] font-sans font-bold uppercase tracking-wider">
                      Currently Listed for Sale on District Board
                    </span>
                  )}
                </div>

                {/* Legal Particulars */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                  <div className="p-2.5 bg-[#ede1c2]/70 rounded border border-[#caa880]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6d4b29] uppercase font-sans mb-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Coordinates
                    </div>
                    <p className="font-semibold text-[#3b2310] text-xs">
                      {claim.position.x.toFixed(1)}° E, {claim.position.z.toFixed(1)}° S
                    </p>
                    <span className="text-[10px] text-[#6d4b29]/80">Elev. {claim.position.y.toFixed(1)}m</span>
                  </div>

                  <div className="p-2.5 bg-[#ede1c2]/70 rounded border border-[#caa880]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6d4b29] uppercase font-sans mb-0.5">
                      <Award className="w-3.5 h-3.5" />
                      Acreage
                    </div>
                    <p className="font-semibold text-[#3b2310] text-xs">{claim.size} Yards Perimeter</p>
                    <span className="text-[10px] text-[#6d4b29]/80">4 Corner Posts</span>
                  </div>

                  <div className="p-2.5 bg-[#ede1c2]/70 rounded border border-[#caa880]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6d4b29] uppercase font-sans mb-0.5">
                      <Pickaxe className="w-3.5 h-3.5" />
                      Yield Record
                    </div>
                    <p className="font-semibold text-[#3b2310] text-xs">{currentGold.toFixed(1)} Troy Ounces</p>
                    <span className="text-[10px] text-[#6d4b29]/80">{currentBlocksDug} excavated blocks</span>
                  </div>

                  <div className="p-2.5 bg-[#ede1c2]/70 rounded border border-[#caa880]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6d4b29] uppercase font-sans mb-0.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      Appraised Value
                    </div>
                    <p className="font-semibold text-[#3b2310] text-xs">${appraisal.dollars} USD</p>
                    <span className="text-[10px] text-[#6d4b29]/80">~{appraisal.goldOunces} oz gold</span>
                  </div>
                </div>

                {/* Built Structures on patent */}
                <div className="mb-4 p-3 bg-[#ede1c2]/60 rounded-lg border border-[#caa880]/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs uppercase font-sans font-bold text-[#6d4b29] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Surface & Subterranean Structures ({builtStructures.length})
                    </span>
                    {onOpenBuilder && (
                      <button
                        onClick={onOpenBuilder}
                        className="text-[11px] font-sans font-bold text-[#8b6540] hover:text-[#523519] underline cursor-pointer"
                      >
                        + Construct More [B]
                      </button>
                    )}
                  </div>
                  {builtStructures.length === 0 ? (
                    <p className="text-xs text-stone-600 italic">
                      No timber headframes or sluices recorded on this patent. Open Construction Depot to build.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {builtStructures.map((s) => (
                        <div key={s.id} className="p-1.5 bg-[#fbf5e6] rounded border border-[#d2b896] text-xs">
                          <p className="font-bold text-[#3e250f] truncate">{s.name}</p>
                          <span className="text-[10px] text-stone-600 font-mono">
                            X: {Math.round(s.position.x)}, Z: {Math.round(s.position.z)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t-2 border-[#b5956c] font-sans text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('sell')}
                      className="px-4 py-2 bg-[#8b6540] hover:bg-[#6c4d2e] text-[#f7eedc] font-bold rounded-lg shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Tag className="w-3.5 h-3.5" /> Sell / Market Options
                    </button>
                    <button
                      onClick={() => setActiveTab('exchange')}
                      className="px-4 py-2 bg-[#dcc499] hover:bg-[#caa880] text-[#3e250f] font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Trade Deeds
                    </button>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 bg-[#d8c29d] hover:bg-[#caa880] text-stone-900 font-bold rounded-lg cursor-pointer"
                  >
                    Close Deed
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: SELL & APPRAISAL */}
        {activeTab === 'sell' && (
          <div className="space-y-4">
            {!claim ? (
              <div className="text-center py-6 text-sm text-stone-700">
                You must hold a staked claim to sell or list it. Stake a claim or acquire one in the District Exchange.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Syndicate Instant Buyout */}
                  <div className="p-4 bg-[#ede1c2] rounded-xl border-2 border-[#bfa37b] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold font-sans uppercase tracking-wide text-[#7a4f27] mb-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-800" />
                        Territorial Bureau Guaranteed Buyout
                      </div>
                      <h4 className="text-lg font-bold text-[#3e250f] mb-1">Sell to Arizona Mining Syndicate</h4>
                      <p className="text-xs text-stone-700 leading-relaxed font-sans mb-3">
                        Immediate deed surrender to the government land office. Payout is calculated from legal acreage, historic strike tier, and proven yield.
                      </p>
                      <div className="bg-[#fbf5e6] p-2.5 rounded-lg border border-[#d2b896] mb-3 text-xs font-sans space-y-1">
                        <div className="flex justify-between">
                          <span className="text-stone-600">Base 40-Acre Patent:</span>
                          <span className="font-bold text-stone-900">$90.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Extracted Gold Multiplier ({currentGold.toFixed(1)} oz):</span>
                          <span className="font-bold text-stone-900">+${Math.round(currentGold * 16.5)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Shaft Work ({currentBlocksDug} blocks):</span>
                          <span className="font-bold text-stone-900">+${Math.round(currentBlocksDug * 0.45)}</span>
                        </div>
                        <div className="pt-1 border-t border-[#caa880] flex justify-between font-bold text-emerald-900 text-sm">
                          <span>Instant Cash Payout:</span>
                          <span>${appraisal.dollars}.00 USD</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleSellToSyndicate}
                      className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-emerald-100 font-bold font-sans text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Coins className="w-4 h-4" /> Surrender Deed for ${appraisal.dollars} Cash
                    </button>
                  </div>

                  {/* Public Board Market Listing */}
                  <div className="p-4 bg-[#ede1c2] rounded-xl border-2 border-[#bfa37b] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold font-sans uppercase tracking-wide text-[#7a4f27] mb-1">
                        <Store className="w-4 h-4 text-amber-900" />
                        District Board Public Listing
                      </div>
                      <h4 className="text-lg font-bold text-[#3e250f] mb-1">List on the Mining Exchange</h4>
                      <p className="text-xs text-stone-700 leading-relaxed font-sans mb-3">
                        Post your patent on the district exchange board for fellow prospectors to inspect and purchase.
                      </p>

                      {isClaimListed ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-400 rounded-lg text-xs font-sans mb-3">
                          <p className="font-bold text-emerald-900 mb-1">Deed Currently Listed on District Board!</p>
                          <p className="text-stone-700">Asking: <strong>${matchingTerritoryClaim?.priceDollars}</strong> or <strong>{matchingTerritoryClaim?.priceGoldOunces} oz gold</strong></p>
                          <p className="text-[11px] text-stone-600 italic mt-1">"{matchingTerritoryClaim?.description || 'No description provided.'}"</p>
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs font-sans mb-3">
                          <div>
                            <label className="block font-bold text-[#442b14] mb-0.5">Asking Price ($ Cash):</label>
                            <input
                              type="number"
                              min="20"
                              max="5000"
                              value={askingPriceDollars}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setAskingPriceDollars(val);
                                setAskingPriceGold(Math.round((val / 20.67) * 10) / 10);
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#fbf5e6] border border-[#8b6540] rounded font-bold text-stone-900"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-[#442b14] mb-0.5">Prospector's Geological Description:</label>
                            <input
                              type="text"
                              maxLength={180}
                              placeholder="e.g. Rich quartz ledge near volcanic chimney..."
                              value={listingDescription}
                              onChange={(e) => setListingDescription(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#fbf5e6] border border-[#8b6540] rounded text-stone-900 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {isClaimListed ? (
                      <button
                        onClick={handleCancelListing}
                        className="w-full py-2.5 bg-red-800 hover:bg-red-900 text-red-100 font-bold font-sans text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" /> Withdraw Listing from Market
                      </button>
                    ) : (
                      <button
                        onClick={handlePostListing}
                        className="w-full py-2.5 bg-[#8b6540] hover:bg-[#6c4d2e] text-[#f7eedc] font-bold font-sans text-xs uppercase tracking-wider rounded-lg shadow cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-4 h-4" /> Post Claim for Sale (${askingPriceDollars})
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: DISTRICT CLAIMS EXCHANGE */}
        {activeTab === 'exchange' && (
          <div className="space-y-3">
            {/* Filter buttons & Wallet info */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#ede1c2] rounded-lg border border-[#caa880] text-xs font-sans">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterMode('for_sale')}
                  className={`px-3 py-1 rounded font-bold cursor-pointer ${
                    filterMode === 'for_sale' ? 'bg-[#8b6540] text-amber-100' : 'bg-[#e2d0a8] text-[#553a20]'
                  }`}
                >
                  Claims For Sale ({allClaims.filter((c) => c.forSale).length})
                </button>
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded font-bold cursor-pointer ${
                    filterMode === 'all' ? 'bg-[#8b6540] text-amber-100' : 'bg-[#e2d0a8] text-[#553a20]'
                  }`}
                >
                  All District Patents ({allClaims.length})
                </button>
                <button
                  onClick={() => setFilterMode('my_offers')}
                  className={`px-3 py-1 rounded font-bold cursor-pointer ${
                    filterMode === 'my_offers' ? 'bg-[#8b6540] text-amber-100' : 'bg-[#e2d0a8] text-[#553a20]'
                  }`}
                >
                  Trade Offers ({myOffersList.length})
                </button>
              </div>

              <div className="flex items-center gap-3 font-mono font-bold text-stone-800">
                <span className="text-emerald-900">💵 ${currentCash.toFixed(2)}</span>
                <span className="text-amber-900">⛏️ {currentGold.toFixed(1)} oz Gold</span>
              </div>
            </div>

            {/* CLAIMS LIST */}
            {filterMode !== 'my_offers' && (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 font-sans">
                {allClaims
                  .filter((c) => (filterMode === 'for_sale' ? c.forSale : true))
                  .map((c) => {
                    const isOwnClaim = c.ownerId === localProspectorId;
                    const priceDollars = c.priceDollars || 160;
                    const priceGold = c.priceGoldOunces || Math.round((priceDollars / 20.67) * 10) / 10;
                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-[#fbf5e6] rounded-xl border border-[#d2b896] hover:border-[#8b6540] transition shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif font-bold text-[#3e250f] text-sm">{c.name}</h4>
                            {c.forSale && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-500 text-emerald-900 font-bold text-[10px] uppercase">
                                For Sale
                              </span>
                            )}
                            {isOwnClaim && (
                              <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-bold text-[10px] uppercase">
                                You Own This
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-600 font-mono mt-0.5">
                            Owner: <span className="font-bold text-stone-800">{c.ownerName}</span> • Coordinates: {c.x} E, {c.z} S ({c.radius}m perimeter)
                          </p>
                          <p className="text-[11px] text-stone-700 italic mt-0.5">
                            Yield History: {c.extractedGold || 0} oz gold recovered • {c.blocksDug || 0} blocks dug
                          </p>
                          {c.description && (
                            <p className="text-[11px] text-stone-600 mt-1 bg-amber-100/60 p-1.5 rounded border border-amber-300/60">
                              "{c.description}"
                            </p>
                          )}
                        </div>

                        <div className="flex flex-row sm:flex-col items-end gap-1.5 w-full sm:w-auto">
                          {c.forSale && (
                            <div className="text-right">
                              <span className="font-bold text-emerald-900 text-sm block">${priceDollars} USD</span>
                              <span className="text-[10px] text-stone-600 block">or {priceGold} oz gold</span>
                            </div>
                          )}

                          {!isOwnClaim && (
                            <div className="flex items-center gap-1.5">
                              {c.forSale && (
                                <>
                                  <button
                                    onClick={() => handleDirectBuy(c, 'cash')}
                                    disabled={currentCash < priceDollars}
                                    className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-emerald-100 font-bold rounded cursor-pointer transition text-[11px]"
                                    title="Buy with cash dollars"
                                  >
                                    Buy ($)
                                  </button>
                                  <button
                                    onClick={() => handleDirectBuy(c, 'gold')}
                                    disabled={currentGold < priceGold}
                                    className="px-2.5 py-1.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-40 text-amber-100 font-bold rounded cursor-pointer transition text-[11px]"
                                    title="Buy with raw gold ore"
                                  >
                                    Buy (Ore)
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  setTradeModalTarget(c);
                                  setTenderCash(Math.round(priceDollars * 0.7));
                                  setTenderGold(Math.round(priceGold * 0.5 * 10) / 10);
                                }}
                                className="px-2.5 py-1.5 bg-[#8b6540] hover:bg-[#6c4d2e] text-[#f7eedc] font-bold rounded cursor-pointer transition text-[11px]"
                              >
                                Barter / Trade
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* TRADE OFFERS LIST */}
            {filterMode === 'my_offers' && (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 font-sans">
                {myOffersList.length === 0 ? (
                  <p className="text-center py-6 text-xs text-stone-600 italic">
                    No active trade tenders currently filed on your record. Select any claim to propose a cash, gold, or deed trade!
                  </p>
                ) : (
                  myOffersList.map((offer) => {
                    const isIncoming = offer.targetOwnerId === localProspectorId;
                    return (
                      <div
                        key={offer.id}
                        className="p-3 bg-[#fbf5e6] rounded-xl border border-[#caa880] flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">
                              {isIncoming ? `Tender From: ${offer.buyerName}` : `Tender Sent To Owner of: ${offer.claimName}`}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                offer.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : offer.status === 'declined'
                                  ? 'bg-red-100 text-red-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {offer.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-700 mt-1">
                            Tender Terms: <strong>${offer.cashOffered}</strong> cash + <strong>{offer.goldOffered} oz</strong> gold
                            {offer.offeredClaimName && (
                              <span> + Barter Deed: <strong>"{offer.offeredClaimName}"</strong></span>
                            )}
                          </p>
                        </div>

                        {isIncoming && offer.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (onTradeOfferResponse) onTradeOfferResponse(offer.id, true);
                              }}
                              className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-emerald-100 font-bold rounded cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => {
                                if (onTradeOfferResponse) onTradeOfferResponse(offer.id, false);
                              }}
                              className="px-3 py-1 bg-red-800 hover:bg-red-900 text-red-100 font-bold rounded cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {!isIncoming && offer.status === 'pending' && (
                          <button
                            onClick={() => territoryClaims.cancelTradeOffer(offer.id)}
                            className="px-3 py-1 bg-stone-700 hover:bg-stone-800 text-stone-100 font-bold rounded cursor-pointer text-[10px]"
                          >
                            Cancel Tender
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* MODAL DIALOG: PROPOSE BARTER TENDER */}
            {tradeModalTarget && (
              <div className="p-3 bg-[#ede1c2] rounded-xl border-2 border-[#8b6540] animate-fade-in font-sans text-xs">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-[#3e250f] text-sm">
                    Submit Barter Offer for: "{tradeModalTarget.name}"
                  </h4>
                  <button
                    onClick={() => setTradeModalTarget(null)}
                    className="text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#442b14] mb-0.5">Offer Cash ($):</label>
                    <input
                      type="number"
                      min="0"
                      max={currentCash}
                      value={tenderCash}
                      onChange={(e) => setTenderCash(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-[#fbf5e6] border border-[#8b6540] rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#442b14] mb-0.5">Offer Raw Gold (oz):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={currentGold}
                      value={tenderGold}
                      onChange={(e) => setTenderGold(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-[#fbf5e6] border border-[#8b6540] rounded font-bold"
                    />
                  </div>
                  {claim && (
                    <div className="flex items-center gap-1.5 pt-4">
                      <input
                        type="checkbox"
                        id="includeBarterClaim"
                        checked={includeBarterClaim}
                        onChange={(e) => setIncludeBarterClaim(e.target.checked)}
                        className="rounded cursor-pointer"
                      />
                      <label htmlFor="includeBarterClaim" className="text-[11px] font-bold cursor-pointer">
                        Trade my claim "{claim.name}"
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setTradeModalTarget(null)}
                    className="px-3 py-1 bg-[#d8c29d] rounded font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitBarterTender}
                    className="px-4 py-1 bg-[#8b6540] hover:bg-[#6c4d2e] text-[#f7eedc] font-bold rounded shadow cursor-pointer"
                  >
                    Transmit Tender
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

