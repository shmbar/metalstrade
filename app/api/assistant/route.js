export const dynamic = 'force-dynamic';
import OpenAI from 'openai';
import { guardAiRequest, sseErrorResponse } from '../../../utils/aiGuard';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

const SYSTEM_PROMPT = `You are an intelligent assistant for IMS (Inventory Management System) - a metals trading and inventory management platform.

## SYSTEM OVERVIEW
This IMS manages: Contracts (purchase orders), Invoices (sales), Expenses, Stocks/Inventory, and Margins/Profit tracking.

## DATA TOOLS — ALWAYS use these for data questions. NEVER guess numbers.
- get_overdue_invoices — outstanding receivables split into two clear categories: DUE invoices (past due date, urgent) and BALANCE invoices (final invoices with balance but not yet due). Per-currency totals included.
- get_pending_invoices — final invoices not yet fully paid (Unpaid or Partially Paid)
- get_client_debt_ranking — clients ranked by total outstanding balance due (answers "who owes the most?")
- get_revenue_summary — total sales from all final invoices by currency (invoiced total, collected, outstanding); accepts optional year filter
- get_contract_status_breakdown — count of contracts by status (Shipped / Not Shipped / Partly Shipped / Finished / Closed / Unsold)
- get_recent_contracts — list of recent contracts
- get_expense_summary — total expenses by currency
- get_unpaid_expenses — expenses not yet marked as paid
- get_profit_info — profit and margin data (answers "what is my profit?")
- get_stock_summary — current inventory levels
- get_client_invoices — all invoices for a specific client by name (answers "show invoices for [client]", "what does [client] owe?")
- get_record_by_number — look up a specific invoice by number or contract by PO number (answers "show invoice #12", "find PO-2025-001")
- get_shipment_status — ETD/ETA/status for active shipments (answers "where are my shipments?", "what is the ETA?")
- get_monthly_sales — sales broken down by month for a given year (answers "show monthly sales", "compare this month to last month")
- get_supplier_summary — contracts grouped by supplier with counts and values (answers "top suppliers", "which supplier do we buy from most?")
- get_cash_forecast — projected cash inflow/outflow for next 30/60/90 days (answers "what's my cash forecast?", "any cash crunch coming?")
- get_margin_alerts — items whose total margin (profit) is at/below the saved threshold (answers "any margin alerts?", "which items are losing money?")
- get_recent_reminders — payment reminders sent recently (answers "who got a reminder this week?", "show recent reminders")

## DATA MODEL FACTS (important for accurate answers)
- Invoice status = Draft / Final / Canceled (from finalization flags, NOT payment)
- Invoice payment status = Paid / Partially Paid / Unpaid (from payments array vs totalAmount)
- "Outstanding balance" on an invoice = totalAmount minus all recorded payments
- Contract status values: Shipped, Not Shipped, Partly Shipped, Finished, Closed, Unsold, Open (Open = no status set yet via PnL tab)
- Expense paid status comes from settings labels — check the "paid" field label, not a hardcoded value

## WORKFLOW GUIDANCE
- Create contract: Contracts → "Add Contract" → fill supplier, date, products, pricing
- Create invoice: Invoices → "Add Invoice" → select client, add products, set payment terms
- Add expense: Expenses → "Add Expense" → enter details, optionally link to contract
- Manage settings: Settings → add/edit suppliers, clients, shipment types

## NAVIGATION
/contracts, /invoices, /expenses, /stocks, /margins, /dashboard, /cashflow, /settings, /analysis

## RESPONSE RULES
1. Keep responses short — this is a chat widget
2. NEVER use markdown tables
3. Use bullet points with "•" for lists, numbered steps for workflows
4. Use **bold** sparingly
5. Under 300 words when possible
6. Always use tools for data questions — never invent numbers
7. PRESERVE key tool data verbatim: when a tool returns a line containing "Nd overdue" (days overdue counter), keep that exact "Nd overdue" annotation in every bullet you show — do NOT drop or rephrase it. Same rule for explicit currency amounts and invoice numbers.
8. If a tool returns multiple sections (e.g. "🔴 DUE INVOICES" and "🟡 BALANCE INVOICES"), keep the section headers and their per-section totals. Don't merge them into one list.`;

