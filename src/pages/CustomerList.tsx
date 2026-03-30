import React, { useState } from "react";
import { Customer } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useCustomers } from "../hooks/useCustomers";
import { CustomerData } from "../services/customerService";

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Customer["status"] }) {
  const styles = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    inactive: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
      <svg
        className="w-12 h-12 mb-4 text-gray-300"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
        No customers yet
      </h3>
      <p className="text-sm mb-4 max-w-xs">
        Add your first customer to start creating invoices and tracking payments.
      </p>
      <button
        onClick={onAdd}
        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
      >
        Add Customer
      </button>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-red-500 font-medium mb-2">Failed to load customers</p>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────

interface AddCustomerModalProps {
  onClose: () => void;
  onSave: (data: CustomerData) => Promise<void>;
}

function AddCustomerModal({ onClose, onSave }: AddCustomerModalProps) {
  const [formData, setFormData] = useState<CustomerData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    businessName: "",
    gstin: "",
    creditDays: 0,
    outstandingAmount: 0,
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError("Name and phone are required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Add Customer
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ravi Enterprises"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((d) => ({ ...d, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={formData.businessName ?? ""}
              onChange={(e) => setFormData((d) => ({ ...d, businessName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ravi Trading Co."
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email ?? ""}
              onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="ravi@example.com"
            />
          </div>

          {/* GSTIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GSTIN
            </label>
            <input
              type="text"
              value={formData.gstin ?? ""}
              onChange={(e) => setFormData((d) => ({ ...d, gstin: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <textarea
              value={formData.address ?? ""}
              onChange={(e) => setFormData((d) => ({ ...d, address: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              placeholder="Surat, Gujarat"
            />
          </div>

          {/* Credit Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Credit Days
            </label>
            <input
              type="number"
              min={0}
              value={formData.creditDays}
              onChange={(e) =>
                setFormData((d) => ({ ...d, creditDays: parseInt(e.target.value) || 0 }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="30"
            />
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerList() {
  const { user } = useAuth();
  const merchantId = user?.uid ?? null;

  const { customers, loading, error, refetch, addCustomer } =
    useCustomers(merchantId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Client-side search filter
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.businessName?.toLowerCase().includes(q) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleAddCustomer = async (data: CustomerData) => {
    await addCustomer(data);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Customers
          </h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-0.5">
              {customers.length} {customers.length === 1 ? "customer" : "customers"}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          + Add Customer
        </button>
      </div>

      {/* Search */}
      {!error && customers.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )}

      {/* Error state */}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {/* Table */}
      {!error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    Business
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    Outstanding
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {/* Loading skeleton */}
                {loading && [...Array(5)].map((_, i) => <SkeletonRow key={i} />)}

                {/* Customer rows */}
                {!loading &&
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {customer.name}
                        </div>
                        {customer.gstin && (
                          <div className="text-xs text-gray-400 font-mono mt-0.5">
                            {customer.gstin}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {customer.phone}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {customer.businessName || "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className={
                            customer.outstandingAmount > 0
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {customer.outstandingAmount > 0
                            ? `₹${customer.outstandingAmount.toLocaleString("en-IN")}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <StatusBadge status={customer.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                          onClick={() => {
                            // wire up edit modal here
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}

                {/* No search results */}
                {!loading && searchQuery && filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No customers match "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && !searchQuery && customers.length === 0 && (
            <EmptyState onAdd={() => setShowAddModal(true)} />
          )}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddCustomer}
        />
      )}
    </div>
  );
}