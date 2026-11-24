'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Gift,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Lock,
  Search,
  RefreshCw,
  History,
  Box,
  UserCheck,
  AlertOctagon,
  Award,
  Zap,
  ArrowUpRight,
  Check,
  Flame,
  Copy,
  ChevronRight,
  Layers,
  Radio
} from 'lucide-react'

interface RewardItem {
  id: string
  title: string
  description: string
  pointsCost: number
  stock: number
  active: boolean
}

interface ClaimedBox {
  id: string
  code: string
  batchName: string
  productName: string
  pointsEarned: number
  redeemedAt: string | null
}

interface RedemptionRecord {
  id: string
  pointsSpent: number
  status: string
  createdAt: string
  reward: {
    id: string
    title: string
    description: string
    pointsCost: number
  }
}

interface CustomerProfile {
  id: string
  name: string
  contact: string
  pointsBalance: number
  totalEarned: number
  createdAt: string
}

function CustomerPortal() {
  const searchParams = useSearchParams()
  const codeParam = searchParams.get('code')

  // Wallet & Profile State
  const [walletLookupInput, setWalletLookupInput] = useState('')
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [claimedBoxes, setClaimedBoxes] = useState<ClaimedBox[]>([])
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([])
  const [rewards, setRewards] = useState<RewardItem[]>([])
  const [isLoadingWallet, setIsLoadingWallet] = useState(false)
  const [isLoadingRewards, setIsLoadingRewards] = useState(true)

  // Box Code Claim Form State
  const [claimName, setClaimName] = useState('')
  const [claimContact, setClaimContact] = useState('')
  const [claimCode, setClaimCode] = useState(codeParam ? codeParam.toUpperCase() : '')
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<{
    text: string
    points: number
    productName: string
  } | null>(null)
  const [claimErrorMsg, setClaimErrorMsg] = useState<{
    text: string
    reason?: string
  } | null>(null)

  // Redemption State
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null)
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState<string | null>(null)
  const [redeemErrorMsg, setRedeemErrorMsg] = useState<string | null>(null)

  // Active Tab for History
  const [activeTab, setActiveTab] = useState<'boxes' | 'rewards'>('boxes')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Load active rewards catalog on mount
  useEffect(() => {
    fetchRewards()
    const savedContact = localStorage.getItem('ecorewards_contact')
    const savedName = localStorage.getItem('ecorewards_name')
    if (savedContact) {
      setClaimContact(savedContact)
      setWalletLookupInput(savedContact)
      loadCustomerWallet(savedContact)
    }
    if (savedName) {
      setClaimName(savedName)
    }
  }, [])

  // Synchronize URL ?code=... param if changes
  useEffect(() => {
    if (codeParam) {
      setClaimCode(codeParam.toUpperCase())
    }
  }, [codeParam])

  async function fetchRewards() {
    setIsLoadingRewards(true)
    try {
      const res = await fetch('/api/rewards')
      if (res.ok) {
        const data = await res.json()
        setRewards(data.rewards || [])
      }
    } catch (err) {
      console.error('Failed to fetch rewards:', err)
    } finally {
      setIsLoadingRewards(false)
    }
  }

  async function loadCustomerWallet(contactQuery: string) {
    if (!contactQuery.trim()) return
    setIsLoadingWallet(true)
    setClaimErrorMsg(null)

    try {
      const res = await fetch(`/api/customer?contact=${encodeURIComponent(contactQuery.trim())}`)
      const data = await res.json()

      if (res.ok && data.customer) {
        setCustomer(data.customer)
        setClaimedBoxes(data.claimedBoxes || [])
        setRedemptions(data.redemptions || [])
        if (data.availableRewards?.length) {
          setRewards(data.availableRewards)
        }
        setClaimName(data.customer.name)
        setClaimContact(data.customer.contact)
        localStorage.setItem('ecorewards_contact', data.customer.contact)
        localStorage.setItem('ecorewards_name', data.customer.name)
      } else {
        setCustomer(null)
        setClaimedBoxes([])
        setRedemptions([])
        if (contactQuery !== claimContact) {
          setClaimErrorMsg({
            text: data.error || 'No customer profile found for this contact yet. Claim your first box code below to activate your wallet!',
          })
        }
      }
    } catch (err) {
      console.error('Error loading wallet:', err)
    } finally {
      setIsLoadingWallet(false)
    }
  }

  // Handle Box Code Claim
  async function handleClaimCode(e: React.FormEvent) {
    e.preventDefault()
    setClaimSuccessMsg(null)
    setClaimErrorMsg(null)

    if (!claimName.trim()) {
      setClaimErrorMsg({ text: 'Please enter your name.' })
      return
    }
    if (!claimContact.trim()) {
      setClaimErrorMsg({ text: 'Please enter your phone number or email.' })
      return
    }
    if (!claimCode.trim()) {
      setClaimErrorMsg({ text: 'Please enter a 12-character box reward code.' })
      return
    }

    setIsClaiming(true)
    try {
      const res = await fetch('/api/codes/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: claimName.trim(),
          contact: claimContact.trim(),
          code: claimCode.trim().toUpperCase(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setClaimSuccessMsg({
          text: data.message || 'Points earned successfully!',
          points: data.boxCode?.pointsEarned || data.pointsEarned || 50,
          productName: data.boxCode?.productName || 'Eco-Packaged Product',
        })
        setClaimCode('')
        loadCustomerWallet(claimContact.trim())
      } else {
        setClaimErrorMsg({
          text: data.error || 'Failed to claim code.',
          reason: data.reason,
        })
      }
    } catch (err: any) {
      setClaimErrorMsg({ text: 'Network connection error. Please try again.' })
    } finally {
      setIsClaiming(false)
    }
  }

  // Handle Reward Redemption
  async function handleRedeemReward(reward: RewardItem) {
    if (!customer) {
      setRedeemErrorMsg('Please look up or activate your wallet with your phone/email first.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (customer.pointsBalance < reward.pointsCost) {
      setRedeemErrorMsg(`You need ${reward.pointsCost - customer.pointsBalance} more points to claim this reward.`)
      return
    }

    if (reward.stock <= 0) {
      setRedeemErrorMsg('Sorry, this reward is currently out of stock.')
      return
    }

    const confirmRedeem = window.confirm(
      `Redeem "${reward.title}" for ${reward.pointsCost} points? (Remaining balance will be ${customer.pointsBalance - reward.pointsCost} points)`
    )
    if (!confirmRedeem) return

    setRedeemingRewardId(reward.id)
    setRedeemSuccessMsg(null)
    setRedeemErrorMsg(null)

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          rewardId: reward.id,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setRedeemSuccessMsg(`Successfully redeemed "${reward.title}"! Order logged for fulfillment.`)
        loadCustomerWallet(customer.contact)
        fetchRewards()
      } else {
        setRedeemErrorMsg(data.error || 'Failed to redeem reward.')
      }
    } catch (err: any) {
      setRedeemErrorMsg('Network error while redeeming reward.')
    } finally {
      setRedeemingRewardId(null)
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-[#080C14]/80 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-60 blur-xs group-hover:opacity-100 transition duration-300" />
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
                <Package className="w-5 h-5 stroke-[2.2]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  EcoRewards<span className="text-emerald-400">.io</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  Verified Ledger
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Cryptographic Physical Box Loyalty & Rewards System
              </p>
            </div>
          </div>

          {/* Wallet Search / Command Bar */}
          <div className="flex-1 max-w-md hidden md:flex items-center">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                loadCustomerWallet(walletLookupInput)
              }}
              className="w-full relative flex items-center group"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="text"
                placeholder="Enter Email or Phone to check wallet..."
                value={walletLookupInput}
                onChange={(e) => setWalletLookupInput(e.target.value)}
                className="w-full pl-10 pr-24 py-2 text-xs sm:text-sm bg-slate-900/60 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-500 text-slate-200"
              />
              <button
                type="submit"
                disabled={isLoadingWallet}
                className="absolute right-1.5 px-3 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-60 shadow-sm"
              >
                {isLoadingWallet ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Check'
                )}
              </button>
            </form>
          </div>

          {/* Right Navigation & Status */}
          <div className="flex items-center gap-3">
            {customer && (
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-300 font-medium truncate max-w-[120px]">{customer.name}</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {customer.pointsBalance} PTS
                </span>
              </div>
            )}

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 rounded-xl transition-all border border-white/10 hover:border-emerald-500/30 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Factory Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Wallet Search Bar */}
      <div className="md:hidden bg-slate-950/90 px-4 py-2.5 border-b border-white/[0.08]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadCustomerWallet(walletLookupInput)
          }}
          className="relative flex items-center"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Enter Phone or Email..."
            value={walletLookupInput}
            onChange={(e) => setWalletLookupInput(e.target.value)}
            className="w-full pl-9 pr-20 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-200"
          />
          <button
            type="submit"
            disabled={isLoadingWallet}
            className="absolute right-1 px-3 py-1 text-xs font-semibold bg-emerald-500 text-slate-950 rounded-lg"
          >
            {isLoadingWallet ? '...' : 'Check'}
          </button>
        </form>
      </div>

      {/* 2. MAIN SECTION: DIGITAL WALLET & CLAIM STATION */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT: TITANIUM ECO-WALLET CARD */}
          <div className="lg:col-span-5 rounded-3xl p-7 sm:p-8 relative overflow-hidden flex flex-col justify-between border border-white/10 glass-panel shadow-2xl">
            {/* Ambient Radial Gradient Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Card Header & Chip */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 flex items-center justify-center shadow-inner border border-amber-400/60">
                    <div className="w-5 h-4 border border-amber-800/40 rounded-xs flex flex-col justify-between p-0.5">
                      <div className="h-[1px] bg-amber-800/40" />
                      <div className="h-[1px] bg-amber-800/40" />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase">
                    NFC VERIFIED
                  </span>
                </div>
                
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  {customer ? 'Titanium Partner' : 'Guest Account'}
                </span>
              </div>

              {/* Main Balance Display */}
              <div className="mb-6 space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  Available Rewards Balance
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight text-white font-mono drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    {customer ? customer.pointsBalance.toLocaleString() : '0'}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    PTS
                  </span>
                </div>
              </div>

              {/* Quick Card Metrics */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Lifetime Points
                  </p>
                  <p className="text-lg font-bold text-white font-mono mt-0.5">
                    {customer ? customer.totalEarned.toLocaleString() : '0'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Boxes Claimed
                  </p>
                  <p className="text-lg font-bold text-white font-mono mt-0.5">
                    {claimedBoxes.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Wallet Status & Actions */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              {customer ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Linked: <strong className="text-slate-200">{customer.name}</strong>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Look up phone or claim box to activate</span>
                </div>
              )}
              {customer && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('ecorewards_contact')
                    localStorage.removeItem('ecorewards_name')
                    setCustomer(null)
                    setClaimedBoxes([])
                    setRedemptions([])
                    setWalletLookupInput('')
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: NEXT-GEN BOX CODE CLAIM TERMINAL */}
          <div className="lg:col-span-7 rounded-3xl p-7 sm:p-9 glass-panel-glow border border-white/10 shadow-2xl relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                    <Box className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Box Code Verification Terminal
                    </h2>
                    <p className="text-xs text-slate-400">
                      Locate the tamper-evident cryptographic sticker inside your product packaging.
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/10">
                  SHA-256 SAFE
                </span>
              </div>

              {/* Success Notification Banner */}
              {claimSuccessMsg && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-200 flex items-start gap-3 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                      <span>+ {claimSuccessMsg.points} Points Added!</span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        INSTANT SETTLEMENT
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Verified genuine batch for <strong className="text-white">{claimSuccessMsg.productName}</strong>. Your wallet has been immediately credited.
                    </p>
                  </div>
                </div>
              )}

              {/* Error / Fraud Warning Banner */}
              {claimErrorMsg && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-200 flex items-start gap-3 animate-in fade-in duration-300">
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-rose-300 flex items-center gap-2">
                      {claimErrorMsg.reason ? `Security Shield Intercept: ${claimErrorMsg.reason}` : 'Verification Unsuccessful'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {claimErrorMsg.text}
                    </p>
                  </div>
                </div>
              )}

              {/* Code Claim Form */}
              <form onSubmit={handleClaimCode} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-900/80 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Phone Number or Email
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. alex@example.com or 555-0192"
                      value={claimContact}
                      onChange={(e) => setClaimContact(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-900/80 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      12-Character Box Reward Code
                    </label>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      FORMAT: BOX-XXXX-XXXX
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={13}
                      placeholder="BOX-XXXX-XXXX"
                      value={claimCode}
                      onChange={(e) => {
                        let val = e.target.value.toUpperCase().replace(/\s+/g, '')
                        setClaimCode(val)
                      }}
                      className="w-full px-4 py-3.5 text-base sm:text-xl font-mono font-bold tracking-widest text-emerald-400 bg-slate-950/80 border-2 border-emerald-500/40 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-slate-600 shadow-inner"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {claimCode && (
                        <button
                          type="button"
                          onClick={() => setClaimCode('')}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded-md bg-slate-800"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isClaiming}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-60 cursor-pointer"
                  >
                    {isClaiming ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Validating Cryptographic Hash with Factory Ledger...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 stroke-[2.4]" />
                        Verify & Claim Reward Points
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <p className="text-[11px] text-slate-500 text-center mt-4">
              Protected by atomic single-claim transaction locks and 10-minute automated IP rate limiting.
            </p>
          </div>
        </div>

        {/* 3. REWARDS CATALOG SHOWCASE */}
        <section className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mb-2">
                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                Curated Factory Catalog
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Redeem Exclusive Gear & Perks
              </h3>
              <p className="text-sm text-slate-400">
                Direct factory redemptions using verified box points. Fast tracked dispatch.
              </p>
            </div>
            {customer && (
              <div className="text-right hidden sm:block p-3 rounded-2xl bg-slate-900/80 border border-white/10">
                <p className="text-[10px] uppercase font-bold text-slate-400">Your Usable Balance</p>
                <p className="text-xl font-black text-emerald-400 font-mono">
                  {customer.pointsBalance.toLocaleString()} PTS
                </p>
              </div>
            )}
          </div>

          {/* Toast Notification Messages */}
          {redeemSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">{redeemSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setRedeemSuccessMsg(null)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {redeemErrorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">{redeemErrorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setRedeemErrorMsg(null)}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Rewards Grid */}
          {isLoadingRewards ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="glass-panel rounded-3xl p-6 border border-white/10 animate-pulse space-y-4">
                  <div className="w-full h-36 bg-slate-800/60 rounded-2xl" />
                  <div className="h-5 bg-slate-800/60 rounded-md w-3/4" />
                  <div className="h-4 bg-slate-800/60 rounded-md w-full" />
                  <div className="h-10 bg-slate-800/60 rounded-xl" />
                </div>
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-white/10">
              <Gift className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-300">Catalog Currently Updating</p>
              <p className="text-xs text-slate-500 mt-1">
                Factory management is curating new rewards for this season.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => {
                const currentBalance = customer?.pointsBalance || 0
                const progressPct = Math.min(100, Math.round((currentBalance / reward.pointsCost) * 100))
                const canAfford = currentBalance >= reward.pointsCost
                const isOutOfStock = reward.stock <= 0
                const pointsNeeded = Math.max(0, reward.pointsCost - currentBalance)

                return (
                  <div
                    key={reward.id}
                    className="glass-panel rounded-3xl border border-white/10 hover:border-emerald-500/40 p-6 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {reward.pointsCost} PTS
                        </span>
                        {isOutOfStock ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-300 border border-white/10">
                            {reward.stock} available
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mb-2">
                        {reward.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-6">
                        {reward.description}
                      </p>
                    </div>

                    <div>
                      {/* Goal Progress Bar */}
                      <div className="space-y-1.5 mb-5 pt-4 border-t border-white/[0.08]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Redemption Progress</span>
                          <span className="font-bold font-mono">
                            {canAfford ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Ready!
                              </span>
                            ) : (
                              <span className="text-slate-400">{pointsNeeded} pts left</span>
                            )}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              canAfford 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                : 'bg-emerald-600/70'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Claim Action Button */}
                      <button
                        type="button"
                        onClick={() => handleRedeemReward(reward)}
                        disabled={!canAfford || isOutOfStock || redeemingRewardId === reward.id}
                        className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                          canAfford && !isOutOfStock
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        {redeemingRewardId === reward.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Redeeming...
                          </>
                        ) : isOutOfStock ? (
                          'Out of Stock'
                        ) : canAfford ? (
                          <>
                            Redeem Reward <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          `Requires ${reward.pointsCost} Points`
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 4. ACTIVITY & AUDIT LEDGER TABS */}
        <section className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/[0.08]">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Wallet Activity & Verification Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Immutable record of every authenticated factory box code and reward claim.
              </p>
            </div>

            {/* Segmented Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('boxes')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'boxes'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Claimed Boxes ({claimedBoxes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rewards')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'rewards'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Redemptions ({redemptions.length})
              </button>
            </div>
          </div>

          {/* TAB 1: CLAIMED BOXES */}
          {activeTab === 'boxes' && (
            <div>
              {!customer ? (
                <div className="py-12 text-center">
                  <Box className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    No active wallet loaded
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Check your wallet using the phone/email bar above or claim your first box code.
                  </p>
                </div>
              ) : claimedBoxes.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    No box codes claimed yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Your authenticated codes will appear here once submitted.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Box Code</th>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4">Production Batch</th>
                        <th className="py-3 px-4">Points Credited</th>
                        <th className="py-3 px-4 text-right">Verification Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {claimedBoxes.map((box) => (
                        <tr key={box.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            <div className="flex items-center gap-2">
                              <span>{box.code}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(box.code)}
                                title="Copy code"
                                className="text-slate-500 hover:text-slate-300"
                              >
                                {copiedCode === box.code ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-200">
                            {box.productName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">
                            {box.batchName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              +{box.pointsEarned} PTS
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 text-xs">
                            {box.redeemedAt
                              ? new Date(box.redeemedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Recently'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REWARD REDEMPTIONS */}
          {activeTab === 'rewards' && (
            <div>
              {!customer ? (
                <div className="py-12 text-center">
                  <Gift className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    No active wallet loaded
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Look up your account to review previous physical order redemptions.
                  </p>
                </div>
              ) : redemptions.length === 0 ? (
                <div className="py-12 text-center">
                  <Gift className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    No reward redemptions yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Redeem your points from the catalog above to view fulfillment tracking.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Reward Item</th>
                        <th className="py-3 px-4">Points Spent</th>
                        <th className="py-3 px-4">Fulfillment Status</th>
                        <th className="py-3 px-4 text-right">Redeemed Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {redemptions.map((redemption) => (
                        <tr key={redemption.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-200">
                            {redemption.reward?.title || 'Reward Item'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                            {redemption.pointsSpent} PTS
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                redemption.status === 'FULFILLED'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {redemption.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 text-xs">
                            {new Date(redemption.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-white/[0.08] bg-[#060910] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 font-semibold">
            <Package className="w-4 h-4 text-emerald-400" />
            <span>EcoRewards™ Factory Box Code Engine</span>
          </div>
          <p>© {new Date().getFullYear()} Factory Loyalty Rewards System. Single-use Cryptographic Ledger.</p>
        </div>
      </footer>
    </div>
  )
}

export default function CustomerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
          <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Connecting to EcoRewards™ Ledger...
          </div>
        </div>
      }
    >
      <CustomerPortal />
    </Suspense>
  )
}