// OpenAI tool definitions
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_overdue_invoices',
            description: 'Outstanding receivables split into two categories: (1) DUE invoices — past their delivery/due date (urgent), and (2) BALANCE invoices — final invoices with outstanding balance but not yet due. Answers "show due invoices", "show balance invoices", "show overdue invoices", "what is unpaid?", "who hasn\'t paid?", "show outstanding receivables"',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_pending_invoices',
            description: 'Get all unpaid invoices that are not canceled',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_client_debt_ranking',
            description: 'Rank clients by their total outstanding unpaid invoice balance — answers "which client owes the most?"',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_revenue_summary',
            description: 'Get total sales from all final invoices — use for "what are my sales", "last year revenue", "total invoiced". Pass year (e.g. 2025) to filter by that year only.',
            parameters: {
                type: 'object',
                properties: {
                    year: { type: 'number', description: 'Filter by invoice year, e.g. 2025 for last year, 2026 for this year' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_contract_status_breakdown',
            description: 'Get a count of contracts grouped by their status',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_recent_contracts',
            description: 'Get a list of the most recent contracts',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number', description: 'How many to return (default 10)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_expense_summary',
            description: 'Get total expenses grouped by currency',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_unpaid_expenses',
            description: 'Get all expenses that have not been paid yet',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_profit_info',
            description: 'Get profit and margin data — answers "what is my profit this month?" or "show my margins"',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_stock_summary',
            description: 'Get a summary of current stock and inventory levels',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_client_invoices',
            description: 'Get all invoices for a specific client by name (matches both full company name and nickname, partial / tokenized match). Answers "show invoices for ABC Corp", "what does XYZ owe?", "show unpaid invoices to Prime Metals", "Iberinox invoices". Each line includes outstanding balance, payment status, and days-overdue if applicable.',
            parameters: {
                type: 'object',
                properties: {
                    client_name: { type: 'string', description: 'Client name to search for. Matches full company name OR nickname, partial OK. Use the name as the user typed it.' }
                },
                required: ['client_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_shipment_status',
            description: 'Get shipment tracking info — ETD, ETA, status for active shipments. Answers "where are my shipments?", "what is the ETA?", "which shipments are in transit?"',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_monthly_sales',
            description: 'Get sales broken down by month — answers "show monthly sales", "compare this month to last month", "sales by month this year"',
            parameters: {
                type: 'object',
                properties: {
                    year: { type: 'number', description: 'Year to show monthly breakdown for (default: current year)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_supplier_summary',
            description: 'Get contracts grouped by supplier with counts and total values — answers "which supplier do we buy from most?", "show supplier breakdown", "top suppliers"',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_record_by_number',
            description: 'Look up a specific invoice by number or contract by PO number — answers "show invoice #12", "find PO-2025-001"',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['invoice', 'contract'], description: 'Whether to search invoices or contracts' },
                    number: { type: 'string', description: 'Invoice number or PO/contract order number to find' }
                },
                required: ['type', 'number']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_cash_forecast',
            description: 'Project cash inflow and outflow for the next 30/60/90 days — answers "what is my cash forecast?", "expected inflow next month", "will I have enough cash in 60 days?"',
            parameters: {
                type: 'object',
                properties: {
                    horizon: { type: 'number', enum: [30, 60, 90], description: 'Forecast window in days (default 30)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_margin_alerts',
            description: 'List contract items whose total margin (profit) is at or below the configured threshold — answers "any margin alerts?", "which items are losing money?", "low/zero margin contracts"',
            parameters: {
                type: 'object',
                properties: {
                    threshold: { type: 'number', description: 'Override the saved total-margin threshold amount. If omitted, uses the saved Settings value (default 0).' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_recent_reminders',
            description: 'List payment reminders sent recently to clients — answers "which clients did I email?", "show recent reminders", "who got a reminder this week?"',
            parameters: {
                type: 'object',
                properties: {
                    days: { type: 'number', description: 'Look back this many days (default 7)' }
                }
            }
        }
    },
];

function executeTool(name, args, data) {
    const { contracts = [], invoices = [], expenses = [], stocks = [], margins = [], marginAlertThreshold } = data;
    const today = new Date();

    switch (name) {
        case 'get_overdue_invoices': {
            // Receivables come in TWO categories:
            //   DUE  — issued + unpaid + delivery/due date already in the past (urgent)
            //   BALANCE — issued + unpaid + due date in future OR not set (not yet due)
            // Together they sum to total outstanding receivables.
            const unpaidIssued = invoices.filter(inv =>
                inv.isFinal && !inv.canceled && inv.paymentStatus !== 'Paid' && (inv.balanceDue || 0) > 0.01
            );
            if (!unpaidIssued.length) {
                return 'No unpaid invoices — every issued invoice is fully paid.';
            }

            const due = []; // past due date
            const balance = []; // has balance but not yet due (future date or no date)
            unpaidIssued.forEach(inv => {
                const d = inv.dueDate ? new Date(inv.dueDate) : null;
                if (d && d < today) due.push(inv);
                else balance.push(inv);
            });

            // Totals per currency for each category
            const sumByCur = (arr) => {
                const m = {};
                arr.forEach(inv => {
                    const cur = inv.currency || 'USD';
                    m[cur] = (m[cur] || 0) + (inv.balanceDue || 0);
                });
                return Object.entries(m).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(' + ') || '—';
            };

            const daysBetween = (later, earlier) =>
                Math.max(0, Math.ceil((later.getTime() - earlier.getTime()) / 86400000));

            const formatDueLine = (inv) => {
                const d = new Date(inv.dueDate);
                const days = daysBetween(today, d);
                // Days overdue placed FIRST (right after invoice #) so the AI is less
                // likely to drop it when summarising a long list.
                return `• Invoice #${inv.invoice} · ${days}d overdue · ${inv.client} · ${inv.currency} ${inv.balanceDue.toFixed(2)} outstanding · Due ${inv.dueDate} · ${inv.paymentStatus}`;
            };
            const formatBalanceLine = (inv) =>
                `• Invoice #${inv.invoice} — ${inv.client} — ${inv.currency} ${inv.balanceDue.toFixed(2)} outstanding — ${inv.dueDate ? `Due: ${inv.dueDate}` : 'no due date set'} — ${inv.paymentStatus}`;

            const sections = [];

            // Section 1: Due invoices (past due date) — urgent, sorted by most-overdue first
            if (due.length) {
                const list = due
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 15)
                    .map(formatDueLine)
                    .join('\n');
                const more = due.length > 15 ? `\n…and ${due.length - 15} more.` : '';
                sections.push(`🔴 DUE INVOICES — ${due.length} item(s) past due date · Total: ${sumByCur(due)}\n${list}${more}`);
            }

            // Section 2: Balance invoices (final/issued with balance, not yet due)
            if (balance.length) {
                const list = balance
                    .slice(0, 15)
                    .map(formatBalanceLine)
                    .join('\n');
                const more = balance.length > 15 ? `\n…and ${balance.length - 15} more.` : '';
                sections.push(`🟡 BALANCE INVOICES — ${balance.length} final invoice(s) with outstanding balance · Total: ${sumByCur(balance)}\n${list}${more}`);
            }

            const grandTotal = sumByCur(unpaidIssued);
            const header = `Receivables breakdown — ${unpaidIssued.length} total invoice(s) outstanding · Grand total: ${grandTotal}`;
            return `${header}\n\n${sections.join('\n\n')}`;
        }

        case 'get_pending_invoices': {
            // Final invoices that are not fully paid and not canceled
            const pending = invoices.filter(inv => inv.isFinal && !inv.canceled && inv.paymentStatus !== 'Paid');
            if (!pending.length) return 'No pending invoices. All issued invoices are fully paid.';
            return `${pending.length} pending invoice(s):\n${pending.map(inv =>
                `• Invoice #${inv.invoice} — ${inv.client} — ${inv.currency} ${inv.balanceDue.toFixed(2)} remaining — ${inv.paymentStatus}`
            ).join('\n')}`;
        }

        case 'get_client_debt_ranking': {
            // Rank clients by their total outstanding balance (balanceDue) on final unpaid invoices
            const outstanding = invoices.filter(inv => inv.isFinal && !inv.canceled && inv.paymentStatus !== 'Paid' && inv.balanceDue > 0);
            if (!outstanding.length) return 'No outstanding balances. All clients are fully paid.';
            const debtMap = {};
            outstanding.forEach(inv => {
                const name = inv.client || 'Unknown';
                if (!debtMap[name]) debtMap[name] = {};
                const cur = inv.currency || 'USD';
                debtMap[name][cur] = (debtMap[name][cur] || 0) + inv.balanceDue;
            });
            const sorted = Object.entries(debtMap)
                .map(([client, amounts]) => ({ client, amounts }))
                .sort((a, b) => {
                    const aT = Object.values(a.amounts).reduce((s, v) => s + v, 0);
                    const bT = Object.values(b.amounts).reduce((s, v) => s + v, 0);
                    return bT - aT;
                });
            return `Clients by outstanding balance (highest first):\n${sorted.slice(0, 10).map((c, i) => {
                const amtStr = Object.entries(c.amounts)
                    .map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`).join(' + ');
                return `${i + 1}. ${c.client}: ${amtStr}`;
            }).join('\n')}`;
        }

        case 'get_revenue_summary': {
            // Sales = total invoiced on all final non-canceled invoices (metals trading rarely reaches full "Paid")
            const year = args?.year ? Number(args.year) : null;
            let salesInvoices = invoices.filter(inv => inv.isFinal && !inv.canceled);
            if (year) {
                salesInvoices = salesInvoices.filter(inv => {
                    if (!inv.date) return false;
                    return new Date(inv.date).getFullYear() === year;
                });
            }
            if (!salesInvoices.length) {
                const yearNote = year ? ` for ${year}` : '';
                return `No final invoices found${yearNote}. ${year ? `If ${year} is outside the current date range, please change the date filter in the app header.` : ''}`;
            }
            const salesMap = {};
            const collectedMap = {};
            salesInvoices.forEach(inv => {
                const cur = inv.currency || 'USD';
                salesMap[cur] = (salesMap[cur] || 0) + inv.totalAmount;
                collectedMap[cur] = (collectedMap[cur] || 0) + (inv.amountPaid || 0);
            });
            const yearLabel = year ? ` (${year})` : '';
            const lines = Object.entries(salesMap).map(([cur, total]) => {
                const collected = collectedMap[cur] || 0;
                const outstanding = total - collected;
                return `• ${cur}: ${total.toFixed(2)} invoiced — ${collected.toFixed(2)} collected — ${outstanding.toFixed(2)} outstanding`;
            }).join('\n');
            return `Sales summary${yearLabel} — ${salesInvoices.length} final invoice(s):\n${lines}`;
        }

        case 'get_contract_status_breakdown': {
            if (!contracts.length) return 'No contracts found.';
            const groups = {};
            contracts.forEach(con => {
                const s = con.status || 'Open';
                groups[s] = (groups[s] || 0) + 1;
            });
            const lines = Object.entries(groups)
                .sort((a, b) => b[1] - a[1])
                .map(([s, c]) => `• ${s}: ${c}`).join('\n');
            const openCount = groups['Open'] || 0;
            const note = openCount > 0
                ? `\nTip: ${openCount} contract(s) have no shipping status set. You can set Shipped / Not Shipped / Partly Shipped / Finished / Closed / Unsold from each contract's PnL tab.`
                : '';
            return `Contract status breakdown:\n${lines}\nTotal: ${contracts.length} contracts${note}`;
        }

        case 'get_recent_contracts': {
            const limit = args?.limit || 10;
            const list = contracts.slice(0, limit);
            if (!list.length) return 'No contracts found.';
            return `Recent ${list.length} contract(s):\n${list.map(con =>
                `• PO ${con.order} — ${con.supplier} — ${con.date} — ${con.status}`
            ).join('\n')}`;
        }

        case 'get_expense_summary': {
            if (!expenses.length) return 'No expenses found.';
            const byCur = {};
            expenses.forEach(exp => {
                const cur = exp.currency || 'USD';
                byCur[cur] = (byCur[cur] || 0) + (parseFloat(exp.amount) || 0);
            });
            const lines = Object.entries(byCur).map(([cur, amt]) => `• ${cur}: ${amt.toFixed(2)}`).join('\n');
            return `Expense totals (${expenses.length} records):\n${lines}`;
        }

        case 'get_unpaid_expenses': {
            // Defensive filter — handles three input shapes:
            //   1. New client (preferred): exp.isPaid boolean set from exp.paid === '111'
            //   2. Legacy client: only the resolved `paid` label string
            //   3. Anything else: explicit equality with the '111' id
            // An expense is UNPAID if none of the "paid" signals are true.
            const isExpensePaid = (exp) => {
                if (typeof exp.isPaid === 'boolean') return exp.isPaid;
                const label = String(exp.paid || '').trim().toLowerCase();
                if (label === 'paid') return true;
                return exp.paid === '111';
            };
            const unpaid = expenses.filter(exp => !isExpensePaid(exp));

            if (!unpaid.length) {
                // Diagnostic so the user knows WHY nothing was found — most common
                // causes are date-range filter and Payment Status not being set.
                return `No unpaid expenses found in the currently loaded date range — ${expenses.length} expense(s) checked, all marked as Paid.\n\nIf you expect unpaid expenses, check: (1) the date range filter in the app header covers their period, (2) their Payment status in the Expenses page isn't set to "Paid".`;
            }
            const total = {};
            unpaid.forEach(exp => {
                const cur = exp.currency || 'USD';
                total[cur] = (total[cur] || 0) + (exp.amount || 0);
            });
            const totalStr = Object.entries(total).map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`).join(' + ');
            // Sort oldest first so the most overdue payables surface at the top
            const sorted = [...unpaid].sort((a, b) => {
                const da = a.date ? new Date(a.date).getTime() : 0;
                const db = b.date ? new Date(b.date).getTime() : 0;
                return da - db;
            });
            // Break down by kind (Supplier vs Company overhead) so the user sees
            // where the obligation lives — both feed into the Cashflow page.
            const kindCounts = unpaid.reduce((acc, exp) => {
                const k = exp.kind || 'Supplier';
                acc[k] = (acc[k] || 0) + 1;
                return acc;
            }, {});
            const kindStr = Object.entries(kindCounts).map(([k, n]) => `${n} ${k}`).join(' + ');
            return `${unpaid.length} unpaid expense(s) of ${expenses.length} total (${kindStr}) — Total owed: ${totalStr}\n${sorted.slice(0, 25).map(exp =>
                `• [${exp.kind || 'Supplier'}] ${exp.vendor} — ${exp.currency} ${(exp.amount || 0).toFixed(2)} — ${exp.type} — ${exp.paid || 'no status'} — ${exp.date || 'no date'}`
            ).join('\n')}${sorted.length > 25 ? `\n…and ${sorted.length - 25} more.` : ''}`;
        }

        case 'get_profit_info': {
            if (margins.length > 0) {
                const totalMargin = margins.reduce((sum, m) => sum + (parseFloat(m.totalMargin) || 0), 0);
                const monthsWithData = margins.filter(m => parseFloat(m.totalMargin) > 0).length;
                return `Profit/Margin summary (current year):\n• Total margin: ${totalMargin.toFixed(2)}\n• Months with data: ${monthsWithData} of ${margins.length}\nFor full details visit the Margins page (/margins).`;
            }
            return 'No margin data found for this year. Visit the Margins page (/margins) to record and view profit analysis.';
        }

        case 'get_stock_summary': {
            if (!stocks.length) return 'No stock data available.';
            const stockGroups = {};
            stocks.forEach(s => {
                const desc = s.description || 'Unknown';
                if (!stockGroups[desc]) stockGroups[desc] = { qty: 0, unit: s.unit || '' };
                stockGroups[desc].qty += parseFloat(s.qnty) || 0;
            });
            const lines = Object.entries(stockGroups)
                .sort((a, b) => b[1].qty - a[1].qty)
                .slice(0, 10)
                .map(([desc, d]) => `• ${desc}: ${d.qty.toFixed(2)} ${d.unit}`)
                .join('\n');
            return `Stock summary (${stocks.length} records):\n${lines}`;
        }

        case 'get_shipment_status': {
            // Try invoices with ETD/ETA first (most detailed)
            const withEtd = invoices.filter(inv => inv.etd || inv.eta);
            if (withEtd.length > 0) {
                const sorted = [...withEtd].sort((a, b) => {
                    const da = a.etd ? new Date(a.etd) : new Date(9999, 0);
                    const db = b.etd ? new Date(b.etd) : new Date(9999, 0);
                    return da - db;
                });
                return `${sorted.length} shipment(s) tracked:\n${sorted.slice(0, 15).map(inv =>
                    `• Invoice #${inv.invoice} — ${inv.client} — ETD: ${inv.etd || 'N/A'} — ETA: ${inv.eta || 'N/A'} — ${inv.currency} ${inv.totalAmount.toFixed(2)} — ${inv.paymentStatus}`
                ).join('\n')}`;
            }
            // Fall back to contract-level shipment fields
            const conShipments = contracts.filter(c => c.shipmentEtd || c.shipmentEta || c.shipmentStatus);
            if (!conShipments.length) return 'No shipment data found. Add ETD/ETA from the Shipment page or invoice details.';
            return `${conShipments.length} contract(s) with shipment info:\n${conShipments.slice(0, 15).map(c =>
                `• PO ${c.order} — ${c.supplier} — ETD: ${c.shipmentEtd || 'N/A'} — ETA: ${c.shipmentEta || 'N/A'} — ${c.shipmentStatus || 'No status'}`
            ).join('\n')}`;
        }

        case 'get_monthly_sales': {
            const targetYear = args?.year ? Number(args.year) : today.getFullYear();
            const yearInvoices = invoices.filter(inv =>
                inv.isFinal && !inv.canceled && inv.date &&
                new Date(inv.date).getFullYear() === targetYear
            );
            if (!yearInvoices.length) return `No final invoices found for ${targetYear}. If ${targetYear} is outside the loaded date range, change the date filter in the app header.`;
            const months = {};
            yearInvoices.forEach(inv => {
                const month = String(inv.date).substring(0, 7); // YYYY-MM
                const cur = inv.currency || 'USD';
                if (!months[month]) months[month] = {};
                months[month][cur] = (months[month][cur] || 0) + inv.totalAmount;
            });
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const lines = Object.entries(months)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ym, byCur]) => {
                    const [, mm] = ym.split('-');
                    const label = monthNames[parseInt(mm, 10) - 1] || ym;
                    const amts = Object.entries(byCur).map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`).join(', ');
                    return `• ${label}: ${amts}`;
                }).join('\n');
            return `Monthly sales for ${targetYear} (${yearInvoices.length} invoices):\n${lines}`;
        }

        case 'get_supplier_summary': {
            if (!contracts.length) return 'No contracts found.';
            const bySupplier = {};
            contracts.forEach(c => {
                const sup = c.supplier || 'Unknown';
                if (!bySupplier[sup]) bySupplier[sup] = { count: 0, byCur: {} };
                bySupplier[sup].count++;
                if (c.totalValue > 0) {
                    const cur = c.currency || 'USD';
                    bySupplier[sup].byCur[cur] = (bySupplier[sup].byCur[cur] || 0) + c.totalValue;
                }
            });
            const sorted = Object.entries(bySupplier).sort((a, b) => b[1].count - a[1].count);
            return `Suppliers by contract count (${contracts.length} total):\n${sorted.slice(0, 10).map(([sup, d]) => {
                const valStr = Object.keys(d.byCur).length
                    ? ' — ' + Object.entries(d.byCur).map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`).join(' + ')
                    : '';
                return `• ${sup}: ${d.count} contract(s)${valStr}`;
            }).join('\n')}`;
        }

        case 'get_client_invoices': {
            const search = (args?.client_name || '').toLowerCase().trim();
            if (!search) return 'Please provide a client name to search for.';

            // Search BOTH the nickname (inv.client) and the full company name
            // (inv.clientFull). Also tokenize so "prime metals" still finds a
            // client whose name is "Metals Prime Co." or whose nickname is just
            // "Prime". Match if the candidate contains the whole search string
            // OR contains every token.
            const tokens = search.split(/\s+/).filter(Boolean);
            const matches = (candidate) => {
                const c = String(candidate || '').toLowerCase();
                if (!c) return false;
                if (c.includes(search)) return true;
                return tokens.length > 1 && tokens.every(t => c.includes(t));
            };

            const matched = invoices.filter(inv => {
                if (!inv.isFinal || inv.canceled) return false;
                return matches(inv.client) || matches(inv.clientFull);
            });

            if (!matched.length) {
                // Help the user: list a few nearby client names so they can spot a typo
                const allNames = new Set();
                invoices.forEach(inv => {
                    if (inv.client) allNames.add(inv.client);
                    if (inv.clientFull) allNames.add(inv.clientFull);
                });
                const looseHits = [...allNames].filter(n =>
                    tokens.some(t => String(n).toLowerCase().includes(t))
                ).slice(0, 5);
                const suggest = looseHits.length
                    ? `\n\nClients with at least one matching word: ${looseHits.join(', ')}.`
                    : '';
                return `No invoices found for client matching "${args.client_name}".${suggest}\nTip: try the nickname as shown in Settings → Clients.`;
            }

            const totalByCur = {};
            const outstandingByCur = {};
            const unpaidByCur = {};
            const today2 = new Date();
            matched.forEach(inv => {
                const cur = inv.currency || 'USD';
                totalByCur[cur] = (totalByCur[cur] || 0) + (inv.totalAmount || 0);
                outstandingByCur[cur] = (outstandingByCur[cur] || 0) + (inv.balanceDue || 0);
                if ((inv.balanceDue || 0) > 0.01) {
                    unpaidByCur[cur] = (unpaidByCur[cur] || 0) + (inv.balanceDue || 0);
                }
            });
            const summaryStr = Object.entries(totalByCur)
                .map(([cur, t]) => `${cur} ${t.toFixed(2)} invoiced · ${(outstandingByCur[cur] || 0).toFixed(2)} outstanding`).join(' | ');

            // Sort by most-overdue first so the urgent items surface at the top
            const sorted = [...matched].sort((a, b) => {
                const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return ad - bd;
            });
            const lines = sorted.slice(0, 25).map(inv => {
                let overdueTag = '';
                if (inv.dueDate) {
                    const dueT = new Date(inv.dueDate);
                    if (dueT < today2 && (inv.balanceDue || 0) > 0.01) {
                        const days = Math.max(0, Math.ceil((today2.getTime() - dueT.getTime()) / 86400000));
                        overdueTag = ` · ${days}d overdue`;
                    }
                }
                return `• Invoice #${inv.invoice}${overdueTag} · ${inv.currency} ${(inv.totalAmount || 0).toFixed(2)} total · ${(inv.balanceDue || 0).toFixed(2)} outstanding · ${inv.paymentStatus}${inv.dueDate ? ' · Due ' + inv.dueDate : ''}`;
            }).join('\n');
            const more = sorted.length > 25 ? `\n…and ${sorted.length - 25} more.` : '';
            const displayName = matched[0]?.clientFull || matched[0]?.client || args.client_name;
            return `${matched.length} invoice(s) for "${displayName}":\nSummary: ${summaryStr}\n${lines}${more}`;
        }

        case 'get_record_by_number': {
            const num = String(args?.number || '').trim().toLowerCase();
            if (!num) return 'Please provide a number to search for.';
            if (args?.type === 'contract') {
                const found = contracts.filter(c =>
                    String(c.order || '').toLowerCase().includes(num)
                );
                if (!found.length) return `No contract found with PO number containing "${args.number}".`;
                return `${found.length} contract(s) matching "${args.number}":\n${found.slice(0, 5).map(c =>
                    `• PO ${c.order} — ${c.supplier} — ${c.date} — Status: ${c.status} — ${c.currency}`
                ).join('\n')}`;
            } else {
                const found = invoices.filter(inv =>
                    String(inv.invoice || '').toLowerCase().includes(num)
                );
                if (!found.length) return `No invoice found with number containing "${args.number}".`;
                return `${found.length} invoice(s) matching "${args.number}":\n${found.slice(0, 5).map(inv =>
                    `• Invoice #${inv.invoice} — ${inv.client} — ${inv.currency} ${inv.totalAmount.toFixed(2)} — ${inv.paymentStatus}${inv.dueDate ? ' — Due: ' + inv.dueDate : ''} — ${inv.invoiceStatus}`
                ).join('\n')}`;
            }
        }

        case 'get_cash_forecast': {
            const horizon = [30, 60, 90].includes(args?.horizon) ? args.horizon : 30;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() + horizon);
            cutoff.setHours(23, 59, 59, 999);
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Track projected (in-window) AND overdue separately, then combine for the net.
            // Overdue cash is just as real (more urgent) than future cash — ignoring it
            // would let "net 0" hide a real obligation.
            const inflow = {}, outflow = {};
            const overdueIn = {}, overdueOut = {};
            let inflowCount = 0, outflowCount = 0, overdueInCount = 0, overdueOutCount = 0;

            invoices.forEach(inv => {
                if (!inv.isFinal || inv.canceled || inv.paymentStatus === 'Paid') return;
                if (!inv.dueDate) return;
                const due = new Date(inv.dueDate);
                const cur = inv.currency || 'USD';
                const amt = inv.balanceDue || 0;
                if (due < now) {
                    overdueIn[cur] = (overdueIn[cur] || 0) + amt;
                    overdueInCount++;
                } else if (due <= cutoff) {
                    inflow[cur] = (inflow[cur] || 0) + amt;
                    inflowCount++;
                }
            });
            expenses.forEach(exp => {
                // BUG-FIX: /paid/i matches BOTH "Paid" and "Unpaid" (substring match),
                // which silently dropped every unpaid expense. Use exact match.
                // Use raw isPaid boolean (exp.paid === '111') — labels are unreliable
                if (!exp.amount || exp.isPaid) return;
                if (!exp.date) return;
                const d = new Date(exp.date);
                const cur = exp.currency || 'USD';
                const amt = parseFloat(exp.amount) || 0;
                if (d < now) {
                    overdueOut[cur] = (overdueOut[cur] || 0) + amt;
                    overdueOutCount++;
                } else if (d <= cutoff) {
                    outflow[cur] = (outflow[cur] || 0) + amt;
                    outflowCount++;
                }
            });

            const allCurs = new Set([
                ...Object.keys(inflow), ...Object.keys(outflow),
                ...Object.keys(overdueIn), ...Object.keys(overdueOut),
            ]);
            if (!allCurs.size) return `Cash forecast for the next ${horizon} days: nothing projected and no overdue items.`;

            const lines = [...allCurs].map(cur => {
                const i = inflow[cur] || 0, o = outflow[cur] || 0;
                const oi = overdueIn[cur] || 0, oo = overdueOut[cur] || 0;
                const net = i + oi - o - oo;
                const netLabel = net >= 0 ? `+${net.toFixed(2)}` : net.toFixed(2);
                const overdueStr = (oi > 0 || oo > 0)
                    ? ` (incl. overdue receivable ${oi.toFixed(2)}, overdue payable ${oo.toFixed(2)})`
                    : '';
                return `• ${cur}: Projected inflow ${i.toFixed(2)} − outflow ${o.toFixed(2)} → Net ${netLabel}${overdueStr}`;
            }).join('\n');

            const overdueSummary = (overdueInCount + overdueOutCount > 0)
                ? `\n${overdueInCount} overdue receivable(s) + ${overdueOutCount} overdue payable(s) are included in the net.`
                : '';
            return `${horizon}-day cash forecast — net includes both projected (${inflowCount} inv, ${outflowCount} exp in window) and overdue items:\n${lines}${overdueSummary}\nFor full breakdown with AI risk analysis, open the Cashflow page.`;
        }

        case 'get_margin_alerts': {
            // `purchase` = Qty (MT), `margin` = per-unit profit, `totalMargin` = total profit.
            // No cost basis exists so there's no % — flag items whose total margin (profit)
            // is at or below the threshold amount (default 0 = zero/negative profit).
            const threshold = typeof args?.threshold === 'number' ? args.threshold
                : (typeof marginAlertThreshold === 'number' ? marginAlertThreshold : 0);

            const alerted = [];
            let incomplete = 0;
            margins.forEach(monthRow => {
                (monthRow.items || []).forEach(item => {
                    const qty = parseFloat(item.purchase) || 0;
                    const perUnitMargin = parseFloat(item.margin) || 0;
                    const totalMargin = parseFloat(item.totalMargin) || 0;
                    const hasContent = (item.description && String(item.description).trim())
                        || qty > 0 || perUnitMargin !== 0 || totalMargin !== 0;
                    if (!hasContent) return;
                    const marginEntered = perUnitMargin !== 0 || totalMargin !== 0;
                    if (!marginEntered) { incomplete++; return; } // data gap, not a risk
                    if (totalMargin <= threshold) {
                        alerted.push({
                            description: item.description || 'Unnamed item',
                            supplier: item.supplier || '',
                            client: item.client || '',
                            qty,
                            perUnitMargin,
                            totalMargin,
                            month: monthRow.month,
                        });
                    }
                });
            });

            const incompleteNote = incomplete > 0
                ? `\n\n(${incomplete} item(s) have no margin entered yet — data gaps, not counted as alerts.)`
                : '';

            if (!alerted.length) return `No margin alerts — every contract with a margin entered is above ${threshold} total profit.${incompleteNote}`;
            alerted.sort((a, b) => a.totalMargin - b.totalMargin);
            const lines = alerted.slice(0, 15).map(a =>
                `• ${a.description} — total margin ${a.totalMargin.toFixed(2)} (qty ${a.qty} MT, per-unit ${a.perUnitMargin.toFixed(2)})${a.totalMargin < 0 ? ' ⚠ LOSS' : ''}${a.supplier ? ` — supplier: ${a.supplier}` : ''}${a.client ? ` — client: ${a.client}` : ''} — month ${a.month}`
            ).join('\n');
            const more = alerted.length > 15 ? `\n…and ${alerted.length - 15} more.` : '';
            return `${alerted.length} item(s) with total margin ≤ ${threshold} (losses / thin deals):\n${lines}${more}${incompleteNote}\nFor AI explanations, open the Margins page and click "Explain with AI".`;
        }

        case 'get_recent_reminders': {
            const days = typeof args?.days === 'number' ? args.days : 7;
            const since = Date.now() - days * 86400000;

            const reminders = [];
            invoices.forEach(inv => {
                (inv.reminders || []).forEach(r => {
                    if (!r.sentAt) return;
                    const ts = new Date(r.sentAt).getTime();
                    if (ts >= since) {
                        reminders.push({
                            invoice: inv.invoice,
                            client: inv.client,
                            balanceDue: inv.balanceDue,
                            currency: inv.currency,
                            to: r.to,
                            sentAt: r.sentAt,
                            preview: r.preview || '',
                        });
                    }
                });
            });

            if (!reminders.length) return `No payment reminders sent in the last ${days} day(s).`;
            reminders.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
            const lines = reminders.slice(0, 15).map(r => {
                const when = new Date(r.sentAt).toLocaleString();
                return `• Invoice #${r.invoice} — ${r.client} — ${r.currency} ${(r.balanceDue || 0).toFixed(2)} outstanding — sent to ${r.to} at ${when}`;
            }).join('\n');
            const more = reminders.length > 15 ? `\n…and ${reminders.length - 15} more.` : '';
            return `${reminders.length} payment reminder(s) sent in the last ${days} day(s):\n${lines}${more}`;
        }

        default:
            return 'Tool not found.';
    }
}

