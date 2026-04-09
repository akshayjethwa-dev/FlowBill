import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMerchant } from '../../context/MerchantContext';
import { useMembership } from '../../hooks/useMembership';
import { MemberRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../types/membership';
import {
  Users, UserPlus, Mail, Shield, Trash2,
  ChevronDown, Copy, Check, AlertCircle, Crown, RefreshCw
} from 'lucide-react';

const INVITABLE_ROLES: MemberRole[] = ['staff', 'accountant', 'support'];

export const TeamManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const { teamMembers, teamLoading, isOwner } = useMerchant();
  const { inviteMember, updateMemberRole, removeMember, loading, error } = useMembership();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('staff');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOwner) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Only the merchant owner can manage team members.</p>
      </div>
    );
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const result = await inviteMember(inviteEmail.trim(), inviteRole);
    if (result?.token) {
      const link = `${window.location.origin}/accept-invite?token=${result.token}`;
      setInviteLink(link);
      setInviteEmail('');
      setSuccessMsg(`Invite created for ${inviteEmail}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleChange = async (uid: string, newRole: MemberRole) => {
    const ok = await updateMemberRole(uid, newRole);
    if (ok) {
      setSuccessMsg('Role updated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleRemove = async (uid: string) => {
    const ok = await removeMember(uid);
    if (ok) {
      setConfirmRemove(null);
      setSuccessMsg('Member removed successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const getRoleBadgeColor = (role: MemberRole) => {
    const colors: Record<MemberRole, string> = {
      owner: 'bg-purple-100 text-purple-700',
      staff: 'bg-blue-100 text-blue-700',
      accountant: 'bg-emerald-100 text-emerald-700',
      support: 'bg-amber-100 text-amber-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getStatusDot = (status: string) => {
    if (status === 'active') return 'bg-green-500';
    if (status === 'invited') return 'bg-amber-400';
    return 'bg-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Team Members
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage who has access to your FlowBill workspace.</p>
        </div>
        <button
          onClick={() => { setShowInviteForm(!showInviteForm); setInviteLink(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" /> Send Invite
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="staff@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as MemberRole)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white appearance-none"
                >
                  {INVITABLE_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border border-gray-100">
            <span className="font-medium text-indigo-700">{ROLE_LABELS[inviteRole]}:</span> {ROLE_DESCRIPTIONS[inviteRole]}
          </p>
          <button
            onClick={handleInvite}
            disabled={loading || !inviteEmail.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Generate Invite Link
          </button>

          {/* Invite Link Display */}
          {inviteLink && (
            <div className="bg-white border border-green-200 rounded-xl p-3 space-y-2">
              <p className="text-xs text-green-700 font-medium">✅ Invite link generated! Share this with your team member:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-400">Link expires in 48 hours.</p>
            </div>
          )}
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {teamLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading team members...</div>
        ) : teamMembers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No team members yet. Invite your first staff or accountant.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teamMembers.map((member) => (
                <tr key={member.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700 text-sm uppercase">
                        {member.displayName?.[0] || member.email?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.displayName || '—'}</p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                      {member.uid === userProfile?.id && (
                        <span className="text-xs text-indigo-500 font-medium">(you)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {member.role === 'owner' ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${getRoleBadgeColor('owner')}`}>
                        <Crown className="w-3 h-3" /> Owner
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member.uid, e.target.value as MemberRole)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border-0 focus:outline-none cursor-pointer ${getRoleBadgeColor(member.role)}`}
                      >
                        {INVITABLE_ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(member.status)}`} />
                      <span className="capitalize text-gray-600 text-xs">{member.status}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {member.role !== 'owner' && (
                      <>
                        {confirmRemove === member.uid ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-red-600 font-medium">Remove?</span>
                            <button
                              onClick={() => handleRemove(member.uid)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >Yes</button>
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(member.uid)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role Permissions Reference */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Role Permissions Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(ROLE_DESCRIPTIONS) as MemberRole[]).map(role => (
            <div key={role} className="bg-white rounded-xl p-3 border border-gray-100">
              <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold mb-1.5 ${getRoleBadgeColor(role)}`}>
                {ROLE_LABELS[role]}
              </span>
              <p className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};