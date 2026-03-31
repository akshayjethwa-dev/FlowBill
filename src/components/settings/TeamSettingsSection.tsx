import React from 'react';
import { UserPlus, Trash2, Mail, Shield } from 'lucide-react';
import { TeamMember } from '../../types/settings';

interface Props {
  members: TeamMember[];
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
}

export function TeamSettingsSection({ members, onAddMember, onRemoveMember }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
          <p className="text-sm text-gray-500">Manage your team and their access levels.</p>
        </div>
        <button
          onClick={onAddMember}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
        >
          <UserPlus size={16} className="mr-2" />
          Invite Member
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-bottom border-gray-200">
              <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Member</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                  No team members found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail size={10} /> {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <Shield size={12} className="text-gray-400" />
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onRemoveMember(member.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
