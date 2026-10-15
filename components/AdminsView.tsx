import React, { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, Mail, CheckCircle2, AlertCircle, HelpCircle, Save, Edit3, X, Briefcase } from 'lucide-react';
import { useToast } from '../lib/useToast';
import { useDialog } from '../lib/useDialog';
import { formatId } from '../lib/formatId';
import { PolicyFAQ } from '../types';

const ALL_DEPARTMENTS = [
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'notifications', label: 'Notifications' },
];

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  department: string[];
  createdAt: string;
}

interface AdminsViewProps {
  policies?: PolicyFAQ[];
  onUpdatePolicies?: (updatedPolicies: PolicyFAQ[]) => void;
  onAddActivity?: (type: 'tenant' | 'billing' | 'addon' | 'ticket' | 'notification', action: string, details: string) => void;
}

export default function AdminsView({ policies = [], onUpdatePolicies, onAddActivity }: AdminsViewProps = {}) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const { showToast, ToastElement } = useToast();
  const { confirmDialog, DialogElement } = useDialog();

  // Department editing state
  const [editingDeptAdmin, setEditingDeptAdmin] = useState<AdminUser | null>(null);
  const [editingDeptValues, setEditingDeptValues] = useState<string[]>([]);
  const [savingDept, setSavingDept] = useState(false);

  const handleEditDepartment = (admin: AdminUser) => {
    setEditingDeptAdmin(admin);
    setEditingDeptValues(Array.isArray(admin.department) ? [...admin.department] : []);
  };

  const handleSaveDepartment = async () => {
    if (!editingDeptAdmin) return;
    setSavingDept(true);
    try {
      const res = await fetch(`/api/admins/${editingDeptAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: editingDeptValues }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAdmins(prev => prev.map(a => a.id === editingDeptAdmin.id ? { ...a, department: updated.department || editingDeptValues } : a));
        showToast('Department access updated successfully!', 'success');
        setEditingDeptAdmin(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update department', 'error');
      }
    } catch (err) {
      showToast('Network error updating department', 'error');
    } finally {
      setSavingDept(false);
    }
  };

  // CMS state
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('Security Deposit');

  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  // Add new FAQ
  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      showToast('Please fill in both question and answer.', 'error');
      return;
    }

    const newFaq: PolicyFAQ = {
      id: `FAQ-${Math.floor(100 + Math.random() * 900)}`,
      category: newCategory,
      question: newQuestion,
      answer: newAnswer
    };

    if (onUpdatePolicies) {
      onUpdatePolicies([...policies, newFaq]);
    }
    if (onAddActivity) {
      onAddActivity(
        'notification',
        'Added Policy FAQ Item',
        `CMS: Added new FAQ entry under "${newCategory}".`
      );
    }

    setNewQuestion('');
    setNewAnswer('');
    setShowAddFaqModal(false);
  };

  // Remove FAQ
  const handleDeleteFaq = async (id: string) => {
    const isConfirmed = await confirmDialog("Delete FAQ", "Are you sure you want to remove this Policy/FAQ entry?");
    if (isConfirmed) {
      if (onUpdatePolicies) {
        onUpdatePolicies(policies.filter(p => p.id !== id));
      }
      if (onAddActivity) {
        onAddActivity(
          'notification',
          'Removed Policy FAQ Item',
          `CMS: Removed FAQ item ${id}.`
        );
      }
    }
  };

  // Open Edit FAQ mode
  const handleStartEdit = (p: PolicyFAQ) => {
    setEditingFaqId(p.id);
    setEditQuestion(p.question);
    setEditAnswer(p.answer);
  };

  // Save edited FAQ
  const handleSaveEditFaq = (id: string) => {
    if (onUpdatePolicies) {
      onUpdatePolicies(policies.map(p => {
        if (p.id === id) {
          return { ...p, question: editQuestion, answer: editAnswer };
        }
        return p;
      }));
    }
    if (onAddActivity) {
      onAddActivity(
        'notification',
        'Modified Policy FAQ Item',
        `CMS: Updated policy "${editQuestion.substring(0, 30)}...".`
      );
    }
    setEditingFaqId(null);
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admins');
      if (res.ok) {
        setAdmins(await res.json());
      }
    } catch (err) {
      showToast('Failed to load admins', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUserRole(data.user.role);
        setCurrentUserId(data.user.id);
      }
    } catch (err) {
      console.error('Failed to get current user info');
    }
  };

  useEffect(() => {
    fetchMe().then(fetchAdmins);
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch('/api/admins/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, department: inviteDepartment }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Invitation sent successfully!', 'success');
        setInviteEmail('');
        setInviteDepartment([]);
        fetchAdmins();
      } else {
        showToast(data.error || 'Failed to send invite', 'error');
      }
    } catch (err) {
      showToast('Network error sending invite', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirmDialog("Revoke Access", "Are you sure you want to revoke access for this admin?");
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Admin access revoked', 'success');
        setAdmins(admins.filter(a => a.id !== id));
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to revoke admin', 'error');
      }
    } catch (err) {
      showToast('Network error revoking admin', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {ToastElement}
      <DialogElement />
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold font-serif text-brand-dark">Staff & Admins</h2>
          <p className="text-sm text-brand-secondary mt-1">Manage sub-admins and super-admin access.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-brand-secondary">Loading admins...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-brand-surface text-brand-secondary text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Department</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {admins.map(admin => (
                    <tr key={admin.id} className="hover:bg-brand-bg/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs mr-3">
                            {admin.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-brand-dark">{admin.fullName}</p>
                            <p className="text-xs text-brand-secondary">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          admin.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 'bg-brand-surface text-brand-primary'
                        }`}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {admin.role === 'super_admin' ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">All Access</span>
                        ) : (admin.department && admin.department.length > 0) ? (
                          <div className="flex flex-wrap gap-1">
                            {admin.department.map(dept => (
                              <span key={dept} className="text-[10px] font-bold text-brand-primary bg-brand-surface border border-brand-border px-2 py-0.5 rounded-full capitalize">{dept}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-brand-stone italic">None assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {admin.status === 'active' ? (
                          <span className="flex items-center text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center text-xs text-amber-600 font-medium">
                            <AlertCircle className="h-3 w-3 mr-1" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {currentUserRole === 'super_admin' && admin.id !== currentUserId && (
                          <div className="flex items-center justify-end gap-1">
                            {admin.role !== 'super_admin' && (
                              <button
                                onClick={() => handleEditDepartment(admin)}
                                className="text-brand-primary hover:text-brand-dark p-1 rounded transition-colors"
                                title="Edit Department"
                              >
                                <Briefcase className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(admin.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors"
                              title="Revoke Access"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-2xl border border-brand-border p-6 sticky top-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-10 w-10 bg-brand-surface text-brand-primary rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-brand-dark">Invite Admin</h3>
                <p className="text-xs text-brand-secondary">Send dashboard access</p>
              </div>
            </div>

            {currentUserRole === 'super_admin' ? (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brand-stone uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-brand-stone" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="admin@sevenrocks.com"
                      className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-stone uppercase tracking-wider mb-2">Department Access</label>
                  <div className="space-y-2">
                    {ALL_DEPARTMENTS.map(dept => (
                      <label key={dept.key} className="flex items-center gap-2 text-xs font-medium text-brand-dark cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={inviteDepartment.includes(dept.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteDepartment(prev => [...prev, dept.key]);
                            } else {
                              setInviteDepartment(prev => prev.filter(d => d !== dept.key));
                            }
                          }}
                          className="rounded border-brand-border text-brand-primary focus:ring-brand-primary h-3.5 w-3.5 accent-[#5C5C3D]"
                        />
                        {dept.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-brand-stone mt-1.5">Controls which sections this admin can access.</p>
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="w-full bg-brand-primary hover:bg-brand-dark text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : (
                    <>
                      <Plus className="h-4 w-4 mr-2" /> Invite Sub-Admin
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-sm text-brand-secondary p-4 bg-brand-surface rounded-xl text-center">
                Only super admins can invite new team members.
              </div>
            )}
          </div>
        </div>
      </div>

      {currentUserRole === 'super_admin' && (
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-6 mt-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border pb-4">
            <div>
              <h4 className="font-bold text-brand-dark text-sm font-serif">Seven Rocks Resident FAQ & Policies CMS</h4>
              <p className="text-[10px] text-brand-stone font-medium">Publish, edit, and refresh handbook guidelines rendered directly in user portals</p>
            </div>
            <button
              onClick={() => setShowAddFaqModal(true)}
              className="px-3.5 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Policy FAQ</span>
            </button>
          </div>
          <div className="space-y-4">
            {policies.map((p) => {
              const isEditing = editingFaqId === p.id;
              return (
                <div 
                  key={p.id} 
                  className="p-4 bg-brand-surface/40 rounded-2xl border border-brand-border flex flex-col md:flex-row justify-between gap-4 hover:bg-brand-surface transition-colors animate-fade-in"
                >
                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-extrabold bg-brand-bg text-brand-secondary border border-brand-border px-2 py-0.5 rounded uppercase">
                        {p.category}
                      </span>
                      <span className="text-[9px] text-brand-stone font-mono font-bold">{formatId(p.id)}</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          className="w-full bg-white border border-brand-border rounded p-2 text-xs font-bold text-brand-dark focus:ring-1 focus:ring-brand-primary focus:outline-none"
                        />
                        <textarea
                          rows={3}
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          className="w-full bg-white border border-brand-border rounded p-2 text-xs text-brand-secondary leading-relaxed font-medium focus:ring-1 focus:ring-brand-primary focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <h5 className="font-bold text-brand-dark text-[13px] flex items-center gap-1">
                          <HelpCircle className="h-4 w-4 text-brand-primary shrink-0" />
                          {p.question}
                        </h5>
                        <p className="text-brand-secondary leading-relaxed mt-1.5 pl-5 font-medium">
                          {p.answer}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center md:flex-col justify-end gap-2 text-xs">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEditFaq(p.id)}
                          className="px-3 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditingFaqId(null)}
                          className="p-1.5 bg-white border border-brand-border hover:bg-brand-surface text-brand-secondary rounded-lg cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="px-3 py-1.5 bg-white hover:bg-brand-surface border border-brand-border text-brand-secondary font-bold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteFaq(p.id)}
                          className="p-1.5 bg-white hover:bg-rose-50/50 border border-brand-border text-rose-700 rounded-lg transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDeptAdmin && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-brand-border max-w-sm w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-brand-dark text-base font-serif">Edit Department Access</h3>
                <p className="text-xs text-brand-stone mt-1">{editingDeptAdmin.fullName} &middot; {editingDeptAdmin.email}</p>
              </div>
              <button onClick={() => setEditingDeptAdmin(null)} className="text-brand-stone hover:text-brand-dark cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {ALL_DEPARTMENTS.map(dept => (
                <label key={dept.key} className="flex items-center gap-3 text-sm font-medium text-brand-dark cursor-pointer select-none p-2 rounded-lg hover:bg-brand-surface transition-colors">
                  <input
                    type="checkbox"
                    checked={editingDeptValues.includes(dept.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditingDeptValues(prev => [...prev, dept.key]);
                      } else {
                        setEditingDeptValues(prev => prev.filter(d => d !== dept.key));
                      }
                    }}
                    className="rounded border-brand-border text-brand-primary focus:ring-brand-primary h-4 w-4 accent-[#5C5C3D]"
                  />
                  {dept.label}
                </label>
              ))}
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setEditingDeptAdmin(null)}
                className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDepartment}
                disabled={savingDept}
                className="flex-1 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingDept ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise New FAQ Modal Dialog */}
      {showAddFaqModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-brand-border max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-brand-dark text-base font-serif">Create Policy Entry</h3>
                <p className="text-xs text-brand-stone">Add handbook / FAQ guideline for user portals</p>
              </div>
              <button 
                onClick={() => setShowAddFaqModal(false)}
                className="text-brand-stone hover:text-brand-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddFaq} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">FAQ Group Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="Surcharges & Fees">Surcharges & Fees</option>
                  <option value="Security Deposit">Security Deposit</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Community Guidelines">Community Guidelines</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Question / Policy Header</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Guest Overnight policy guidelines"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder-brand-stone/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Policy Answer Detail</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Draft clear, unambiguous responses or regulations explaining tenant guidelines."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary leading-relaxed placeholder-brand-stone/50"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFaqModal(false)}
                  className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Publish FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
