import React from 'react';
import Card from '../components/Card';

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <code className="bg-gray-100 dark:bg-gray-800 text-primary font-mono text-sm px-1 py-0.5 rounded">
        {children}
    </code>
);

const ProcessPage: React.FC = () => {
    return (
        <main className="flex-1 p-6 overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-app-text-primary">Process — Batch-wise FIFO by Expiry</h1>
            <p className="text-app-text-secondary mt-1">With manual override and no negative quantities allowed.</p>
            
            <Card className="mt-6 p-6">
                <div className="space-y-6 text-app-text-primary">
                    
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Goal</h2>
                        <p className="text-app-text-secondary">Auto-select batch(es) with the earliest expiry (FIFO by expiry) when creating a sales line, allow manual batch override, and never allow inventory to go negative.</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Preconditions / Required data</h2>
                        <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-app-text-secondary">
                            <li><Code>inventory_batch</Code> records per product with: <Code>batch_id</Code>, <Code>batch_no</Code>, <Code>expiry_date</Code>, <Code>strip_qty</Code>, <Code>tablet_qty</Code>, <Code>status</Code> (available / expired / quarantined), <Code>pack_size</Code> (or read from product).</li>
                            <li>Sales input: <Code>product_id</Code>, <Code>qty</Code>, <Code>unit</Code> (strip or tablet).</li>
                            <li>Config: <Code>near_expiry_days</Code> (e.g., 30) and <Code>allow_break_packs</Code> (true/false).</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Convert requested quantity to canonical units (tablets)</h2>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-x-auto"><Code>qty_in_tablets = (unit == 'strip') ? qty * pack_size : qty</Code></pre>
                        <p className="mt-2 text-sm text-app-text-secondary">If <Code>qty &lt;= 0</Code> → reject (no negative or zero sales).</p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Start transaction & lock candidate batches</h2>
                        <p className="mb-2 text-sm text-app-text-secondary">Begin DB transaction.</p>
                        <p className="mb-2 text-sm text-app-text-secondary">Query candidate batches:</p>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-x-auto font-mono text-app-text-secondary">
{`WHERE product_id = :product_id
  AND status = 'available'
  AND expiry_date >= CURRENT_DATE
ORDER BY expiry_date ASC, created_at ASC
FOR UPDATE`}
                        </pre>
                        <p className="mt-2 text-sm text-app-text-secondary">Locking prevents concurrent oversell.</p>
                    </div>
                    
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Auto-allocation (FIFO by expiry)</h2>
                         <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-app-text-secondary">
                            <li>Set <Code>remaining = qty_in_tablets</Code>.</li>
                            <li>Iterate candidate batches in order:
                                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                                    <li>Compute <Code>batch_total = strip_qty * pack_size + tablet_qty</Code>.</li>
                                    <li>If <Code>batch_total &lt;= 0</Code> → continue.</li>
                                    <li><Code>take = min(batch_total, remaining)</Code>.</li>
                                    <li>Record allocation {'{batch_id, take}'} and <Code>remaining -= take</Code>.</li>
                                    <li>Stop when <Code>remaining == 0</Code>.</li>
                                </ul>
                            </li>
                            <li>If <Code>remaining > 0</Code> after loop → rollback and return <span className="italic">Insufficient stock</span> (no negative inventory allowed).</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Break-pack handling (only if allowed and needed)</h2>
                        <p className="text-sm mb-2 text-app-text-secondary">When allocating tablets from a batch with insufficient <Code>tablet_qty</Code>:</p>
                        <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-app-text-secondary">
                            <li>If <Code>allow_break_packs</Code>:
                                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                                    <li><Code>needed = qty_needed_from_this_batch - tablet_qty</Code></li>
                                    <li><Code>strips_to_break = ceil(needed / pack_size)</Code></li>
                                    <li>If <Code>strip_qty >= strips_to_break</Code>: convert those strips to tablets in that batch then allocate.</li>
                                    <li>Else allocate what’s available and continue to next batch.</li>
                                </ul>
                            </li>
                            <li>If not allowed → skip breaking and continue allocation to next batch.</li>
                        </ul>
                    </div>
                    
                     <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Prepare and show allocation summary to cashier</h2>
                        <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-app-text-secondary">
                            <li>Present proposed allocations: {'{batch_no, expiry_date, qty_allocated}'}.</li>
                            <li>Highlight batches within <Code>near_expiry_days</Code>.</li>
                            <li>Show stock badge: Strip: X | Loose: Y | Total: Z tablets.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Manual override option (before final commit)</h2>
                        <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-app-text-secondary">
                             <li>Provide <span className="italic">Change batch</span> UI to let cashier select batch(es) and specify quantities to take from each.</li>
                             <li>On submit of manual allocation:
                                 <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                                    <li>Re-lock chosen batch rows <Code>FOR UPDATE</Code> inside same transaction.</li>
                                    <li>Validate each chosen allocation: <Code>allocated_qty &lt;= current_batch_total</Code> and not negative.</li>
                                    <li>If validation fails → return error and refresh proposed allocations.</li>
                                 </ul>
                             </li>
                        </ul>
                    </div>

                     <div>
                        <h2 className="text-lg font-semibold mb-2 text-app-text-primary">Apply allocations & update inventory (atomic)</h2>
                         <p className="text-sm mb-2 text-app-text-secondary">For each allocation:</p>
                        <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-app-text-secondary">
                             <li>Prefer to consume <Code>tablet_qty</Code> first, then break strips if allowed and needed.</li>
                             <li>Compute <Code>strips_to_remove</Code> and <Code>tablets_to_remove</Code> (both ≥ 0).</li>
                             <li>Ensure <Code>strip_qty - strips_to_remove >= 0</Code> and <Code>tablet_qty - tablets_to_remove >= 0</Code>. If any would go negative → abort and rollback.</li>
                             <li>Update <Code>inventory_batch</Code> row: decrement <Code>strip_qty</Code> and <Code>tablet_qty</Code>.</li>
                             <li>Insert <Code>sales_line_batch_allocation</Code> audit row with <Code>sales_line_id</Code>, <Code>batch_id</Code>, <Code>qty_in_tablets</Code>, <Code>allocated_by</Code>, and <Code>auto_allocated</Code> flag.</li>
                             <li>Insert <Code>sales_line</Code> snapshot (<Code>qty</Code>, <Code>unit</Code>, <Code>pack_size</Code>, <Code>qty_in_tablets</Code>, <Code>price</Code>, etc.).</li>
                        </ul>
                    </div>

                </div>
            </Card>
        </main>
    );
};

export default ProcessPage;
