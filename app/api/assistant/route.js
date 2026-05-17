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
- get_overdue_invoices — unpaid issued invoices; flags strictly overdue (past due date) and still lists unpaid ones if none are strictly overdue
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
6. Always use tools for data questions — never invent numbers`;

// OpenAI tool definitions
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_overdue_invoices',
            description: 'Unpaid issued invoices. Reports those strictly overdue (delivery/due date in the past) and, if none are strictly overdue, still lists what is unpaid. Answers "show overdue invoices", "what is unpaid?", "who hasn\'t paid?"',
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
            description: 'Get all invoices for a specific client by name — answers "show invoices for ABC Corp", "what does XYZ owe?"',
            parameters: {
                type: 'object',
                properties: {
                    client_name: { type: 'string', description: 'Client name to search for (partial match)' }
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
            // Issued (not draft) + not canceled + still owing money.
            const unpaidIssued = invoices.filter(inv =>
                inv.isFinal && !inv.canceled && inv.paymentStatus !== 'Paid' && (inv.balanceDue || 0) > 0.01
            );
            if (!unpaidIssued.length) {
                return 'No unpaid invoices — every issued invoice is fully paid.';
            }

            // Of those, the ones with a delivery/due date already in the past = strictly overdue.
            const overdue = unpaidIssued.filter(inv => {
                const due = inv.dueDate ? new Date(inv.dueDate) : null;
                return due && due < today;
            });
            const noDueDate = unpaidIssued.filter(inv => !inv.dueDate);

            if (overdue.length) {
                const overdueLines = overdue
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .map(inv => `• Invoice #${inv.invoice} — ${inv.client} — ${inv.currency} ${inv.balanceDue.toFixed(2)} outstanding — Due: ${inv.dueDate} — ${inv.paymentStatus}`)
                    .join('\n');
                const tail = noDueDate.length
                    ? `\n\nAlso ${noDueDate.length} unpaid invoice(s) have no delivery/due date set, so they can't be classed as overdue — review them on the Invoices or Cashflow page.`
                    : '';
                return `${overdue.length} overdue invoice(s) (past due date):\n${overdueLines}${tail}`;
            }

            // Nothing strictly overdue, but money is still owed — answer honestly.
            const sample = unpaidIssued
                .slice(0, 15)
                .map(inv => `• Invoice #${inv.invoice} — ${inv.client} — ${inv.currency} ${inv.balanceDue.toFixed(2)} outstanding — ${inv.dueDate ? `Due: ${inv.dueDate}` : 'no due date set'} — ${inv.paymentStatus}`)
                .join('\n');
            return `No invoices are strictly *overdue* (none have a delivery/due date in the past), but ${unpaidIssued.length} invoice(s) are still unpaid${noDueDate.length ? ` — ${noDueDate.length} of them have no due date set` : ''}:\n${sample}${unpaidIssued.length > 15 ? `\n…and ${unpaidIssued.length - 15} more.` : ''}`;
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
            // paid label comes resolved from settings.ExpPmnt — treat anything not 'Paid' as unpaid
            const unpaid = expenses.filter(exp => exp.paid?.toLowerCase() !== 'paid');
            if (!unpaid.length) return 'No unpaid expenses found. All expenses are paid.';
            const total = {};
            unpaid.forEach(exp => {
                const cur = exp.currency || 'USD';
                total[cur] = (total[cur] || 0) + (exp.amount || 0);
            });
            const totalStr = Object.entries(total).map(([cur, amt]) => `${cur} ${amt.toFixed(2)}`).join(' + ');
            return `${unpaid.length} unpaid expense(s) — Total: ${totalStr}\n${unpaid.map(exp =>
                `• ${exp.vendor} — ${exp.currency} ${exp.amount?.toFixed(2)} — ${exp.type} — ${exp.paid} — ${exp.date}`
            ).join('\n')}`;
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
            const matched = invoices.filter(inv =>
                inv.isFinal && !inv.canceled &&
                (inv.client || '').toLowerCase().includes(search)
            );
            if (!matched.length) return `No final invoices found for client matching "${args.client_name}".`;
            const totalByCur = {};
            const outstandingByCur = {};
            matched.forEach(inv => {
                const cur = inv.currency || 'USD';
                totalByCur[cur] = (totalByCur[cur] || 0) + inv.totalAmount;
                outstandingByCur[cur] = (outstandingByCur[cur] || 0) + inv.balanceDue;
            });
            const summaryStr = Object.entries(totalByCur)
                .map(([cur, t]) => `${cur} ${t.toFixed(2)} invoiced, ${(outstandingByCur[cur] || 0).toFixed(2)} outstanding`).join(' | ');
            const lines = matched.slice(0, 15).map(inv =>
                `• Invoice #${inv.invoice} — ${inv.currency} ${inv.totalAmount.toFixed(2)} — ${inv.paymentStatus}${inv.dueDate ? ' — Due: ' + inv.dueDate : ''}`
            ).join('\n');
            return `${matched.length} invoice(s) for "${matched[0]?.client}":\nSummary: ${summaryStr}\n${lines}`;
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

            const inflow = {};
            const outflow = {};
            let inflowCount = 0, outflowCount = 0;

            invoices.forEach(inv => {
                if (!inv.isFinal || inv.canceled || inv.paymentStatus === 'Paid') return;
                if (!inv.dueDate) return;
                const due = new Date(inv.dueDate);
                if (due < now || due > cutoff) return;
                const cur = inv.currency || 'USD';
                inflow[cur] = (inflow[cur] || 0) + (inv.balanceDue || 0);
                inflowCount++;
            });
            expenses.forEach(exp => {
                if (!exp.amount || /paid/i.test(exp.paid || '')) return;
                if (!exp.date) return;
                const d = new Date(exp.date);
                if (d < now || d > cutoff) return;
                const cur = exp.currency || 'USD';
                outflow[cur] = (outflow[cur] || 0) + (parseFloat(exp.amount) || 0);
                outflowCount++;
            });

            const allCurs = new Set([...Object.keys(inflow), ...Object.keys(outflow)]);
            if (!allCurs.size) return `Cash forecast for the next ${horizon} days: no invoices or expenses are due in this window.`;

            const lines = [...allCurs].map(cur => {
                const i = inflow[cur] || 0;
                const o = outflow[cur] || 0;
                const net = i - o;
                const netLabel = net >= 0 ? `+${net.toFixed(2)}` : net.toFixed(2);
                return `• ${cur}: Inflow ${i.toFixed(2)} — Outflow ${o.toFixed(2)} — Net ${netLabel}`;
            }).join('\n');
            return `${horizon}-day cash forecast (${inflowCount} invoice(s) inflow, ${outflowCount} expense(s) outflow):\n${lines}\nFor detailed assumptions and AI risk analysis, open the Cashflow page and click "AI Cash Forecast".`;
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

        // Phase 1: tool detection (non-streaming, fast)
        const toolResponse = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
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
                model: 'gpt-4o-mini',
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
