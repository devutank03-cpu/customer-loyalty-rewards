'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import {
  ShieldAlert,
  KeyRound,
  Package,
  Layers,
  Users,
  AlertTriangle,
  Printer,
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  Lock,
  LogOut,
  ChevronDown,
  ChevronUp,
  Ban,
  RotateCcw,
  QrCode,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  PlusCircle,
  FileSpreadsheet,
  Activity,
  Radio,
  Sliders,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'

interface BatchItem {
  id: string
  name: string
  productName: string
  pointsPerCode: number
  quantity: number
  codesCount: number
  claimedCount: number
  unclaimedCount: number
  revokedCount: number
  createdAt: string
  codes?: {
    id: string
    code: string
    status: 'UNCLAIMED' | 'REDEEMED' | 'REVOKED'
    redeemedAt: string | null
    createdAt: string
  }[]
}

interface FraudLogItem {
  id: string
  attemptedCode: string
  contact: string
  reason: 'INVALID_CODE' | 'ALREADY_REDEEMED' | 'REVOKED_CODE' | 'RATE_LIMITED'
  createdAt: string
}

interface AdminOverviewData {
  metrics: {
    totalCodes: number
    redeemedCount: number
    unclaimedCount: number
    revokedCount: number
    activeCustomers: number
    totalPointsIssued: number
    totalPointsSpent: number
    currentOutstandingPoints: number
  }
  batches: BatchItem[]
  recentRedemptions: any[]
  recentFraudLogs: FraudLogItem[]
}

interface NewlyGeneratedBatch {
  id: string
  name: string
  productName: string
  pointsPerCode: number
  quantity: number
  codesSample: { id: string; code: string; status: string }[]
  totalCodesGenerated: number
  allCodes?: { code: string; url: string; qrDataUrl?: string }[]
}