const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
};

function sseText(text) {
    return `data: ${JSON.stringify({ text })}\n\n`;
}

function sseDone() {
    return 'data: [DONE]\n\n';
}

export async function POST(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return sseErrorResponse(guard.error, guard.status);

    const encoder = new TextEncoder();

    try {
        const { messages, currentData, currentPage, dateRange } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 });
        }

        const today = new Date().toISOString().split('T')[0];
        const pageNote = currentPage ? `\nUser is currently viewing: ${currentPage}` : '';
        const dateRangeNote = dateRange?.startDate && dateRange?.endDate
            ? `\nLoaded data covers: ${dateRange.startDate} to ${dateRange.endDate}. If the user asks about a time period outside this range (e.g. "last year" when only this year is loaded), tell them the data isn't in the current view and ask them to change the date range filter in the app header.`
            : '';

        const systemContext = SYSTEM_PROMPT + `\n\n## SESSION CONTEXT\nToday: ${today}${pageNote}${dateRangeNote}\nData loaded: ${currentData?.contracts?.length || 0} contracts, ${currentData?.invoices?.length || 0} invoices, ${currentData?.expenses?.length || 0} expenses, ${currentData?.stocks?.length || 0} stock records, ${currentData?.margins?.length || 0} margin months`;

        const apiMessages = [
            { role: 'system', content: systemContext },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        // Phase 1: tool detection. gpt-4o picks the right tool more reliably
        // for fuzzy questions like "which client owes the most" and avoids the
        // wrong-tool errors mini made (e.g. answering "no unpaid" when the data
        // had unpaid records under a different field shape).
        const toolResponse = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            messages: apiMessages,
            tools: TOOLS,
            tool_choice: 'auto',
            temperature: 0.2,
        });

        guard.recordUsage(toolResponse.usage?.total_tokens);
        const toolMessage = toolResponse.choices[0].message;

        // Phase 2a: tool was called — execute and stream final answer
        if (toolMessage.tool_calls?.length > 0) {
            const toolResults = toolMessage.tool_calls.map(tc => ({
                tool_call_id: tc.id,
                role: 'tool',
                content: executeTool(
                    tc.function.name,
                    JSON.parse(tc.function.arguments || '{}'),
                    currentData || {}
                )
            }));

            const finalStream = await getOpenAI().chat.completions.create({
                model: 'gpt-4o',
                messages: [...apiMessages, toolMessage, ...toolResults],
                temperature: 0.4,
                max_tokens: 800,
                stream: true,
                stream_options: { include_usage: true },
            });

            const readable = new ReadableStream({
                async start(controller) {
                    for await (const chunk of finalStream) {
                        const text = chunk.choices[0]?.delta?.content || '';
                        if (text) controller.enqueue(encoder.encode(sseText(text)));
                        if (chunk.usage?.total_tokens) guard.recordUsage(chunk.usage.total_tokens);
                    }
                    controller.enqueue(encoder.encode(sseDone()));
                    controller.close();
                }
            });

            return new Response(readable, { headers: SSE_HEADERS });
        }

        // Phase 2b: no tool needed — answer already in toolMessage.content, send as single SSE chunk
        const directText = toolMessage.content || 'I could not generate a response. Please try again.';
        const readable = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(sseText(directText)));
                controller.enqueue(encoder.encode(sseDone()));
                controller.close();
            }
        });

        return new Response(readable, { headers: SSE_HEADERS });

    } catch (error) {
        console.error('Assistant API Error:', error);
        const errMsg = error.code === 'invalid_api_key'
            ? 'Invalid OpenAI API key. Please check your configuration.'
            : 'Failed to process your request. Please try again.';

        const encoder2 = new TextEncoder();
        const errStream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder2.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
                controller.enqueue(encoder2.encode('data: [DONE]\n\n'));
                controller.close();
            }
        });
        return new Response(errStream, { headers: SSE_HEADERS });
    }
}
