export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

let openai;
function getOpenAI() {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

// System prompt that gives the AI context about the IMS system
const SYSTEM_PROMPT = `You are an intelligent assistant for IMS (Inventory Management System) - a metals trading and inventory management platform. You help users navigate the system, answer questions, look up data, and guide them through workflows.

## SYSTEM OVERVIEW
This IMS system manages:
- **Contracts**: Purchase orders from suppliers with products, pricing, shipment details
- **Invoices**: Sales invoices to clients with products, payments, delivery info
- **Expenses**: Company and contract-related expenses
- **Stocks/Inventory**: Material tracking across warehouses
- **Settings**: Suppliers, clients, shipment types, origins, delivery terms, ports

## KEY FEATURES YOU CAN HELP WITH:

### 1. DATA LOOKUPS
When users ask about data, use the provided context to answer:
- Overdue invoices (where payment is pending past due date)
- Contract status and details
- Invoice amounts and payment status
- Expense summaries
- Stock availability

### 2. WORKFLOW GUIDANCE
Guide users step-by-step for:
- Creating a new contract: Go to Contracts → Click "Add Contract" → Fill supplier, date, products, pricing
- Creating an invoice: Go to Invoices → Click "Add Invoice" → Select client, add products, set payment terms
- Adding expenses: Go to Expenses → Click "Add Expense" → Enter details, link to contract if applicable
- Managing settings: Go to Settings → Add/edit suppliers, clients, shipment types, etc.

### 3. NAVIGATION HELP
- Contracts page: /contracts - Manage purchase contracts
- Invoices page: /invoices - Manage sales invoices
- Expenses page: /expenses - Track expenses
- Dashboard: /dashboard - View analytics and charts
- Stocks: /stocks - Inventory management
- Settings: /settings - Configure system options
- Analysis: /analysis - Weight and quantity analysis
- Cash Flow: /cashflow - Financial flow tracking
- Account Statements: /accstatement - Generate statements

### 4. FAQ RESPONSES
Common questions:
- "How do I add a new customer?" → Go to Settings, find the Client/Consignee section, click Add, enter details
- "How do I link an invoice to a contract?" → When creating invoice, use the PO Supplier dropdown to select the contract
- "How do I export data?" → Use the Excel export button available on each data table
- "How do I filter by date?" → Use the date range picker at the top of each page

## RESPONSE GUIDELINES:
1. Be concise but helpful - keep responses short for chat widget
2. NEVER use markdown tables - they don't render well in chat
3. For data lists, use simple bullet points with "•" symbol
4. Format each item on its own line for readability
5. For workflow guidance, use numbered steps (1. 2. 3.)
6. Use **bold** sparingly for emphasis
7. Keep responses under 300 words when possible
8. If you don't have enough data context, explain what info you need
9. Always be professional and supportive

## DATA FORMATTING RULES:
When showing contracts, invoices, or expenses:
- Use bullet points, NOT tables
- Format: • PO# 123456 - Supplier Name - Date
- One item per line
- Add a summary line at the end (e.g., "Total: 5 contracts")

## INVOICE CREATION WORKFLOW (When user wants to create an invoice):
1. Ask for: Client name, Invoice date, Products (name, quantity, price), Currency
2. Confirm the details
3. Provide a summary and explain how to finalize in the system

## DATA CONTEXT:
You will receive current data context with each message including contracts, invoices, and expenses. Use this to answer data-related queries accurately.
`;

// Function to process data queries
function processDataQuery(query, data) {
    const lowerQuery = query.toLowerCase();
    const { contracts, invoices, expenses } = data;

    // Overdue invoices check
    if (lowerQuery.includes('overdue') && lowerQuery.includes('invoice')) {
        const today = new Date();
        const overdueInvoices = invoices?.filter(inv => {
            if (inv.invoiceStatus === 'Paid' || inv.canceled) return false;
            const dueDate = inv.delDate?.endDate ? new Date(inv.delDate.endDate) : null;
            return dueDate && dueDate < today;
        }) || [];

        if (overdueInvoices.length > 0) {
            return {
                type: 'overdue_invoices',
                data: overdueInvoices.map(inv => ({
                    invoice: inv.invoice,
                    client: inv.client,
                    amount: inv.totalAmount,
                    currency: inv.cur,
                    dueDate: inv.delDate?.endDate,
                    status: inv.invoiceStatus
                }))
            };
        }
        return { type: 'overdue_invoices', data: [] };
    }

    // Pending invoices
    if (lowerQuery.includes('pending') && lowerQuery.includes('invoice')) {
        const pendingInvoices = invoices?.filter(inv =>
            inv.invoiceStatus !== 'Paid' && !inv.canceled
        ) || [];

        return {
            type: 'pending_invoices',
            data: pendingInvoices.map(inv => ({
                invoice: inv.invoice,
                client: inv.client,
                amount: inv.totalAmount,
                currency: inv.cur,
                status: inv.invoiceStatus
            }))
        };
    }

    // Contract lookup
    if (lowerQuery.includes('contract') && (lowerQuery.includes('show') || lowerQuery.includes('list') || lowerQuery.includes('find'))) {
        return {
            type: 'contracts_list',
            data: contracts?.slice(0, 10).map(con => ({
                order: con.order,
                supplier: con.supplier,
                date: con.date,
                status: con.conStatus,
                currency: con.cur
            })) || []
        };
    }

    // Expense summary
    if (lowerQuery.includes('expense') && (lowerQuery.includes('total') || lowerQuery.includes('summary'))) {
        const totalExpenses = expenses?.reduce((sum, exp) => {
            return sum + (parseFloat(exp.amount) || 0);
        }, 0) || 0;

        return {
            type: 'expense_summary',
            data: {
                total: totalExpenses,
                count: expenses?.length || 0
            }
        };
    }

    // Invoice for specific client
    const clientMatch = lowerQuery.match(/invoice.*for\s+(.+)|(.+)\s+invoice/);
    if (clientMatch && lowerQuery.includes('create')) {
        const clientName = clientMatch[1] || clientMatch[2];
        return {
            type: 'create_invoice_intent',
            data: { clientName: clientName?.trim() }
        };
    }

    return null;
}

// Format data response for the AI
function formatDataForAI(queryResult) {
    if (!queryResult) return '';

    switch (queryResult.type) {
        case 'overdue_invoices':
            if (queryResult.data.length === 0) {
                return '\n[DATA RESULT]: No overdue invoices found. All invoices are current.';
            }
            return `\n[DATA RESULT - OVERDUE INVOICES]:
${queryResult.data.map(inv =>
    `• Invoice #${inv.invoice} - Client: ${inv.client} - Amount: ${inv.currency} ${inv.amount} - Due: ${inv.dueDate} - Status: ${inv.status}`
).join('\n')}
Total overdue: ${queryResult.data.length} invoice(s)`;

        case 'pending_invoices':
            if (queryResult.data.length === 0) {
                return '\n[DATA RESULT]: No pending invoices found.';
            }
            return `\n[DATA RESULT - PENDING INVOICES]:
${queryResult.data.map(inv =>
    `• Invoice #${inv.invoice} - Client: ${inv.client} - Amount: ${inv.currency} ${inv.amount} - Status: ${inv.status}`
).join('\n')}
Total pending: ${queryResult.data.length} invoice(s)`;

        case 'contracts_list':
            if (queryResult.data.length === 0) {
                return '\n[DATA RESULT]: No contracts found.';
            }
            return `\n[DATA RESULT - CONTRACTS]:
${queryResult.data.map(con =>
    `• Order: ${con.order} - Supplier: ${con.supplier} - Date: ${con.date} - Status: ${con.status}`
).join('\n')}`;

        case 'expense_summary':
            return `\n[DATA RESULT - EXPENSE SUMMARY]:
• Total Expenses: ${queryResult.data.total.toFixed(2)}
• Number of Expense Records: ${queryResult.data.count}`;

        case 'create_invoice_intent':
            return `\n[USER INTENT]: User wants to create an invoice for "${queryResult.data.clientName}". Guide them through the process.`;

        default:
            return '';
    }
}

export async function POST(request) {
    try {
        const { messages, uidCollection, currentData } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        // Get the last user message for data query processing
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        let dataContext = '';

        if (lastUserMessage && currentData) {
            const queryResult = processDataQuery(lastUserMessage.content, currentData);
            dataContext = formatDataForAI(queryResult);
        }

        // Build context about current data
        let systemContext = SYSTEM_PROMPT;
        if (currentData) {
            systemContext += `\n\n## CURRENT DATA SUMMARY:
- Total Contracts: ${currentData.contracts?.length || 0}
- Total Invoices: ${currentData.invoices?.length || 0}
- Total Expenses: ${currentData.expenses?.length || 0}
${dataContext}`;
        }

        // Call OpenAI API
        const completion = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemContext },
                ...messages.map(m => ({
                    role: m.role,
                    content: m.content
                }))
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const assistantMessage = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

        return NextResponse.json({
            message: assistantMessage,
            usage: completion.usage
        });

    } catch (error) {
        console.error('Assistant API Error:', error);

        if (error.code === 'invalid_api_key') {
            return NextResponse.json(
                { error: 'Invalid OpenAI API key. Please check your configuration.' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to process your request. Please try again.' },
            { status: 500 }
        );
    }
}
