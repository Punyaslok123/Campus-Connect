import { useState }                            from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast                                     from 'react-hot-toast';
import {
  CreditCard, Plus, Edit2, Trash2, Check, X,
  Star, StarOff, Eye, EyeOff, AlertTriangle,
} from 'lucide-react';
import { plansService } from '../../services/index.js';

// ── Create / Edit form ────────────────────────────────────────────────────────

const EMPTY_FORM = { key: '', label: '', durationMonths: '', priceINR: '', highlight: false, sortOrder: 0 };

const PlanForm = ({ initial = EMPTY_FORM, onSave, onCancel, isPending, isEdit }) => {
  const [form, setForm] = useState(initial);
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const valid =
    (!isEdit ? form.key.trim() : true) &&
    form.label.trim() &&
    parseInt(form.durationMonths) >= 1 &&
    parseInt(form.priceINR) >= 1;

  return (
    <div className="card space-y-4 border-primary-200 bg-primary-50/30">
      <div className="font-semibold text-surface-800 text-[13.5px]">
        {isEdit ? `Edit Plan: ${initial.label}` : 'Create New Plan'}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!isEdit && (
          <div>
            <label className="field-label">Plan key *</label>
            <input
              className="input text-sm font-mono"
              placeholder="e.g. 3y, 7y, enterprise"
              value={form.key}
              onChange={e => set('key', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            />
            <p className="text-[10px] text-surface-400 mt-0.5">Lowercase, no spaces. Used internally.</p>
          </div>
        )}

        <div className={isEdit ? 'col-span-2' : ''}>
          <label className="field-label">Display label *</label>
          <input
            className="input text-sm"
            placeholder="e.g. 1 Month, 3 Years"
            value={form.label}
            onChange={e => set('label', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">Duration (months) *</label>
          <input
            className="input text-sm"
            type="number" min="1"
            placeholder="e.g. 12"
            value={form.durationMonths}
            onChange={e => set('durationMonths', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">Price (₹ INR) *</label>
          <input
            className="input text-sm"
            type="number" min="1"
            placeholder="e.g. 3999"
            value={form.priceINR}
            onChange={e => set('priceINR', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label">Sort order</label>
          <input
            className="input text-sm"
            type="number" min="0"
            value={form.sortOrder}
            onChange={e => set('sortOrder', e.target.value)}
          />
        </div>

        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-surface-700">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-primary-600"
              checked={form.highlight}
              onChange={e => set('highlight', e.target.checked)}
            />
            Mark as "Best Value"
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>Cancel</button>
        <button
          className="btn btn-primary btn-sm gap-1"
          disabled={isPending || !valid}
          onClick={() => onSave(form)}>
          <Check size={13} /> {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
        </button>
      </div>
    </div>
  );
};

// ── Delete confirm ────────────────────────────────────────────────────────────

const DeleteConfirm = ({ plan, onConfirm, onCancel, isPending }) => (
  <div className="modal-overlay">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4 animate-fade-in">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-red-600" />
        </div>
        <div>
          <div className="font-semibold text-surface-800">Deactivate "{plan.label}"?</div>
          <p className="text-sm text-surface-500 mt-1">
            This plan will no longer appear to College Admins. Existing subscriptions are unaffected.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>Cancel</button>
        <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Deactivating…' : 'Deactivate'}
        </button>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const OwnerSubscriptions = () => {
  const qc = useQueryClient();
  const [showCreate,   setShowCreate]   = useState(false);
  const [editingKey,   setEditingKey]   = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['subscription-plans-all'] });
    qc.invalidateQueries({ queryKey: ['subscription-plans'] }); // BillingPage cache
  };

  // Owner is authenticated as 'owner' role — backend listPlans() already
  // passes includeInactive=true when req.user.role === 'owner'
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans-all'],
    queryFn:  plansService.list,
    select:   r => r.data?.plans ?? [],
  });

  const { mutate: createPlan, isPending: creating } = useMutation({
    mutationFn: plansService.create,
    onSuccess: () => { toast.success('Plan created'); setShowCreate(false); invalidate(); },
    onError:   e => toast.error(e.response?.data?.message ?? 'Failed to create plan'),
  });

  const { mutate: updatePlan, isPending: updating } = useMutation({
    mutationFn: ({ key, data }) => plansService.update(key, data),
    onSuccess: () => { toast.success('Plan updated'); setEditingKey(null); invalidate(); },
    onError:   e => toast.error(e.response?.data?.message ?? 'Failed to update plan'),
  });

  const { mutate: deletePlan, isPending: deleting } = useMutation({
    mutationFn: (key) => plansService.remove(key),
    onSuccess: () => { toast.success('Plan deactivated'); setDeletingPlan(null); invalidate(); },
    onError:   e => toast.error(e.response?.data?.message ?? 'Failed to deactivate plan'),
  });

  const { mutate: toggleActive, isPending: toggling } = useMutation({
    mutationFn: ({ key, isActive }) => plansService.update(key, { isActive }),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? 'Plan activated' : 'Plan hidden');
      invalidate();
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to toggle plan'),
  });

  const { mutate: toggleHighlight, isPending: highlighting } = useMutation({
    mutationFn: ({ key, highlight }) => plansService.update(key, { highlight }),
    onSuccess: () => { toast.success('Plan updated'); invalidate(); },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to update plan'),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {deletingPlan && (
        <DeleteConfirm
          plan={deletingPlan}
          onConfirm={() => deletePlan(deletingPlan.key)}
          onCancel={() => setDeletingPlan(null)}
          isPending={deleting}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Plans</h1>
          <p className="page-subtitle">
            Create and manage plans. Price changes apply to future purchases only.
          </p>
        </div>
        {!showCreate && (
          <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Plan
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <PlanForm
          onCancel={() => setShowCreate(false)}
          isPending={creating}
          isEdit={false}
          onSave={(form) => createPlan({
            key:            form.key,
            label:          form.label,
            durationMonths: parseInt(form.durationMonths),
            priceINR:       parseInt(form.priceINR),
            highlight:      form.highlight,
            sortOrder:      parseInt(form.sortOrder) || 0,
          })}
        />
      )}

      {/* Plans table */}
      <div className="card p-0 overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-100 px-5 py-3">
          <div className="grid grid-cols-[1fr_80px_100px_90px_120px] text-xs font-semibold text-surface-400 uppercase tracking-wide">
            <span>Plan</span>
            <span>Duration</span>
            <span>Price</span>
            <span>Per month</span>
            <span className="text-right">Actions</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="empty-state py-12">
            <div className="empty-icon"><CreditCard size={22} className="text-surface-400" /></div>
            <p className="empty-title">No plans yet</p>
            <p className="empty-body">Click "New Plan" to create the first subscription plan.</p>
          </div>
        ) : (
          plans.map(plan => {
            const isEditing = editingKey === plan.key;
            const perMonth  = plan.durationMonths > 0
              ? Math.round(plan.priceINR / plan.durationMonths)
              : plan.priceINR;

            if (isEditing) {
              return (
                <div key={plan.key} className="border-b border-surface-50 last:border-0 p-4">
                  <PlanForm
                    initial={{
                      key:            plan.key,
                      label:          plan.label,
                      durationMonths: String(plan.durationMonths),
                      priceINR:       String(plan.priceINR),
                      highlight:      plan.highlight,
                      sortOrder:      plan.sortOrder ?? 0,
                    }}
                    isEdit
                    isPending={updating}
                    onCancel={() => setEditingKey(null)}
                    onSave={(form) => updatePlan({
                      key: plan.key,
                      data: {
                        label:          form.label,
                        durationMonths: parseInt(form.durationMonths),
                        priceINR:       parseInt(form.priceINR),
                        highlight:      form.highlight,
                        sortOrder:      parseInt(form.sortOrder) || 0,
                      },
                    })}
                  />
                </div>
              );
            }

            return (
              <div
                key={plan.key}
                className={`px-5 py-4 border-b border-surface-50 last:border-0 grid grid-cols-[1fr_80px_100px_90px_120px] items-center gap-2
                  ${!plan.isActive ? 'opacity-50' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-800 text-sm">{plan.label}</span>
                    {plan.highlight && (
                      <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-semibold">
                        Best Value
                      </span>
                    )}
                    {!plan.isActive && (
                      <span className="text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full font-semibold">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-surface-400 font-mono mt-0.5">{plan.key}</div>
                </div>

                <div className="text-sm text-surface-600">
                  {plan.durationMonths}mo
                </div>

                <div className="text-sm font-semibold text-surface-800">
                  ₹{plan.priceINR.toLocaleString('en-IN')}
                </div>

                <div className="text-xs text-surface-500">
                  ₹{perMonth.toLocaleString('en-IN')}/mo
                </div>

                <div className="flex justify-end gap-1">
                  {/* Toggle highlight */}
                  <button
                    title={plan.highlight ? 'Remove Best Value badge' : 'Mark as Best Value'}
                    onClick={() => toggleHighlight({ key: plan.key, highlight: !plan.highlight })}
                    disabled={highlighting || toggling}
                    className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-amber-500 transition-colors">
                    {plan.highlight ? <Star size={13} className="fill-amber-400 text-amber-400" /> : <StarOff size={13} />}
                  </button>

                  {/* Toggle visible */}
                  <button
                    title={plan.isActive ? 'Hide from College Admins' : 'Show to College Admins'}
                    onClick={() => toggleActive({ key: plan.key, isActive: !plan.isActive })}
                    disabled={toggling || highlighting}
                    className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-colors">
                    {plan.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>

                  {/* Edit */}
                  <button
                    title="Edit plan"
                    onClick={() => { setEditingKey(plan.key); setShowCreate(false); }}
                    className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-primary-600 transition-colors">
                    <Edit2 size={13} />
                  </button>

                  {/* Deactivate/delete */}
                  <button
                    title="Deactivate plan"
                    onClick={() => setDeletingPlan(plan)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        <strong>Pricing note:</strong> Any price or duration change applies only to new purchases.
        Colleges with active subscriptions are not affected — their locked-in price and end date remain unchanged.
      </div>
    </div>
  );
};

export default OwnerSubscriptions;
