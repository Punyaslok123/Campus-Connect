import { useState }                            from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast                                     from 'react-hot-toast';
import {
  CheckCircle, CreditCard, Clock, AlertCircle,
  Calendar, RefreshCw, Loader2, History, Check,
} from 'lucide-react';
import { subscriptionService, plansService } from '../../services/index.js';

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const BillingPage = () => {
  const [selected,  setSelected]  = useState(null);   // plan key string
  const [verifying, setVerifying] = useState(false);
  const queryClient               = useQueryClient();

  // ── Fetch plans from DB — always fresh, reflects Owner edits ──────────────
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn:  plansService.list,
    select:   r => r.data?.plans ?? [],
    staleTime: 0,
  });

  // Auto-select the highlighted plan (or first) once plans load
  if (!selected && plans.length > 0) {
    const highlighted = plans.find(p => p.highlight) ?? plans[0];
    setSelected(highlighted.key);
  }

  // ── Fetch current subscription status ─────────────────────────────────────
  const {
    data:      subData,
    isLoading: statusLoading,
    refetch:   refetchStatus,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn:  subscriptionService.getStatus,
    select:   r => r.data,
  });

  // ── Fetch billing history ─────────────────────────────────────────────────
  const {
    data: history = [],
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ['subscription-history'],
    queryFn:  () => subscriptionService.getHistory({ limit: 50 }),
    select:   r => r.data?.subscriptions ?? [],
  });

  const sub      = subData?.subscription ?? null;
  const isActive = subData?.hasActiveSubscription ?? false;
  const days     = sub?.daysRemaining != null ? sub.daysRemaining : (isActive ? 1 : 0);

  // ── Start payment flow ────────────────────────────────────────────────────
  const { mutate: startPayment, isPending } = useMutation({
    mutationFn: () => subscriptionService.createOrder({ planType: selected }),

    onSuccess: (res) => {
      const orderData = res.data;
      if (!orderData?.orderId) {
        toast.error('Invalid response from server. Please try again.');
        return;
      }

      const { orderId, amount, currency, keyId, prefill, planLabel } = orderData;

      if (typeof window.Razorpay === 'undefined') {
        toast.error('Payment SDK not loaded. Please refresh the page and try again.');
        return;
      }

      const rzp = new window.Razorpay({
        key:         keyId,
        amount,
        currency:    currency ?? 'INR',
        name:        'Campus Connect',
        description: `${planLabel} Subscription`,
        order_id:    orderId,
        prefill:     prefill ?? {},
        theme:       { color: '#2563EB' },

        handler: async (response) => {
          setVerifying(true);
          const tid = toast.loading('Verifying payment…');
          try {
            await subscriptionService.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planType:          selected,
            });
            toast.success('Subscription activated!', { id: tid });
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            queryClient.invalidateQueries({ queryKey: ['subscription-history'] });
          } catch (err) {
            const msg = err.response?.data?.message ?? 'Payment verification failed. Contact support.';
            toast.error(msg, { id: tid });
          } finally {
            setVerifying(false);
          }
        },

        modal: {
          ondismiss: () => {
            toast('Payment cancelled. Your order is saved — you can retry anytime.', { icon: 'ℹ️' });
          },
        },
      });

      rzp.open();
    },

    onError: (err) => {
      const msg = err.response?.data?.message ?? 'Could not create payment order. Please try again.';
      toast.error(msg);
    },
  });

  const busy         = isPending || verifying;
  const selectedPlan = plans.find(p => p.key === selected);

  return (
    <div className="max-w-3xl space-y-8">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription & Billing</h1>
          <p className="page-subtitle">Manage your college's Campus Connect subscription.</p>
        </div>
      </div>

      {/* ── Current subscription status card ── */}
      {statusLoading ? (
        <div className="rounded-xl border border-surface-200 p-6 animate-pulse bg-surface-50 h-28" />
      ) : isActive && sub ? (
        <div className={`rounded-xl border p-5
          ${days > 7  ? 'bg-green-50  border-green-200'  :
            days > 0  ? 'bg-amber-50  border-amber-200'  :
                        'bg-red-50    border-red-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`mt-0.5 shrink-0
              ${days > 7  ? 'text-green-600' :
                days > 0  ? 'text-amber-600' :
                            'text-red-600'}`}>
              {days > 0 ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold text-base
                  ${days > 7  ? 'text-green-700' :
                    days > 0  ? 'text-amber-700' :
                                'text-red-700'}`}>
                  {days > 0 ? `Active — ${sub.planLabel}` : 'Subscription Expired'}
                </span>
                {days > 0 && days <= 7 && (
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                    Expiring soon
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-xs text-surface-400 mb-0.5">Start date</div>
                  <div className="text-sm font-medium text-surface-700 flex items-center gap-1">
                    <Calendar size={13} className="text-surface-400" />
                    {fmt(sub.startDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-400 mb-0.5">End date</div>
                  <div className="text-sm font-medium text-surface-700 flex items-center gap-1">
                    <Calendar size={13} className="text-surface-400" />
                    {fmt(sub.endDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-400 mb-0.5">Days remaining</div>
                  <div className={`text-sm font-semibold
                    ${days > 7 ? 'text-green-700' : days > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                    {days > 0 ? `${days} day${days === 1 ? '' : 's'}` : 'Expired'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-surface-400 mb-0.5">Amount paid</div>
                  <div className="text-sm font-medium text-surface-700">
                    ₹{parseFloat(sub.amountPaid ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => refetchStatus()}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/60 text-surface-400 hover:text-surface-600 transition-colors"
              title="Refresh status">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-center gap-4">
          <Clock size={22} className="text-amber-600 shrink-0" />
          <div>
            <div className="font-semibold text-amber-700">No active subscription</div>
            <div className="text-sm text-surface-500 mt-0.5">
              Choose a plan below to activate your college on Campus Connect.
            </div>
          </div>
        </div>
      )}

      {/* ── Plan picker ── */}
      <div>
        <div className="text-base font-semibold text-surface-800 mb-1">
          {isActive ? 'Renew or Upgrade Plan' : 'Choose a Plan'}
        </div>
        <p className="text-xs text-surface-400 mb-4">
          {isActive
            ? 'Subscribing to a new plan replaces your current one from today.'
            : 'All plans include full access to every Campus Connect feature.'}
        </p>

        {plansLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border border-surface-200 p-6 text-center text-sm text-surface-400">
            No plans are currently available. Please contact support.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.map(plan => (
              <button
                key={plan.key}
                onClick={() => setSelected(plan.key)}
                disabled={busy}
                className={`relative rounded-xl border-2 p-4 text-left transition-all
                  ${selected === plan.key
                    ? 'border-primary-600 bg-primary-50 shadow-sm'
                    : 'border-surface-200 bg-white hover:border-primary-300'}
                  ${plan.highlight ? 'ring-2 ring-primary-200 ring-offset-1' : ''}
                  ${busy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                {plan.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2
                                   bg-primary-600 text-white text-[10px] font-bold
                                   px-2 py-0.5 rounded-full whitespace-nowrap">
                    Best Value
                  </span>
                )}
                <div className="font-semibold text-surface-700 text-sm">{plan.label}</div>
                <div className="text-2xl font-bold text-surface-800 mt-2">
                  ₹{plan.priceINR.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">
                  ₹{Math.round(plan.priceINR / plan.durationMonths).toLocaleString('en-IN')}/mo
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Buy button ── */}
      <div>
        <button
          onClick={() => startPayment()}
          disabled={busy || !selected || plans.length === 0}
          className="btn btn-primary btn-lg gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
          {verifying ? (
            <><Loader2 size={16} className="animate-spin" /> Verifying payment…</>
          ) : isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Creating order…</>
          ) : (
            <>
              <CreditCard size={16} />
              {isActive ? 'Renew' : 'Subscribe'}
              {selectedPlan ? ` — ₹${selectedPlan.priceINR.toLocaleString('en-IN')}` : ''}
            </>
          )}
        </button>
        <p className="text-xs text-surface-400 mt-2">
          Payments are processed securely via Razorpay. No card details stored on our servers.
        </p>
      </div>

      {/* ── Billing History ── */}
      <div className="pt-4 border-t border-surface-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-surface-800 flex items-center gap-2">
              <History size={18} className="text-primary-600" />
              Billing History
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Past subscriptions and payment logs up to {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
            </p>
          </div>
        </div>

        {historyLoading ? (
          <div className="card animate-pulse py-8 text-center text-sm text-surface-400">
            Loading billing history…
          </div>
        ) : history.length === 0 ? (
          <div className="card py-8 text-center text-sm text-surface-400">
            No billing records found.
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payment / Order ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {history.map((h) => (
                    <tr key={h._id} className="hover:bg-surface-50 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-surface-800">
                        {h.planLabel || h.planType}
                        <div className="text-[11px] text-surface-400 font-normal">
                          {h.durationMonths ? `${h.durationMonths} month${h.durationMonths > 1 ? 's' : ''}` : '—'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-surface-800">
                        ₹{parseFloat(h.amountPaid ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3.5 px-4 text-surface-600">
                        {fmt(h.startDate || h.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-surface-500 text-[11px]">
                        {h.startDate && h.endDate
                          ? `${fmt(h.startDate)} – ${fmt(h.endDate)}`
                          : fmt(h.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`badge ${
                          h.status === 'active'
                            ? 'badge-success'
                            : h.status === 'expired'
                            ? 'badge-neutral'
                            : 'badge-warning'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-surface-400 font-mono text-[11px]">
                        {h.razorpayPaymentId ? (
                          <div title="Payment ID" className="text-surface-600">{h.razorpayPaymentId}</div>
                        ) : null}
                        {h.razorpayOrderId ? (
                          <div title="Order ID" className="text-surface-400 text-[10px]">{h.razorpayOrderId}</div>
                        ) : null}
                        {!h.razorpayPaymentId && !h.razorpayOrderId ? '—' : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default BillingPage;
