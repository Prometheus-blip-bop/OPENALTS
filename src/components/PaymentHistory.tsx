import React, { useEffect, useState, useMemo } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  serverTimestamp, 
  setDoc,
  query,
  orderBy
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { Payment } from "../types";
import { 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  ArrowRight,
  Receipt,
  FileText
} from "lucide-react";

// Firestore error helper in compliance with firebase-integration skill specifications
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('[Firestore Error Details]: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface PaymentHistoryProps {
  userId?: string;
}

export default function PaymentHistory({ userId }: PaymentHistoryProps) {
  const activeUserId = userId || auth.currentUser?.uid || "";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gatewayFilter, setGatewayFilter] = useState<string>("all");

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPlan, setSimPlan] = useState<"pro" | "enterprise">("pro");
  const [simStatus, setSimStatus] = useState<"captured" | "failed">("captured");
  const [simGateway, setSimGateway] = useState<"Razorpay" | "Stripe">("Razorpay");

  // Fetch payments in real-time
  useEffect(() => {
    if (!activeUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const path = `users/${activeUserId}/payments`;
    
    // Create query to fetch payments ordered by creation date descending
    const paymentsRef = collection(db, "users", activeUserId, "payments");
    const q = query(paymentsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Payment[] = [];
        snapshot.forEach((docSnap) => {
          const val = docSnap.data();
          list.push({
            id: docSnap.id,
            amount: val.amount ?? 0,
            currency: val.currency ?? "USD",
            status: val.status ?? "unknown",
            plan: val.plan,
            gateway: val.gateway,
            orderId: val.orderId,
            createdAt: val.createdAt,
          });
        });
        setPayments(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading payment history:", err);
        setError("Missing or insufficient permissions. Verify your login state and database access.");
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.GET, path);
        } catch (wrappedErr) {
          // Keep logging details
        }
      }
    );

    return () => unsubscribe();
  }, [activeUserId]);

  // Handle simulation trigger to add a payment securely under the rules
  const handleSimulatePayment = async () => {
    if (!activeUserId) {
      alert("Please log in first to write test simulation data.");
      return;
    }

    setIsSimulating(true);
    const amount = simPlan === "pro" ? 14 : 29;
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const fields = {
      id: `PAY-${randomSuffix}`,
      amount,
      currency: "USD",
      status: simStatus,
      plan: simPlan === "pro" ? "Alt Pro" : "Product Scale Elite",
      gateway: simGateway,
      orderId: `ORD-${randomSuffix}`,
      createdAt: new Date(), // Stored as a timestamp
    };

    const docId = `PAY-${randomSuffix}`;
    const targetPath = `users/${activeUserId}/payments/${docId}`;

    try {
      // Use setDoc with a specific custom id check to ensure rules isValidId passes on document ID
      const paymentDocRef = doc(db, "users", activeUserId, "payments", docId);
      await setDoc(paymentDocRef, fields);
      
      setIsSimulating(false);
    } catch (err) {
      console.error("Simulation write failed:", err);
      alert("Relational security guards rejected this client write. Check your payload integrity or auth state.");
      setIsSimulating(false);
      try {
        handleFirestoreError(err, OperationType.WRITE, targetPath);
      } catch (wrappedErr) {
        // Silently caught after printing parameters
      }
    }
  };

  // Filter & Search processed list
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Search match
      const searchableStr = `${p.id} ${p.orderId || ""} ${p.plan || ""}`.toLowerCase();
      const matchesSearch = searchableStr.includes(searchTerm.toLowerCase());

      // Status match
      const matchesStatus = statusFilter === "all" || p.status.toLowerCase() === statusFilter.toLowerCase();

      // Gateway match
      const matchesGateway = gatewayFilter === "all" || p.gateway?.toLowerCase() === gatewayFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesGateway;
    });
  }, [payments, searchTerm, statusFilter, gatewayFilter]);

  // Format Helper
  const formatDateTime = (createdAt: any) => {
    if (!createdAt) return "N/A";
    
    // Check if it is a Firestore Timestamp
    if (createdAt.toDate && typeof createdAt.toDate === "function") {
      return createdAt.toDate().toLocaleString();
    }
    
    // Check if it is a standard Date/Seconds object
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleString();
    }

    // Fallback date parser
    try {
      return new Date(createdAt).toLocaleString();
    } catch (e) {
      return String(createdAt);
    }
  };

  const getStatusClasses = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "captured":
      case "completed":
      case "success":
      case "paid":
        return "bg-emerald-100 text-emerald-800 border-emerald-500 uppercase";
      case "failed":
      case "cancelled":
        return "bg-rose-100 text-rose-800 border-rose-500 uppercase";
      case "pending":
      case "authorized":
        return "bg-amber-100 text-amber-800 border-amber-500 uppercase";
      default:
        return "bg-zinc-100 text-zinc-800 border-zinc-500 uppercase";
    }
  };

  const getGatewayBadge = (gateway?: string) => {
    if (!gateway) return "Custom";
    return gateway;
  };

  return (
    <div id="payment-history-widget" className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-sans font-black text-base text-black uppercase tracking-tight flex items-center gap-2">
          <Receipt className="h-5 w-5 text-stone-800" />
          <span>Billing & Invoice History</span>
        </h3>
        <p className="text-stone-500 text-xs font-semibold">
          Review your connected subscriptions, platform credits, and transaction invoices.
        </p>
      </div>

      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="bg-white border-4 border-black p-4 rounded-lg shadow-[4.5px_4.5px_0_0_#000000] flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Payment/Order ID or plan name..."
              className="w-full text-xs font-medium pl-9 pr-3 py-2 border-2 border-black rounded bg-white focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-stone-600 bg-stone-100 px-2 rounded border border-stone-300">
              <Filter className="h-3 w-3" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-black bg-white border-2 border-black rounded p-1.5 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="captured">Captured / Success</option>
              <option value="failed">Failed / Cancelled</option>
            </select>

            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="text-xs font-black bg-white border-2 border-black rounded p-1.5 focus:outline-none"
            >
              <option value="all">All Methods</option>
              <option value="Razorpay">Razorpay</option>
              <option value="Stripe">Stripe</option>
            </select>
          </div>
        </div>

        {/* Payment History Lists */}
        <div className="bg-white border-4 border-black p-4 rounded-lg shadow-[4.5px_4.5px_0_0_#000000] min-h-[180px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-500 font-mono text-xs">
              <RefreshCw className="h-8 w-8 animate-spin mb-3 text-stone-800" />
              <p>Establishing encrypted stream to Firestore...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-rose-50 border-2 border-dashed border-rose-300 rounded-lg text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-rose-600" />
              <p className="text-xs font-black text-rose-800 uppercase">Permission Authorization Denial</p>
              <p className="text-[11px] text-stone-600 max-w-sm leading-relaxed font-mono">
                {error}
              </p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-stone-55 border-2 border-dashed border-stone-200 rounded-lg">
              <Receipt className="h-10 w-10 text-stone-400 mb-2 stroke-1" />
              <p className="text-xs font-black uppercase text-stone-600">No Transaction Records Found</p>
              <p className="text-[10px] text-stone-500 max-w-xs leading-relaxed mt-1">
                Any active checkout upgrades or top-up invoices will be securely recorded here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-1">
              {filteredPayments.map((p) => (
                <div 
                  key={p.id} 
                  className="border-2 border-black p-3.5 bg-[#fffdf5] rounded shadow-[2.5px_2.5px_0_0_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3.5px_3.5px_0_0_#000000] transition-all flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1 select-all">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-black text-[#1d4ed8] bg-[#eff6ff] px-2 py-0.5 rounded border border-[#bfdbfe]">
                        {p.id}
                      </span>
                      
                      {p.plan && (
                        <span className="bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.2 rounded font-black text-[9px] uppercase tracking-wider">
                          ✨ {p.plan}
                        </span>
                      )}

                      <span className="bg-stone-100 text-stone-700 font-mono text-[9px] font-black tracking-normal px-1.5 py-0.2 border border-stone-300 rounded">
                        {getGatewayBadge(p.gateway)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1 mt-1 text-[11px] font-medium text-stone-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0 text-stone-400" />
                        <span>{formatDateTime(p.createdAt)}</span>
                      </div>
                      {p.orderId && (
                        <div className="flex items-center gap-1 font-mono text-[10px] truncate leading-none">
                          <span className="text-stone-400">Order:</span>
                          <span className="text-stone-800 font-bold truncate">{p.orderId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-stone-200/50 shrink-0">
                    <div>
                      <p className="text-[9px] font-mono text-stone-500 font-semibold uppercase leading-none mb-0.5">Total Paid</p>
                      <p className="font-sans font-black text-sm text-black tracking-tight leading-none">
                        {p.currency === "INR" ? "₹" : "$"}
                        {p.amount.toFixed(2)}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 text-[9px] font-mono font-black border-2 rounded shadow-[1px_1px_0_0_#000000] flex items-center gap-1 ${getStatusClasses(p.status)}`}>
                      {p.status.toLowerCase() === "captured" || p.status.toLowerCase() === "completed" || p.status.toLowerCase() === "paid" || p.status.toLowerCase() === "success" ? (
                        <CheckCircle2 className="h-3 w-3 stroke-[2px]" />
                      ) : (
                        <XCircle className="h-3 w-3 stroke-[2px]" />
                      )}
                      <span>{p.status}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