export default function AdminDashboardPage() {
  // Passcode & Auth State
  const [passcode, setPasscode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true)

  // Overview Data State
  const [data, setData] = useState<AdminOverviewData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Batch Generation Form State
  const [batchName, setBatchName] = useState('')
  const [productName, setProductName] = useState('')
  const [pointsPerCode, setPointsPerCode] = useState('50')
  const [quantity, setQuantity] = useState('10')
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Generated Batch Modal / QR Print Drawer State
  const [generatedBatchModal, setGeneratedBatchModal] = useState<NewlyGeneratedBatch | null>(null)
  const [qrCodeItems, setQrCodeItems] = useState<{ code: string; url: string; qrDataUrl: string }[]>([])
  const [isGeneratingQRs, setIsGeneratingQRs] = useState(false)

  // Batch Inspector State
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)
  const [codeSearchQuery, setCodeSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNCLAIMED' | 'REDEEMED' | 'REVOKED'>('ALL')
  const [revokingCodeId, setRevokingCodeId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Check existing session on mount
  useEffect(() => {
    const savedPasscode = sessionStorage.getItem('factory_admin_passcode')
    if (savedPasscode) {
      setPasscode(savedPasscode)
      verifyAndLoadOverview(savedPasscode)
    } else {
      setIsVerifyingAuth(false)
    }
  }, [])

  async function verifyAndLoadOverview(codeToTest: string) {
    setIsLoadingData(true)
    setAuthError(null)

    try {
      const res = await fetch('/api/admin/overview', {
        headers: {
          'x-admin-passcode': codeToTest.trim(),
        },
      })

      if (res.ok) {
        const overviewData = await res.json()
        setData(overviewData)
        setIsAuthenticated(true)
        sessionStorage.setItem('factory_admin_passcode', codeToTest.trim())
      } else {
        const errData = await res.json().catch(() => ({}))
        setIsAuthenticated(false)
        sessionStorage.removeItem('factory_admin_passcode')
        setAuthError(errData.error || 'Invalid factory admin passcode.')
      }
    } catch (err: any) {
      setAuthError('Network error connecting to factory admin server.')
    } finally {
      setIsVerifyingAuth(false)
      setIsLoadingData(false)
    }
  }

  function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passcode.trim()) {
      setAuthError('Please enter the factory passcode.')
      return
    }
    verifyAndLoadOverview(passcode.trim())
  }

  function handleLogout() {
    sessionStorage.removeItem('factory_admin_passcode')
    setIsAuthenticated(false)
    setPasscode('')
    setData(null)
  }

  // Handle Generating Batch
  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault()
    setGenerateError(null)

    const numPoints = parseInt(pointsPerCode, 10)
    const numQty = parseInt(quantity, 10)

    if (!batchName.trim() || !productName.trim()) {
      setGenerateError('Batch identifier and product name are required.')
      return
    }
    if (isNaN(numPoints) || numPoints <= 0) {
      setGenerateError('Points per code must be a positive integer.')
      return
    }
    if (isNaN(numQty) || numQty <= 0 || numQty > 500) {
      setGenerateError('Quantity must be between 1 and 500.')
      return
    }

    setIsGeneratingBatch(true)

    try {
      const activePasscode = sessionStorage.getItem('factory_admin_passcode') || passcode
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-passcode': activePasscode,
        },
        body: JSON.stringify({
          name: batchName.trim(),
          productName: productName.trim(),
          pointsPerCode: numPoints,
          quantity: numQty,
        }),
      })

      const resData = await res.json()

      if (res.ok && resData.batch) {
        setBatchName('')
        setProductName('')
        verifyAndLoadOverview(activePasscode)

        const origin = window.location.origin
        const sampleList = resData.batch.codesSample || []
        const fullBatch = data?.batches.find((b) => b.id === resData.batch.id)
        const codesList = fullBatch?.codes || sampleList

        setIsGeneratingQRs(true)
        const qrList = await Promise.all(
          codesList.map(async (c: any) => {
            const scanUrl = `${origin}/?code=${encodeURIComponent(c.code)}`
            const qrDataUrl = await QRCode.toDataURL(scanUrl, {
              width: 160,
              margin: 1,
              color: { dark: '#090D16', light: '#FFFFFF' },
            })
            return {
              code: c.code,
              url: scanUrl,
              qrDataUrl,
            }
          })
        )
        setQrCodeItems(qrList)
        setIsGeneratingQRs(false)

        setGeneratedBatchModal({
          id: resData.batch.id,
          name: resData.batch.name,
          productName: resData.batch.productName,
          pointsPerCode: resData.batch.pointsPerCode,
          quantity: resData.batch.quantity,
          codesSample: resData.batch.codesSample,
          totalCodesGenerated: resData.batch.totalCodesGenerated,
        })
      } else {
        setGenerateError(resData.error || 'Failed to create batch.')
      }
    } catch (err: any) {
      setGenerateError('Network error while creating batch.')
    } finally {
      setIsGeneratingBatch(false)
    }
  }

  // Handle Revoking / Restoring Code
  async function handleToggleCodeRevoke(codeIdOrString: string, currentStatus: string) {
    const newAction = currentStatus === 'REVOKED' ? 'UNREVOKE' : 'REVOKE'
    const confirmMsg =
      newAction === 'REVOKE'
        ? `Are you sure you want to REVOKE code "${codeIdOrString}"? Box purchasers will no longer be able to claim it.`
        : `Are you sure you want to UNREVOKE and restore code "${codeIdOrString}"?`

    if (!window.confirm(confirmMsg)) return

    setRevokingCodeId(codeIdOrString)
    try {
      const activePasscode = sessionStorage.getItem('factory_admin_passcode') || passcode
      const res = await fetch(`/api/admin/codes/${encodeURIComponent(codeIdOrString)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-admin-passcode': activePasscode,
        },
        body: JSON.stringify({ action: newAction }),
      })

      if (res.ok) {
        verifyAndLoadOverview(activePasscode)
      } else {
        const errData = await res.json()
        alert(errData.error || 'Failed to update code status.')
      }
    } catch (err) {
      alert('Network error updating code status.')
    } finally {
      setRevokingCodeId(null)
    }
  }

  // Handle CSV Download
  function handleDownloadCSV() {
    if (!generatedBatchModal) return
    const currentBatch = data?.batches.find((b) => b.id === generatedBatchModal.id)
    const codes = currentBatch?.codes || generatedBatchModal.codesSample

    const origin = window.location.origin
    const header = ['Code', 'Batch Name', 'Product Name', 'Points', 'Status', 'Claim QR URL']
    const rows = codes.map((c: any) => [
      c.code,
      generatedBatchModal.name,
      generatedBatchModal.productName,
      generatedBatchModal.pointsPerCode,
      c.status,
      `${origin}/?code=${encodeURIComponent(c.code)}`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${generatedBatchModal.name}-box-codes.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // -------------------------------------------------------------------------
  // 1. PASSCODE SECURITY LOCK SCREEN
  // -------------------------------------------------------------------------
  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400 font-semibold text-sm">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Verifying factory security credentials...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Ambient Backlight */}
        <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md glass-panel-glow rounded-3xl p-8 border border-white/10 shadow-2xl relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 mx-auto">
                <KeyRound className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">
              Factory Admin Terminal
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Enter factory authorization passcode to manage cryptographic box batches and fraud defenses.
            </p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter passcode (e.g. factory2026)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full px-4 py-3.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-slate-100 placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoadingData}
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
            >
              {isLoadingData ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating Session...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Unlock Command Center
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.08] text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-emerald-400 font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Customer Loyalty Portal
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const metrics = data?.metrics || {
    totalCodes: 0,
    redeemedCount: 0,
    unclaimedCount: 0,
    revokedCount: 0,
    activeCustomers: 0,
    totalPointsIssued: 0,
    totalPointsSpent: 0,
    currentOutstandingPoints: 0,
  }

  const claimRatePct =
    metrics.totalCodes > 0
      ? Math.round((metrics.redeemedCount / metrics.totalCodes) * 100)
      : 0

  return (
    <div className="min-h-screen text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 2. ADMIN HEADER */}
      <header className="sticky top-0 z-40 bg-[#080C14]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 text-emerald-400 flex items-center justify-center shadow-xs hover:border-emerald-500/40 transition-colors"
              title="Return to Customer View"
            >
              <Package className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Factory Command Center
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ADMIN LEVEL 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Cryptographic Code Production, QR Packaging & Fraud Radar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const pass = sessionStorage.getItem('factory_admin_passcode') || passcode
                verifyAndLoadOverview(pass)
              }}
              disabled={isLoadingData}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-all border border-white/10"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 rounded-xl transition-colors border border-white/10 hover:border-emerald-500/30"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              Customer View
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/30"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Lock Terminal</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI TELEMETRY ROW */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Codes */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Total Codes Issued
                </p>
                <p className="text-3xl font-black text-white font-mono">
                  {metrics.totalCodes.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  <span className="text-emerald-400">{metrics.unclaimedCount}</span> unclaimed in circulation
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <Package className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Card 2: Redemption Rate */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Redemption Rate
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400 font-mono">
                    {claimRatePct}%
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ({metrics.redeemedCount} claimed)
                  </span>
                </div>
                <div className="w-28 h-1.5 rounded-full bg-slate-800 mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${claimRatePct}%` }}
                  />
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Card 3: Active Customers */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Active Verified Customers
                </p>
                <p className="text-3xl font-black text-white font-mono">
                  {metrics.activeCustomers.toLocaleString()}
                </p>
                <p className="text-xs text-cyan-400 font-mono mt-1">
                  {metrics.totalPointsIssued.toLocaleString()} total pts awarded
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                <Users className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Card 4: Blocked Fraud */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden group hover:border-rose-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Fraud Attempts Intercepted
                </p>
                <p className="text-3xl font-black text-rose-400 font-mono">
                  {data?.recentFraudLogs?.length || 0}
                </p>
                <p className="text-xs text-rose-400/80 font-mono mt-1">
                  {metrics.revokedCount} revoked codes on blacklist
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
                <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>
          </div>
        </section>

        {/* 4. TWO-COLUMN: BATCH GENERATION STUDIO (LEFT) & LIVE SECURITY RADAR (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* BATCH GENERATOR */}
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <PlusCircle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Generate Production Batch
                </h2>
                <p className="text-xs text-slate-400">
                  Issue cryptographic codes (`BOX-XXXX-XXXX`) and render thermal QR insert labels.
                </p>
              </div>
            </div>

            {generateError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{generateError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Batch Identifier / Lot #
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BATCH-2026-ALPHA"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 font-mono text-slate-100 placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eco Thermal Tumbler 750ml"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-100 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Points Per Box Code
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    required
                    value={pointsPerCode}
                    onChange={(e) => setPointsPerCode(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 font-mono text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Quantity of Codes (1-500)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 font-mono text-white font-bold"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-500 text-[11px]">Quick qty:</span>
                {[10, 25, 50, 100].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(String(q))}
                    className="px-2.5 py-1 rounded-md bg-slate-900 border border-white/10 text-slate-400 hover:text-white text-[11px] font-mono transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGeneratingBatch}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isGeneratingBatch ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Cryptographic Hashes...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 stroke-[2.2]" />
                      Generate Batch & Print QR Sheet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* LIVE SECURITY & FRAUD FEED */}
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl flex flex-col h-[420px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Live Security & Fraud Radar
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time intercept of duplicate claims, blacklisted codes & rate throttling.
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30">
                <Radio className="w-2.5 h-2.5 animate-pulse text-rose-400" />
                Active Radar
              </span>
            </div>

            {/* Scrollable Feed */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 divide-y divide-white/[0.04]">
              {!data?.recentFraudLogs?.length ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <ShieldCheck className="w-10 h-10 text-emerald-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">No security infractions detected</p>
                  <p className="text-[11px] text-slate-500">Ledger integrity is 100% verified.</p>
                </div>
              ) : (
                data.recentFraudLogs.map((log) => {
                  let badgeBg = 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  if (log.reason === 'INVALID_CODE') badgeBg = 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  if (log.reason === 'REVOKED_CODE') badgeBg = 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  if (log.reason === 'RATE_LIMITED') badgeBg = 'bg-red-500/15 text-red-300 border-red-500/30'

                  return (
                    <div
                      key={log.id}
                      className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${badgeBg}`}>
                            {log.reason}
                          </span>
                          <span className="font-mono font-bold text-slate-200">
                            {log.attemptedCode}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Contact: <strong className="text-slate-300 font-mono">{log.contact}</strong>
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* 5. BATCHES & CODE INSPECTOR TABLE */}
        <section className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Production Batches & Code Inspector
              </h3>
              <p className="text-xs text-slate-400">
                Inspect physical manufacturing runs, track claim ratios, and exercise owner revoke controls.
              </p>
            </div>
          </div>

          {!data?.batches?.length ? (
            <div className="py-12 text-center text-slate-500">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No production batches found</p>
              <p className="text-xs text-slate-500 mt-1">
                Create your first batch using the form above to begin code distribution.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.batches.map((b) => {
                const isExpanded = expandedBatchId === b.id
                const claimPct = b.codesCount > 0 ? Math.round((b.claimedCount / b.codesCount) * 100) : 0

                const filteredCodes = (b.codes || []).filter((c) => {
                  const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
                  const matchesSearch =
                    !codeSearchQuery || c.code.toLowerCase().includes(codeSearchQuery.toLowerCase())
                  return matchesStatus && matchesSearch
                })

                return (
                  <div
                    key={b.id}
                    className="border border-white/10 rounded-2xl overflow-hidden transition-all bg-slate-900/60"
                  >
                    {/* Batch Summary Row */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                            {b.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            +{b.pointsPerCode} pts / box
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-300">
                          {b.productName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          Issued {new Date(b.createdAt).toLocaleDateString()} • {b.quantity} codes in lot
                        </p>
                      </div>

                      {/* Claim Ratio Meter */}
                      <div className="w-full md:w-64 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Claim Ratio</span>
                          <span className="font-bold font-mono text-emerald-400">
                            {b.claimedCount} / {b.codesCount} ({claimPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                            style={{ width: `${claimPct}%` }}
                            title={`${b.claimedCount} Redeemed`}
                          />
                          {b.revokedCount > 0 && (
                            <div
                              className="h-full bg-rose-500"
                              style={{ width: `${(b.revokedCount / b.codesCount) * 100}%` }}
                              title={`${b.revokedCount} Revoked`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Inspector Toggle */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedBatchId(isExpanded ? null : b.id)}
                          className="w-full md:w-auto px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700/80 border border-white/10 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        >
                          {isExpanded ? (
                            <>
                              Hide Codes <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Inspect ({b.codes?.length || b.codesCount}){' '}
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Codes Inspector Panel */}
                    {isExpanded && (
                      <div className="p-4 sm:p-6 border-t border-white/[0.08] bg-slate-950/80 space-y-4">
                        {/* Search & Filters */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search code..."
                              value={codeSearchQuery}
                              onChange={(e) => setCodeSearchQuery(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-lg font-mono focus:outline-none focus:border-emerald-500 text-slate-200 placeholder:text-slate-600"
                            />
                          </div>

                          <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto text-xs">
                            {(['ALL', 'UNCLAIMED', 'REDEEMED', 'REVOKED'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setStatusFilter(st)}
                                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                                  statusFilter === st
                                    ? 'bg-emerald-500 text-slate-950 font-bold'
                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Codes Table */}
                        <div className="overflow-x-auto border border-white/[0.08] rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider font-semibold border-b border-white/[0.08]">
                                <th className="py-2.5 px-3">Code String</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3">Redeemed At</th>
                                <th className="py-2.5 px-3 text-right">Owner Control Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                              {filteredCodes.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center text-slate-500">
                                    No codes match the selected filter.
                                  </td>
                                </tr>
                              ) : (
                                filteredCodes.map((codeItem) => (
                                  <tr key={codeItem.id} className="hover:bg-white/[0.02]">
                                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                                      <div className="flex items-center gap-2">
                                        <span>{codeItem.code}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(codeItem.code)}
                                          title="Copy code"
                                          className="text-slate-500 hover:text-slate-300"
                                        >
                                          {copiedCode === codeItem.code ? (
                                            <Check className="w-3 h-3 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span
                                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          codeItem.status === 'UNCLAIMED'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                            : codeItem.status === 'REDEEMED'
                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                        }`}
                                      >
                                        {codeItem.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                                      {codeItem.redeemedAt
                                        ? new Date(codeItem.redeemedAt).toLocaleString([], {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : '—'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        type="button"
                                        disabled={revokingCodeId === codeItem.code}
                                        onClick={() => handleToggleCodeRevoke(codeItem.code, codeItem.status)}
                                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                          codeItem.status === 'REVOKED'
                                            ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                                            : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                                        }`}
                                      >
                                        {revokingCodeId === codeItem.code ? (
                                          'Updating...'
                                        ) : codeItem.status === 'REVOKED' ? (
                                          <span className="flex items-center gap-1">
                                            <RotateCcw className="w-3 h-3" /> Restore Code
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1">
                                            <Ban className="w-3 h-3" /> Revoke
                                          </span>
                                        )}
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* 6. MODAL: PRINTABLE QR LABELS & CSV EXPORT */}
      {generatedBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D1424] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Batch Created: {generatedBatchModal.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {generatedBatchModal.quantity} codes ready for box packaging inserts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedBatchModal(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions Bar */}
            <div className="px-6 py-3.5 bg-slate-950/60 border-b border-white/[0.08] flex items-center justify-between gap-3 no-print">
              <p className="text-xs text-slate-400 font-medium">
                Production export tools:
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print QR Box Inserts
                </button>
              </div>
            </div>

            {/* Modal Body / Printable Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isGeneratingQRs ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Rendering print-ready QR vectors...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {qrCodeItems.map((item) => (
                    <div
                      key={item.code}
                      className="border-2 border-dashed border-emerald-500/40 rounded-2xl p-4 bg-white text-slate-900 flex flex-col items-center text-center justify-between shadow-sm break-inside-avoid"
                    >
                      {/* Top Brand Banner */}
                      <div className="w-full border-b border-slate-200 pb-2 mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black tracking-tight text-slate-900 uppercase">
                          EcoRewards™ Official
                        </span>
                        <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          +{generatedBatchModal.pointsPerCode} PTS
                        </span>
                      </div>

                      {/* QR Vector Image */}
                      {item.qrDataUrl && (
                        <img
                          src={item.qrDataUrl}
                          alt={item.code}
                          className="w-28 h-28 my-1"
                        />
                      )}

                      {/* Code string */}
                      <div className="my-1">
                        <p className="text-sm font-mono font-black tracking-widest text-slate-900">
                          {item.code}
                        </p>
                        <p className="text-[9px] text-slate-600 font-medium">
                          {generatedBatchModal.productName}
                        </p>
                      </div>

                      {/* Instructions */}
                      <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">
                        Scan QR or enter code at website to redeem
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.08] flex justify-end no-print">
              <button
                type="button"
                onClick={() => setGeneratedBatchModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
